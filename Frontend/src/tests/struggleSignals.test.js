import { expect, test, describe } from 'vitest';
import { isGazeSignalStrong, isBehaviorSignalStrong, computeOffTargetWindow } from '../utils/gazeMetrics';

describe('struggleSignals', () => {
  test('gaze alone cannot trigger a struggle intervention', () => {
    const gazeStrong = isGazeSignalStrong('off_lesson', 5000); // 5 seconds off lesson
    const behaviorStrong = isBehaviorSignalStrong(true, 0, 100); // playing, recent interaction
    
    expect(gazeStrong).toBe(true);
    expect(behaviorStrong).toBe(false);
    
    const trigger = computeOffTargetWindow(gazeStrong, behaviorStrong);
    expect(trigger).toBe(false); // Must not trigger on gaze alone!
  });

  test('corroborating behavior triggers intervention', () => {
    const gazeStrong = isGazeSignalStrong('off_lesson', 5000);
    const behaviorStrong = isBehaviorSignalStrong(false, 0, 20000); // paused for 20 seconds
    
    expect(gazeStrong).toBe(true);
    expect(behaviorStrong).toBe(true);
    
    const trigger = computeOffTargetWindow(gazeStrong, behaviorStrong);
    expect(trigger).toBe(true);
  });
});
