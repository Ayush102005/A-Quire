import { describe, it, expect } from 'vitest';
import { createOneEuroFilter } from '../utils/oneEuroFilter';

// Simple fixed-alpha EMA, matching the pre-rewrite gazeEngine.js smoothing,
// used below only as a comparison baseline for the step-response test.
function emaStep(alpha, target, steps) {
  let y = 0;
  for (let i = 0; i < steps; i++) y = alpha * target + (1 - alpha) * y;
  return y;
}

describe('oneEuroFilter (One Euro Filter)', () => {
  it('returns the first value unchanged (no prior state to blend with)', () => {
    const filter = createOneEuroFilter();
    expect(filter.filter(100, 0)).toBe(100);
  });

  it('reduces jitter around a stationary signal vs. the raw input', () => {
    const filter = createOneEuroFilter({ minCutoff: 1.0, beta: 0.05 });
    const raw = [];
    const filtered = [];
    let t = 0;
    for (let i = 0; i < 60; i++) {
      const jitter = (i % 2 === 0) ? 3 : -3; // +/-3px noise around 500
      const value = 500 + jitter;
      raw.push(value);
      filtered.push(filter.filter(value, t));
      t += 20; // 50fps-ish
    }
    const stddev = (arr) => {
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
    };
    expect(stddev(filtered)).toBeLessThan(stddev(raw));
  });

  it('reaches a step change faster than a comparable fixed-alpha EMA', () => {
    const filter = createOneEuroFilter({ minCutoff: 1.0, beta: 0.3 });
    let t = 0;
    // Settle at 0 first.
    for (let i = 0; i < 10; i++) { filter.filter(0, t); t += 20; }
    // Step to 500 and see how many ticks it takes to get within 5% of target.
    let ticks = 0;
    let value = 0;
    while (Math.abs(value - 500) > 25 && ticks < 200) {
      value = filter.filter(500, t);
      t += 20;
      ticks++;
    }
    const oneEuroTicks = ticks;

    // Same step for a fixed EMA_ALPHA=0.35 (the old gazeEngine.js constant).
    let emaValue = 0;
    let emaTicks = 0;
    while (Math.abs(emaValue - 500) > 25 && emaTicks < 200) {
      emaValue = 0.35 * 500 + (1 - 0.35) * emaValue;
      emaTicks++;
    }

    expect(oneEuroTicks).toBeLessThanOrEqual(emaTicks);
  });

  it('adapts: higher beta reaches a step target faster than lower beta', () => {
    const runStep = (beta) => {
      const filter = createOneEuroFilter({ minCutoff: 1.0, beta });
      let t = 0;
      for (let i = 0; i < 10; i++) { filter.filter(0, t); t += 20; }
      let value = 0;
      let ticks = 0;
      while (Math.abs(value - 500) > 25 && ticks < 300) {
        value = filter.filter(500, t);
        t += 20;
        ticks++;
      }
      return ticks;
    };
    expect(runStep(0.5)).toBeLessThanOrEqual(runStep(0.01));
  });

  it('is timestamp-driven: a longer real gap between samples changes the smoothing factor, not a fixed tick-count assumption', () => {
    const fastFilter = createOneEuroFilter({ minCutoff: 1.0, beta: 0.05 });
    const slowFilter = createOneEuroFilter({ minCutoff: 1.0, beta: 0.05 });

    fastFilter.filter(0, 0);
    slowFilter.filter(0, 0);

    // Same two samples, but the elapsed time differs — the filtered output
    // should differ too (a tick-count-driven filter would treat these
    // identically).
    const fastResult = fastFilter.filter(100, 20);   // 20ms gap
    const slowResult = slowFilter.filter(100, 500);  // 500ms gap

    expect(fastResult).not.toBeCloseTo(slowResult, 5);
  });

  it('reset() clears state so the next value is returned unchanged, like a fresh filter', () => {
    const filter = createOneEuroFilter();
    filter.filter(100, 0);
    filter.filter(200, 20);
    filter.reset();
    expect(filter.filter(9999, 1000)).toBe(9999);
  });

  it('never produces NaN across a realistic noisy sequence', () => {
    const filter = createOneEuroFilter();
    let t = 0;
    for (let i = 0; i < 200; i++) {
      const value = 500 + Math.sin(i * 0.3) * 50 + (Math.random() - 0.5) * 10;
      const result = filter.filter(value, t);
      expect(Number.isNaN(result)).toBe(false);
      t += 15 + Math.random() * 30; // variable interval, like a real tick loop
    }
  });
});
