import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
/**
 * gazeEngine.js
 * 
 * Responsible for parsing raw MediaPipe FaceLandmarks into a stable, 6-dimensional feature vector.
 * Features: [leftIrisX, leftIrisY, rightIrisX, rightIrisY, headYaw, headPitch]
 */

const CLAMP_MIN = -0.25;
const CLAMP_MAX = 1.25;

// MediaPipe FaceMesh Indices
const INDICES = {
  // Left eye (viewer's right in mirrored video)
  leftEyeInner: 133,
  leftEyeOuter: 33,
  leftEyeUpper: 159,
  leftEyeLower: 145,
  leftIris: 468,

  // Right eye (viewer's left in mirrored video)
  rightEyeInner: 362,
  rightEyeOuter: 263,
  rightEyeUpper: 386,
  rightEyeLower: 374,
  rightIris: 473,

  // Head pose reference
  noseTip: 1,
};

// State for blink handling
let lastValidLeftVertical = 0.5;
let lastValidRightVertical = 0.5;

function clamp(val, min = CLAMP_MIN, max = CLAMP_MAX) {
  if (Number.isNaN(val) || !Number.isFinite(val)) return 0.5;
  return Math.max(min, Math.min(max, val));
}

function safeDiv(num, den) {
  if (Math.abs(den) < 1e-6) return 0;
  return num / den;
}

function dist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

export function resetGazeEngineState() {
  lastValidLeftVertical = 0.5;
  lastValidRightVertical = 0.5;
}

/**
 * Extracts a 6D feature vector from landmarks.
 * Handles missing data, blinks, and NaN/Infinity safety.
 *
 * @param {Array} landmarks MediaPipe facial landmarks
 * @param {boolean} isMirrored If the camera is mirrored, invert horizontal components.
 * @returns {Array|null} [leftIrisX, leftIrisY, rightIrisX, rightIrisY, headYaw, headPitch]
 */
export function extractFeatures(landmarks, isMirrored = true) {
  if (!landmarks || landmarks.length === 0) return null;

  try {
    const lInner = landmarks[INDICES.leftEyeInner];
    const lOuter = landmarks[INDICES.leftEyeOuter];
    const lUpper = landmarks[INDICES.leftEyeUpper];
    const lLower = landmarks[INDICES.leftEyeLower];
    const lIris = landmarks[INDICES.leftIris];

    const rInner = landmarks[INDICES.rightEyeInner];
    const rOuter = landmarks[INDICES.rightEyeOuter];
    const rUpper = landmarks[INDICES.rightEyeUpper];
    const rLower = landmarks[INDICES.rightEyeLower];
    const rIris = landmarks[INDICES.rightIris];

    const nose = landmarks[INDICES.noseTip];

    if (!lInner || !lOuter || !lUpper || !lLower || !lIris ||
        !rInner || !rOuter || !rUpper || !rLower || !rIris || !nose) {
      console.warn(`extractFeatures missing points. landmarks length: ${landmarks.length}`);
      return null; // Missing required landmarks entirely
    }

    // Check if any specific coordinate used in calculation is NaN or Infinity
    const requiredPoints = [lInner, lOuter, lUpper, lLower, lIris, rInner, rOuter, rUpper, rLower, rIris, nose];
    for (const pt of requiredPoints) {
      if (Number.isNaN(pt.x) || !Number.isFinite(pt.x) ||
          Number.isNaN(pt.y) || !Number.isFinite(pt.y) ||
          Number.isNaN(pt.z) || !Number.isFinite(pt.z)) {
        return null;
      }
    }

    // --- Horizontal Ratios ---
    // Projection of iris onto the inner-outer axis
    // Ratio = dist(left_bound, iris) / dist(left_bound, right_bound)
    // For left eye (viewer's left), outer is left and inner is right.
    let leftIrisX = safeDiv(lIris.x - lOuter.x, lInner.x - lOuter.x);
    // For right eye (viewer's right), inner is left and outer is right.
    let rightIrisX = safeDiv(rIris.x - rInner.x, rOuter.x - rInner.x);

    // --- Vertical Ratios ---
    // Ratio = dist(upper, iris) / dist(upper, lower)
    const leftEyeHeight = lLower.y - lUpper.y;
    const rightEyeHeight = rLower.y - rUpper.y;

    let leftIrisY = 0.5;
    let rightIrisY = 0.5;

    // Check for blinks (eye height too small)
    if (leftEyeHeight > 0.005) {
      leftIrisY = safeDiv(lIris.y - lUpper.y, leftEyeHeight);
      lastValidLeftVertical = leftIrisY;
    } else {
      leftIrisY = lastValidLeftVertical; // reuse last valid
    }

    if (rightEyeHeight > 0.005) {
      rightIrisY = safeDiv(rIris.y - rUpper.y, rightEyeHeight);
      lastValidRightVertical = rightIrisY;
    } else {
      rightIrisY = lastValidRightVertical;
    }

    // --- Mirroring Normalization ---
    if (isMirrored) {
      // If mirrored, the visual left/right is flipped. 
      // X ratio 0 -> 1 becomes 1 -> 0
      leftIrisX = 1.0 - leftIrisX;
      rightIrisX = 1.0 - rightIrisX;
    }

    // Clamp values
    leftIrisX = clamp(leftIrisX);
    leftIrisY = clamp(leftIrisY);
    rightIrisX = clamp(rightIrisX);
    rightIrisY = clamp(rightIrisY);

    // --- Head Pose (Yaw and Pitch) ---
    // Simple heuristic: 
    // Normalize by inter-ocular distance (iod) to make it scale-invariant
    // so moving forward/backward doesn't break the features.
    const iod = dist(lOuter, rOuter);
    // Yaw: diff in Z depth between outer corners
    const headYaw = clamp(safeDiv(lOuter.z - rOuter.z, iod), -2, 2); 
    // Pitch: nose Y relative to eyes Y
    const avgEyeY = (lOuter.y + rOuter.y) / 2.0;
    const headPitch = clamp(safeDiv(avgEyeY - nose.y, iod), -2, 2);

    const vector = [
      leftIrisX,
      leftIrisY,
      rightIrisX,
      rightIrisY,
      headYaw,
      headPitch
    ];

    // Final safety check (should be redundant now, but kept for absolute safety)
    if (vector.some(v => Number.isNaN(v) || !Number.isFinite(v))) {
      return null;
    }

    return vector;
  } catch (e) {
    console.error("Error extracting features", e);
    return null;
  }
}


