// gazeMetrics.js

export function isGazeSignalStrong(attentionState, durationMs) {
  if (attentionState !== 'off_lesson') return false;
  return durationMs >= 4000; // 4 seconds of off_lesson gaze
}

export function isBehaviorSignalStrong(isPlaying, lastInteractionTimeMs, currentTimeMs) {
  // If video is paused for a long time, or no interaction
  if (!isPlaying && (currentTimeMs - lastInteractionTimeMs > 10000)) {
    return true;
  }
  return false;
}

export function computeOffTargetWindow(gazeStrong, behaviorStrong) {
  // Never intervene based on gaze alone!
  if (gazeStrong && behaviorStrong) return true;
  return false;
}
