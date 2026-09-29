import { extractFeatures } from './gazeEngine';

export const GAZE_FEATURE_ORDER = [
  "leftEyeX",
  "leftEyeY",
  "rightEyeX",
  "rightEyeY",
  "yaw",
  "pitch",
];

const BLINK_THRESHOLD_Y = 0.005; // Matches eyeHeight in gazeEngine.js
const MIN_CONFIDENCE = 0.6; // Basic threshold

const HORIZONTAL_LEFT_THRESHOLD = 0.6;
const HORIZONTAL_RIGHT_THRESHOLD = 0.4;

function getHorizontalRelativeValue(features) {
  // Average of left and right iris X. Features are 0 to 1.
  // We use the raw 0-1 scale directly.
  // In mirrored mode, higher value means screen-left, lower means screen-right.
  return (features[0] + features[2]) / 2;
}

function getVerticalRelativeValue(features) {
  // Average of left and right iris Y. Features are 0 to 1.
  return (features[1] + features[3]) / 2;
}

function getCategoricalDirection(h, v) {
  let horizontal = "center";
  if (h > HORIZONTAL_LEFT_THRESHOLD) horizontal = "left";
  else if (h < HORIZONTAL_RIGHT_THRESHOLD) horizontal = "right";

  let vertical = "center";
  if (v < 0.4) vertical = "top";
  else if (v > 0.6) vertical = "bottom";

  return { horizontal, vertical };
}

export function createRawGaze(landmarks, isMirrored = true) {
  const ts = performance.now();
  
  if (!landmarks || landmarks.length === 0) {
    return {
      features: null,
      horizontal: 0,
      vertical: 0,
      direction: { horizontal: "center", vertical: "center" },
      confidence: 0,
      isBlinking: false,
      isValid: false,
      timestamp: ts
    };
  }

  // Basic blink detection based on MediaPipe landmarks
  const lUpper = landmarks[159];
  const lLower = landmarks[145];
  const rUpper = landmarks[386];
  const rLower = landmarks[374];
  
  let isBlinking = false;
  if (lUpper && lLower && rUpper && rLower) {
    const leftHeight = lLower.y - lUpper.y;
    const rightHeight = rLower.y - rUpper.y;
    if (leftHeight < BLINK_THRESHOLD_Y && rightHeight < BLINK_THRESHOLD_Y) {
      isBlinking = true;
    }
  }

  const features = extractFeatures(landmarks, isMirrored);
  const isValid = features !== null && !isBlinking;
  const confidence = isValid ? 1.0 : 0.0; // simple heuristic for now

  if (!isValid) {
    return {
      features: null,
      horizontal: 0,
      vertical: 0,
      direction: { horizontal: "center", vertical: "center" },
      confidence,
      isBlinking,
      isValid: false,
      timestamp: ts
    };
  }

  const horizontal = getHorizontalRelativeValue(features);
  const vertical = getVerticalRelativeValue(features);
  const direction = getCategoricalDirection(horizontal, vertical);

  return {
    features,
    horizontal,
    vertical,
    direction,
    confidence,
    isBlinking,
    isValid,
    timestamp: ts
  };
}
