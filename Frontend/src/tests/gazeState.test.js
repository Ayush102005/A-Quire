import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import { GazeStateMachine, TrackingState, AttentionState, GazeConstants } from '../utils/gazeState';

describe('GazeStateMachine', () => {
  let stateMachine;

  beforeEach(() => {
    stateMachine = new GazeStateMachine();
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const getBaseParams = (overrides = {}) => ({
    isTrackingEnabled: true,
    isCalibrated: true,
    isFaceVisible: true,
    isConfident: true,
    isInLessonAOI: true,
    isInViewport: true,
    ...overrides
  });

  test('transitions to ON_LESSON after hysteresis', () => {
    // Tick 1: active but not enough time
    vi.spyOn(performance, 'now').mockReturnValue(100);
    const s1 = stateMachine.update({
      isTrackingEnabled: true,
      isCalibrated: true,
      isFaceVisible: true,
      isConfident: true,
      isInLessonAOI: true,
      isInViewport: true
    });
    expect(s1.attentionState).toBe(AttentionState.UNKNOWN);

    // Tick 2: cross the ON_LESSON_CONFIRM_MS (1000ms) threshold
    vi.spyOn(performance, 'now').mockReturnValue(1150);
    const s2 = stateMachine.update({
      isTrackingEnabled: true,
      isCalibrated: true,
      isFaceVisible: true,
      isConfident: true,
      isInLessonAOI: true,
      isInViewport: true
    });
    expect(s2.attentionState).toBe(AttentionState.ON_LESSON);
  });

  test('face visible but invalid calibration -> never on_lesson', () => {
    const res = stateMachine.update(getBaseParams({ isCalibrated: false }));
    expect(res.trackingState).toBe(TrackingState.CALIBRATION_REQUIRED);
    expect(res.attentionState).toBe(AttentionState.UNKNOWN);
  });

  test('raw gaze outside viewport -> off_lesson', () => {
    // t=0, establish active tracking, but start the evidence of off_lesson
    stateMachine.update(getBaseParams({ isInViewport: false })); 
    
    // fast forward beyond OFF_LESSON_CONFIRM_MS
    vi.spyOn(performance, 'now').mockReturnValue(GazeConstants.OFF_LESSON_CONFIRM_MS + 10);
    const res = stateMachine.update(getBaseParams({ isInViewport: false }));
    
    expect(res.trackingState).toBe(TrackingState.TRACKING_ACTIVE);
    expect(res.attentionState).toBe(AttentionState.OFF_LESSON);
  });

  test('raw gaze in video bounds for ON_LESSON_CONFIRM_MS -> on_lesson', () => {
    // t=0
    stateMachine.update(getBaseParams({ isInLessonAOI: true }));
    expect(stateMachine.attentionState).toBe(AttentionState.UNKNOWN);
    
    // t=threshold+
    vi.spyOn(performance, 'now').mockReturnValue(GazeConstants.ON_LESSON_CONFIRM_MS + 10);
    const res = stateMachine.update(getBaseParams({ isInLessonAOI: true }));
    expect(res.attentionState).toBe(AttentionState.ON_LESSON);
  });

  test('raw gaze in unrelated page area for OFF_LESSON_CONFIRM_MS -> off_lesson', () => {
    stateMachine.update(getBaseParams({ isInLessonAOI: false }));
    
    vi.spyOn(performance, 'now').mockReturnValue(GazeConstants.OFF_LESSON_CONFIRM_MS + 10);
    const res = stateMachine.update(getBaseParams({ isInLessonAOI: false }));
    expect(res.attentionState).toBe(AttentionState.OFF_LESSON);
  });

  test('one noisy outside-AOI frame does not flip on_lesson to off_lesson', () => {
    // 1. Establish on_lesson
    stateMachine.update(getBaseParams());
    vi.spyOn(performance, 'now').mockReturnValue(GazeConstants.ON_LESSON_CONFIRM_MS + 10);
    stateMachine.update(getBaseParams());
    expect(stateMachine.attentionState).toBe(AttentionState.ON_LESSON);

    // 2. One noisy frame outside AOI
    vi.spyOn(performance, 'now').mockReturnValue(GazeConstants.ON_LESSON_CONFIRM_MS + 20);
    const res = stateMachine.update(getBaseParams({ isInLessonAOI: false }));
    
    // Still on_lesson because off_lesson threshold not met
    expect(res.attentionState).toBe(AttentionState.ON_LESSON);
  });

  test('face lost past threshold -> face_not_visible plus unknown attention', () => {
    // t=0, start losing face
    stateMachine.update(getBaseParams({ isFaceVisible: false }));
    
    // t=threshold+
    vi.spyOn(performance, 'now').mockReturnValue(GazeConstants.FACE_LOST_CONFIRM_MS + 10);
    const res = stateMachine.update(getBaseParams({ isFaceVisible: false }));
    
    expect(res.trackingState).toBe(TrackingState.FACE_NOT_VISIBLE);
    expect(res.attentionState).toBe(AttentionState.UNKNOWN);
  });

  test('low confidence past threshold -> low_confidence plus unknown attention', () => {
    // t=0, start low confidence
    stateMachine.update(getBaseParams({ isConfident: false }));
    
    // t=threshold+
    vi.spyOn(performance, 'now').mockReturnValue(GazeConstants.LOW_CONFIDENCE_CONFIRM_MS + 10);
    const res = stateMachine.update(getBaseParams({ isConfident: false }));
    
    expect(res.trackingState).toBe(TrackingState.LOW_CONFIDENCE);
    expect(res.attentionState).toBe(AttentionState.UNKNOWN);
  });
});
