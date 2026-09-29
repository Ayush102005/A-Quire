import { describe, it, expect } from 'vitest';
import { deriveGazeStatus } from '../utils/gazeMetrics';

describe('deriveGazeStatus', () => {
  it('is gaze-unsupported whenever the engine has failed, regardless of anything else', () => {
    expect(deriveGazeStatus({ engineFailed: true, gazeAvailable: true, facePresent: true, isOnContent: true }))
      .toBe('gaze-unsupported');
    expect(deriveGazeStatus({ engineFailed: true, gazeAvailable: false, facePresent: false, isOnContent: false }))
      .toBe('gaze-unsupported');
  });

  it('is unavailable when gaze is not available even if a face happens to be flagged present', () => {
    expect(deriveGazeStatus({ engineFailed: false, gazeAvailable: false, facePresent: true, isOnContent: true }))
      .toBe('unavailable');
  });

  it('is unavailable the instant the face is no longer present — no lingering "focused"', () => {
    expect(deriveGazeStatus({ engineFailed: false, gazeAvailable: true, facePresent: false, isOnContent: true }))
      .toBe('unavailable');
  });

  it('is focused only when gaze is available, a face is present, AND the gaze is on content', () => {
    expect(deriveGazeStatus({ engineFailed: false, gazeAvailable: true, facePresent: true, isOnContent: true }))
      .toBe('focused');
  });

  it('is off-target when tracking normally but gaze lands on a background/non-content AOI', () => {
    expect(deriveGazeStatus({ engineFailed: false, gazeAvailable: true, facePresent: true, isOnContent: false }))
      .toBe('off-target');
  });
});
