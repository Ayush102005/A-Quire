import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Use CDN for WASM — local Vite ?url imports of WASM are unreliable inside
// Web Workers in Firefox dev mode. The CDN path is stable and avoids
// the "ModuleFactory not set" error caused by incorrect WASM bootstrap order.
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let faceLandmarker = null;

// initPromise resolves when the model is ready (or rejects on failure).
// DETECT handlers await this so they never run before INIT finishes.
let initPromise = null;

const doInit = async () => {
  const makeOptions = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
    runningMode: 'VIDEO',
    numFaces: 1,
  });

  // Try GPU first, then CPU
  for (const delegate of ['GPU', 'CPU']) {
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, makeOptions(delegate));
      console.log(`[GazeWorker] Initialized with ${delegate} delegate`);
      return; // success — exit loop
    } catch (err) {
      console.warn(`[GazeWorker] ${delegate} delegate failed:`, err.message);
      faceLandmarker = null;
    }
  }
  throw new Error('FaceLandmarker init failed on both GPU and CPU delegates');
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
