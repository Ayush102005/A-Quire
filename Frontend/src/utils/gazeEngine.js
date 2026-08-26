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
    // Ratio = dist(outer, iris) / dist(outer, inner)  -- assuming 0 is outer, 1 is inner.
    let leftIrisX = safeDiv(lIris.x - lOuter.x, lInner.x - lOuter.x);
    let rightIrisX = safeDiv(rIris.x - rOuter.x, rInner.x - rOuter.x);

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
    // Yaw: diff in Z depth between outer corners
    const headYaw = clamp((lOuter.z - rOuter.z) * 10, -2, 2); 
    // Pitch: nose Y relative to eyes Y
    const avgEyeY = (lOuter.y + rOuter.y) / 2.0;
    const headPitch = clamp((avgEyeY - nose.y) * 10, -2, 2);

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
