export const TrackingState = {
  TRACKING_OFF: 'tracking_off',
  INITIALIZING: 'initializing',
  CALIBRATION_REQUIRED: 'calibration_required',
  TRACKING_ACTIVE: 'tracking_active',
  FACE_NOT_VISIBLE: 'face_not_visible',
  LOW_CONFIDENCE: 'low_confidence',
  ERROR: 'error'
};

export const AttentionState = {
  UNKNOWN: 'unknown',
  ON_LESSON: 'on_lesson',
  OFF_LESSON: 'off_lesson'
};

export const GazeConstants = {
  ON_LESSON_CONFIRM_MS: 1000,
  OFF_LESSON_CONFIRM_MS: 1500,
  FACE_LOST_CONFIRM_MS: 1200,
  LOW_CONFIDENCE_CONFIRM_MS: 1000,
  MIN_GAZE_CONFIDENCE: 0.65,
  MAX_CALIBRATION_ERROR_PX: 100
};

export class GazeStateMachine {
  constructor() {
    this.trackingState = TrackingState.TRACKING_OFF;
    this.attentionState = AttentionState.UNKNOWN;

    this.stateTimers = {
      faceLostSince: null,
      lowConfidenceSince: null,
      onLessonSince: null,
      offLessonSince: null
    };
  }

  resetTimers() {
    this.stateTimers = {
      faceLostSince: null,
      lowConfidenceSince: null,
      onLessonSince: null,
      offLessonSince: null
    };
  }

  update(params) {
    const {
      isTrackingEnabled,
      isCalibrated,
      isFaceVisible,
      isConfident,
      isInLessonAOI,
      isInViewport
    } = params;
    
    const now = performance.now();

    // 1. Base tracking state checks
    if (!isTrackingEnabled) {
      this.trackingState = TrackingState.TRACKING_OFF;
      this.attentionState = AttentionState.UNKNOWN;
      this.resetTimers();
      return { trackingState: this.trackingState, attentionState: this.attentionState };
    }

    // 2. Face Visibility (prioritize this so user knows if camera works before calibration)
    if (!isFaceVisible) {
      if (this.stateTimers.faceLostSince === null) {
        this.stateTimers.faceLostSince = now;
      }
      if (now - this.stateTimers.faceLostSince >= GazeConstants.FACE_LOST_CONFIRM_MS) {
        this.trackingState = TrackingState.FACE_NOT_VISIBLE;
        this.attentionState = AttentionState.UNKNOWN;
        // Keep timers for lesson reset, since face is lost
        this.stateTimers.onLessonSince = null;
        this.stateTimers.offLessonSince = null;
      }
      return { trackingState: this.trackingState, attentionState: this.attentionState };
    } else {
      this.stateTimers.faceLostSince = null;
    }

    // 3. Calibration check
    if (!isCalibrated) {
      this.trackingState = TrackingState.CALIBRATION_REQUIRED;
      this.attentionState = AttentionState.UNKNOWN;
      this.resetTimers();
      return { trackingState: this.trackingState, attentionState: this.attentionState };
    }

    // 3. Confidence
    if (!isConfident) {
      if (this.stateTimers.lowConfidenceSince === null) {
        this.stateTimers.lowConfidenceSince = now;
      }
      if (now - this.stateTimers.lowConfidenceSince >= GazeConstants.LOW_CONFIDENCE_CONFIRM_MS) {
        this.trackingState = TrackingState.LOW_CONFIDENCE;
        this.attentionState = AttentionState.UNKNOWN;
        this.stateTimers.onLessonSince = null;
        this.stateTimers.offLessonSince = null;
      }
      return { trackingState: this.trackingState, attentionState: this.attentionState };
    } else {
      this.stateTimers.lowConfidenceSince = null;
    }

    // 4. If we reach here, tracking is active and healthy
    this.trackingState = TrackingState.TRACKING_ACTIVE;

    // 5. Attention classification using hysteresis
    if (isInLessonAOI && isInViewport) {
      // Evidence of ON_LESSON
      this.stateTimers.offLessonSince = null; // reset off-lesson evidence
      if (this.stateTimers.onLessonSince === null) {
        this.stateTimers.onLessonSince = now;
      }
      if (now - this.stateTimers.onLessonSince >= GazeConstants.ON_LESSON_CONFIRM_MS) {
        this.attentionState = AttentionState.ON_LESSON;
      }
    } else {
      // Evidence of OFF_LESSON
      this.stateTimers.onLessonSince = null; // reset on-lesson evidence
      if (this.stateTimers.offLessonSince === null) {
        this.stateTimers.offLessonSince = now;
      }
      if (now - this.stateTimers.offLessonSince >= GazeConstants.OFF_LESSON_CONFIRM_MS) {
        this.attentionState = AttentionState.OFF_LESSON;
      }
    }

    return { trackingState: this.trackingState, attentionState: this.attentionState };
  }
}
