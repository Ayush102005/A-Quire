/**
 * oneEuroFilter.js
 * =================
 * The 1€ Filter (Casiez, Roussel, Vogel 2012) — an adaptive low-pass filter
 * for noisy, real-time signals (mouse/gaze/motion tracking). Unlike a fixed-
 * alpha EMA, its cutoff frequency adapts to the signal's own speed: slow
 * movement (or stillness) gets heavy smoothing (low jitter while fixating),
 * fast movement gets light smoothing (low lag when the eye actually moves).
 * A fixed-alpha EMA can only ever pick one point on that tradeoff.
 *
 * Reference: https://cristal.univ-lille.fr/~casiez/1euro/
 *
 * Tuning sequence (do this against real, live data — these defaults are a
 * starting point, not empirically tuned):
 *   1. Set beta = 0, increase minCutoff until stationary-fixation jitter is
 *      acceptable.
 *   2. Move the target quickly and increase beta until the filtered value
 *      follows without visible lag.
 *   3. Repeat at both GPU- and CPU-delegate speeds — round-trip latency
 *      differs enough between them to change the felt lag/jitter tradeoff.
 */

function lowPass(prevValue, value, alpha) {
  return prevValue === null ? value : alpha * value + (1 - alpha) * prevValue;
}

function smoothingAlpha(cutoff, dtSeconds) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dtSeconds);
}

/**
 * @param {object} [options]
 * @param {number} [options.minCutoff=1.0] Baseline cutoff (Hz) — higher =
 *   less lag but more jitter while still. Tune this first, with beta=0.
 * @param {number} [options.beta=0.05] Speed coefficient — higher = cutoff
 *   rises faster with signal speed, reducing lag on fast movement at the
 *   cost of a bit more jitter. Tune second, after minCutoff.
 * @param {number} [options.dCutoff=1.0] Cutoff (Hz) for the derivative
 *   (speed) estimate itself — rarely needs tuning.
 * @returns {{ filter: (value: number, timestampMs: number) => number, reset: () => void }}
 */
export function createOneEuroFilter({ minCutoff = 1.0, beta = 0.05, dCutoff = 1.0 } = {}) {
  let prevValue = null;
  let prevDerivative = null;
  let prevTimestampMs = null;

  function reset() {
    prevValue = null;
    prevDerivative = null;
    prevTimestampMs = null;
  }

  function filter(value, timestampMs) {
    if (!Number.isFinite(value)) return value; // never let a bad reading corrupt filter state

    if (prevTimestampMs === null) {
      prevValue = value;
      prevDerivative = 0;
      prevTimestampMs = timestampMs;
      return value;
    }

    // Guard against a zero/negative/absurd dt (duplicate or out-of-order
    // timestamps, a tab coming back from being backgrounded) — treat as a
    // fresh start rather than dividing by ~0 or smoothing across a huge gap.
    const dtSeconds = (timestampMs - prevTimestampMs) / 1000;
    if (!(dtSeconds > 0) || dtSeconds > 2) {
      prevValue = value;
      prevDerivative = 0;
      prevTimestampMs = timestampMs;
      return value;
    }

    const derivative = (value - prevValue) / dtSeconds;
    const dAlpha = smoothingAlpha(dCutoff, dtSeconds);
    const smoothedDerivative = lowPass(prevDerivative, derivative, dAlpha);

    const cutoff = minCutoff + beta * Math.abs(smoothedDerivative);
    const alpha = smoothingAlpha(cutoff, dtSeconds);
    const smoothedValue = lowPass(prevValue, value, alpha);

    prevValue = smoothedValue;
    prevDerivative = smoothedDerivative;
    prevTimestampMs = timestampMs;

    return smoothedValue;
  }

  return { filter, reset };
}

/**
 * A bank of independent 1€ filters, one per dimension of a fixed-size
 * feature vector — convenience wrapper so callers don't manage an array of
 * filters by hand. Dimensions with non-finite input pass through
 * unfiltered rather than corrupting that dimension's filter state (see
 * createOneEuroFilter's own guard).
 */
export function createOneEuroFilterBank(dimensions, options) {
  const filters = Array.from({ length: dimensions }, () => createOneEuroFilter(options));
  return {
    filter(values, timestampMs) {
      return values.map((v, i) => filters[i].filter(v, timestampMs));
    },
    reset() {
      filters.forEach((f) => f.reset());
    },
  };
}
