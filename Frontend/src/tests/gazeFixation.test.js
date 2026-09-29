import { describe, it, expect } from 'vitest';
import { createFixationDetector } from '../utils/gazeFixation';

describe('gazeFixation (I-DT)', () => {
  it('groups small jitter within the dispersion window into a single fixation', () => {
    const detector = createFixationDetector({ minDurationMs: 100, maxDispersionPx: 50 });
    let lastEvent = null;

    // Jitter within a ~10px box for 300ms (15 samples @ 20ms)
    for (let i = 0; i < 15; i++) {
      const jitter = (i % 2 === 0) ? 2 : -2;
      const evt = detector.addSample({ x: 100 + jitter, y: 100 + jitter }, i * 20, 'CODE_EDITOR');
      if (evt) lastEvent = evt;
    }
    // Break it with a big jump far outside the dispersion threshold.
    const breakEvt = detector.addSample({ x: 800, y: 800 }, 320, 'CODE_EDITOR');

    expect(lastEvent).toBeNull(); // no fixation completes mid-jitter
    expect(breakEvt).not.toBeNull();
    expect(breakEvt.durationMs).toBeGreaterThanOrEqual(100);
    expect(breakEvt.aoiId).toBe('CODE_EDITOR');
  });

  it('does not report a fixation for a fast saccade shorter than minDurationMs', () => {
    const detector = createFixationDetector({ minDurationMs: 200, maxDispersionPx: 50 });

    const evt1 = detector.addSample({ x: 100, y: 100 }, 0, 'A');
    const evt2 = detector.addSample({ x: 105, y: 100 }, 50, 'A'); // still within duration threshold
    // Jump far away before minDurationMs elapses — no fixation should have formed.
    const evt3 = detector.addSample({ x: 900, y: 900 }, 80, 'A');

    expect(evt1).toBeNull();
    expect(evt2).toBeNull();
    expect(evt3).toBeNull();
  });

  it('breaks a fixation on a large jump across AOIs', () => {
    const detector = createFixationDetector({ minDurationMs: 100, maxDispersionPx: 50 });
    for (let i = 0; i < 10; i++) {
      detector.addSample({ x: 100, y: 100 }, i * 20, 'QUESTION');
    }
    const evt = detector.addSample({ x: 700, y: 500 }, 220, 'SUBMIT_BTN');
    expect(evt).not.toBeNull();
    expect(evt.aoiId).toBe('QUESTION'); // AOI of the completed fixation, not the breaking sample
  });

  it('produces a plausible (not zero, not hundreds) fixation count over a realistic sequence', () => {
    const detector = createFixationDetector({ minDurationMs: 120, maxDispersionPx: 40 });
    let fixationCount = 0;
    let t = 0;

    // Simulate ~10s of reading: 15 fixation clusters (~300ms jitter each)
    // separated by instantaneous saccades to a new location.
    for (let cluster = 0; cluster < 15; cluster++) {
      const baseX = 100 + cluster * 40;
      const baseY = 200;
      for (let i = 0; i < 15; i++) {
        const jitter = (i % 2 === 0) ? 3 : -3;
        const evt = detector.addSample({ x: baseX + jitter, y: baseY + jitter }, t, 'VIDEO_CONTENT');
        if (evt) fixationCount++;
        t += 20;
      }
      // Saccade: large jump to the next cluster's location breaks the fixation.
    }
    // Flush the final fixation.
    const last = detector.addSample(null, t, null);
    if (last) fixationCount++;

    expect(fixationCount).toBeGreaterThan(0);
    expect(fixationCount).toBeLessThan(100);
  });
});
