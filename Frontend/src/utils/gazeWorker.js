// Dynamic import, deliberately NOT a static top-level `import` statement —
// a classic (non-module) worker cannot contain top-level ESM import syntax
// at all (it's a parse error, not a runtime failure). `vite build` bundles
// a static import here into a self-contained IIFE (that's `worker.format:
// 'iife'`, Vite's build-only default) so it worked in production, but
// Vite's *dev server* serves worker scripts close to as-is rather than
// pre-bundling them the same way — a static import in a classic worker
// there surfaces as a generic, undiagnosable `worker.onerror` event
// (`gaze worker error: [object Event]`, no real message) instead of
// actually failing to parse cleanly. Dynamic import() has none of these
// constraints — it's valid in every script context, classic worker
// included, and behaves identically in dev and build. See
// gazeWorkerClient.js's own comment for why this needs to be a classic
// (not module-type) worker in the first place — that's what
// @mediapipe/tasks-vision's own WASM loader requires (importScripts).
let _mediapipePromise = null;
const loadMediapipe = () => {
  if (!_mediapipePromise) {
    _mediapipePromise = import('@mediapipe/tasks-vision');
  }
  return _mediapipePromise;
};

// Use CDN for WASM — local Vite ?url imports of WASM are unreliable inside
// Web Workers in Firefox dev mode.
//
// The "ModuleFactory not set" error this file used to (still can, if this
// worker is ever constructed with `{ type: 'module' }` again) produce was
// NOT actually about CDN vs. local WASM — that theory turned out to be
// incomplete. The real cause, confirmed by reading @mediapipe/tasks-vision's
// own bundle: its WASM loader calls `importScripts(url)` if available
// (classic-worker only — this is what actually sets the global
// ModuleFactory, as a side effect of the script running in worker scope),
// and falls back to `document.createElement('script')` otherwise. A
// *module*-type worker has neither API, so that loader is guaranteed to
// fail deterministically every time it's instantiated that way — see
// gazeWorkerClient.js's own comment on the `new Worker(...)` call for the
// actual fix (omit `{ type: 'module' }`).
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let faceLandmarker = null;

// initPromise resolves when the model is ready (or rejects on failure).
// DETECT handlers await this so they never run before INIT finishes.
let initPromise = null;

// Mirrors gazeEngine.js's initFaceLandmarker() (the main-thread init this
// worker replaced) — that function has its own INIT_ATTEMPTS/RETRY_DELAY_MS
// retry loop, added earlier for exactly this reason: a single transient CDN
// hiccup on the WASM fetch used to throw immediately with no retry at all,
// making a plain network blip look like the tracker was fundamentally
// broken and instantly falling back to legacy. This worker was built and
// tested independently (see gazeWorker.test.js) and never had that same
// retry logic ported over — first real init failure it hit went straight
// to "FaceLandmarker init failed on both GPU and CPU delegates" with no
// second attempt at all.
const INIT_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const doInit = async () => {
  const { FaceLandmarker, FilesetResolver } = await loadMediapipe();

  const makeOptions = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
    runningMode: 'VIDEO',
    numFaces: 1,
  });

  let lastError = null;

  for (let attempt = 1; attempt <= INIT_ATTEMPTS; attempt++) {
    try {
      // Fetched once per attempt (not once per delegate) — GPU and CPU
      // both try against the same resolved fileset.
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      // Try GPU first, then CPU
      for (const delegate of ['GPU', 'CPU']) {
        try {
          faceLandmarker = await FaceLandmarker.createFromOptions(vision, makeOptions(delegate));
          console.log(`[GazeWorker] Initialized with ${delegate} delegate (attempt ${attempt}/${INIT_ATTEMPTS})`);
          return; // success — exit entirely
        } catch (err) {
          console.warn(`[GazeWorker] ${delegate} delegate failed (attempt ${attempt}/${INIT_ATTEMPTS}):`, err.message);
          faceLandmarker = null;
          lastError = err;
        }
      }
    } catch (err) {
      console.warn(`[GazeWorker] WASM fileset load failed (attempt ${attempt}/${INIT_ATTEMPTS}):`, err.message);
      lastError = err;
    }

    if (attempt < INIT_ATTEMPTS) await sleep(RETRY_DELAY_MS);
  }

  throw new Error(
    `FaceLandmarker init failed on both GPU and CPU delegates after ${INIT_ATTEMPTS} attempts: ${lastError?.message || 'unknown error'}`
  );
};

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  // ── INIT ────────────────────────────────────────────────────────────────
  if (type === 'INIT') {
    if (initPromise) return; // already running or done

    initPromise = doInit();

    try {
      await initPromise;
      self.postMessage({ type: 'INIT_SUCCESS' });
    } catch (err) {
      console.error('[GazeWorker] Init failed:', err);
      self.postMessage({ type: 'INIT_ERROR', error: err.message });
      initPromise = null; // allow retry on next INIT message
    }
    return;
  }

  // ── DETECT ──────────────────────────────────────────────────────────────
  if (type === 'DETECT') {
    const { id, bitmap, timestamp, quality } = payload;
    let ok = false;
    let faceLandmarks = null;
    let error = null;

    try {
      // Wait for INIT to complete before attempting detection
      if (initPromise) {
        await initPromise;
      }

      if (!faceLandmarker) {
        throw new Error('FaceLandmarker not initialized');
      }

      // Enforce strictly increasing timestamps (required for VIDEO runningMode)
      let safeTimestamp = timestamp;
      if (self.lastTimestamp && safeTimestamp <= self.lastTimestamp) {
        safeTimestamp = self.lastTimestamp + 1;
      }
      self.lastTimestamp = safeTimestamp;

      const result = faceLandmarker.detectForVideo(bitmap, safeTimestamp);

      if (result?.faceLandmarks?.length > 0) {
        ok = true;
        faceLandmarks = result.faceLandmarks[0];
      }
    } catch (err) {
      ok = false;
      error = err.message;
      // Only log if it's not a routine "still initializing" error
      if (!err.message.includes('not initialized') && !err.message.includes('failed on both')) {
        console.error('[GazeWorker] Detection error:', err);
      }
    } finally {
      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
      self.postMessage({
        type: 'DETECT_RESULT',
        payload: {
          id,
          ok,
          faceLandmarks,
          quality,
          qualityScore: quality ? 1.0 : 0.0,
          timestamp,
          error,
        },
      });
    }
  }
};