const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Caches the IN-FLIGHT init call (not the resolved instance — see below) so
// concurrent/near-simultaneous callers share one real initialization
// instead of each starting an independent one. This matters because
// useGazeTracker.js's own per-instance `faceLandmarkerRef` guard
// (`if (!faceLandmarkerRef.current) faceLandmarkerRef.current = await
// initFaceLandmarker()`) does NOT protect against this: React 18
// StrictMode intentionally double-invokes effects in dev (mount, cleanup,
// mount again), and the two invocations run before either's async work has
// settled — both see `faceLandmarkerRef.current` still null and each call
// this function, so without dedup here they each independently fetch the
// ~4MB+ WASM+model and construct a full FaceLandmarker (visible as two
// separate "Created TensorFlow Lite XNNPACK delegate" logs several seconds
// apart — the second call tears down/outraces the first's still-pending
// work via the caller's own session-id bookkeeping, but this function has
// no way to know that and completes its own independent init regardless).
//
// Deliberately NOT caching the *resolved instance* long-term: callers
// (see useGazeTracker.js's stopActiveTracker()) call `.close()` on the
// instance directly when tracking stops, and this module has no way to
// learn about that. Caching only the in-flight promise — cleared once it
// settles, success or failure — dedupes exactly the concurrent-call window
// that causes the double-init, while still allowing a genuinely fresh
// re-init later (after the previous instance was closed elsewhere).
let _initPromise = null;

// How many total attempts to make at the *whole* init sequence (WASM fetch
// + GPU/CPU delegate creation) before actually giving up and letting the
// caller fall back to legacy. A transient CDN hiccup on the WASM fetch —
// one slow/dropped connection — used to throw immediately and silently
// (see below), making the "new" tracker instantly fall back to legacy on a
// blip that a plain retry would have ridden out; legacyGazeTracker.js's own
// later, separate init attempt would then usually succeed by coincidence
// (the hiccup had passed / the resource was warm in cache by then), making
// it look like the new tracker was just broken. Retrying here, in the same
// place the failure actually happens, means a transient blip no longer
// costs the student the calibrated tracker for the whole session.
const INIT_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function initFaceLandmarker() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    let lastError = null;

    for (let attempt = 1; attempt <= INIT_ATTEMPTS; attempt++) {
      try {
        // Previously unguarded: if this specific call threw (e.g. a
        // transient network error fetching the WASM binary), the whole
        // function rejected immediately without ever reaching the
        // GPU/CPU delegate loop below — which is the only place this
        // function logs anything. That made a plain network blip look
        // like a silent, instant failure with zero diagnostic trace.
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

        // Try GPU first, then CPU
        for (const delegate of ['GPU', 'CPU']) {
          try {
            const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetPath: MODEL_PATH, delegate },
              outputFaceBlendshapes: false,
              runningMode: 'VIDEO',
              numFaces: 1,
            });
            console.log(`[gazeEngine] Initialized with ${delegate} delegate (attempt ${attempt}/${INIT_ATTEMPTS})`);
            return faceLandmarker;
          } catch (err) {
            console.warn(`[gazeEngine] ${delegate} delegate failed (attempt ${attempt}/${INIT_ATTEMPTS}):`, err.message);
            lastError = err;
          }
        }
      } catch (err) {
        console.warn(`[gazeEngine] WASM fileset load failed (attempt ${attempt}/${INIT_ATTEMPTS}):`, err.message);
        lastError = err;
      }

      if (attempt < INIT_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }

    throw new Error(
      `FaceLandmarker init failed after ${INIT_ATTEMPTS} attempts: ${lastError?.message || 'unknown error'}`
    );
  })();

  try {
    return await _initPromise;
  } finally {
    _initPromise = null; // resolved or rejected — no longer "in flight"
  }
}
