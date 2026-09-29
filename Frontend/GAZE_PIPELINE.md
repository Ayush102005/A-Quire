# Gaze Tracking Pipeline

## Overview
A-Quire uses a reliable, conservative, privacy-aware gaze-attention state machine to track if a user is actively engaging with lesson content. A-Quire estimates "looking at lesson content," not mental focus or understanding. 

## Tracking State vs Attention State
To ensure we never equate "camera active" with "focused on lesson", the system is separated into two states.

### 1. Tracking State
Indicates the health and status of the webcam pipeline.
- `tracking_off`: Tracking is disabled.
- `initializing`: Webcam and model are starting up.
- `calibration_required`: User has not completed calibration or calibration is invalid/stale.
- `tracking_active`: Pipeline is healthy and gaze predictions are available.
- `face_not_visible`: Camera is active but no face is detected (persisted beyond `FACE_LOST_CONFIRM_MS`).
- `low_confidence`: Confidence score of the tracking model is below `MIN_GAZE_CONFIDENCE` (persisted beyond `LOW_CONFIDENCE_CONFIRM_MS`).
- `error`: Unrecoverable error in the pipeline.

### 2. Attention State
Indicates whether the user's raw gaze is inside the lesson content boundaries.
- `unknown`: Attention cannot be determined (tracking is off, face lost, low confidence, or calibration required).
- `on_lesson`: Valid calibrated gaze coordinates have remained within a lesson Area of Interest (AOI) continuously for `ON_LESSON_CONFIRM_MS`.
- `off_lesson`: Valid calibrated gaze coordinates have remained outside all lesson AOIs continuously for `OFF_LESSON_CONFIRM_MS`.

## Raw Gaze and Areas of Interest (AOIs)
- **Raw Gaze Before Clamping**: We never clamp the predicted gaze coordinates to the screen edges before viewport or AOI classification. If `rawX`/`rawY` falls outside the screen, it is immediately classified as `outside_viewport`. Screen coordinate clamping is only allowed for rendering a visual UI cursor, never for attention classification.
- **Areas of Interest (AOI)**: Valid lesson areas include:
  - Video player container
  - Transcript panel
  - AI mentor panel
  - Active quiz/problem/content panel
  - Lesson controls (tabs, video controls)
- **Hysteresis**: A single gaze frame outside an AOI does not immediately flip the state to `off_lesson`. Time thresholds (hysteresis) ensure that noisy predictions or quick blinks do not result in jumpy state transitions.

## Calibration Invalidation
The calibration relies on a stable mapping. If major display changes occur (window resize, zoom change, fullscreen toggled), the calibration is invalidated and the tracking state returns to `calibration_required`.

## Intervention Safeguards
A struggle intervention must **never** be triggered solely because the gaze is outside the lesson (i.e. `off_lesson`).
A gaze-driven intervention requires:
1. Valid calibration.
2. Sustained `off_lesson` state beyond the `OFF_LESSON_CONFIRM_MS`.
3. Sufficient confidence throughout the evidence window.
4. **At least one corroborating behavioral signal** (e.g. prolonged video inactivity, repeated pauses, repeated rewinds).
5. A cooldown mechanism to prevent repeated prompts.
