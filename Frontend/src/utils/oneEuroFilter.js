/**
 * oneEuroFilter.js
 * ================
 * The One Euro Filter (Casiez, Roussel, Vogel — "1€ Filter: A Simple
 * Speed-based Low-pass Filter for Noisy Input in Interactive Systems",
 * CHI 2012). A low-pass filter whose cutoff frequency adapts to the
 * estimated speed of the signal: slow/stationary input gets a low cutoff
 * (heavy smoothing, low jitter), fast-moving input gets a higher cutoff
 * (light smoothing, low lag). This replaces a fixed-alpha EMA, which can
 * only ever sit at one point on that tradeoff.
 *
 * Used by gazeEngine.js to smooth the raw gaze point per axis (`x`, `y`
 * each get their own filter instance, sharing timestamps) — see
 * `smoothGaze()` there.
 *
 * Tuning sequence (repeat at both GPU- and CPU-delegate speeds — worker
 * round-trip time changes the felt lag/jitter tradeoff):
 *   1. Set `beta = 0`. Increase `minCutoff` until jitter while fixating
 *      (staring at one point) is acceptable.
 *   2. Move the calibration target quickly. Increase `beta` until the
 *      filtered point follows without visible lag.
 *   3. Re-check step 1 hasn't regressed; iterate.
 */

class LowPassFilter {
  constructor(alpha) {
    this._alpha = alpha;
    this._y = null;
    this._s = null;
    this._initialized = false;
  }

  setAlpha(alpha) {
    this._alpha = alpha;
  }

  filter(value) {
    let result;
    if (this._initialized) {
      result = this._alpha * value + (1 - this._alpha) * this._s;
    } else {
      result = value;
      this._initialized = true;
    }
    this._y = value;
    this._s = result;
    return result;
  }

  lastRawValue() {
    return this._y;
  }

  reset() {
    this._y = null;
    this._s = null;
    this._initialized = false;
  }
}

function smoothingFactor(dtSeconds, cutoffHz) {
  const r = 2 * Math.PI * cutoffHz * dtSeconds;
  return r / (r + 1);
}

/**
 * @param {{ minCutoff?: number, beta?: number, dCutoff?: number }} params
 * @returns {{
 *   filter: (value: number, timestampMs: number) => number,
 *   reset: () => void,
 * }}
 */
export function createOneEuroFilter({ minCutoff = 1.0, beta = 0.05, dCutoff = 1.0 } = {}) {
  const xFilter = new LowPassFilter(smoothingFactor(1, minCutoff));
  const dxFilter = new LowPassFilter(smoothingFactor(1, dCutoff));
  let lastTimestampMs = null;

  return {
    /** @param {number} value @param {number} timestampMs @returns {number} */
    filter(value, timestampMs) {
      if (lastTimestampMs === null) {
        lastTimestampMs = timestampMs;
        xFilter.filter(value);
        dxFilter.filter(0);
        return value;
      }

      // Guard against a non-increasing or absurdly large gap (clock skew,
      // paused tab resuming) rather than letting dt go to 0 or explode the
      // derivative estimate.
      const dtSeconds = Math.min(Math.max((timestampMs - lastTimestampMs) / 1000, 1e-3), 1);
      lastTimestampMs = timestampMs;

      const prevValue = xFilter.lastRawValue();
      const dx = prevValue === null ? 0 : (value - prevValue) / dtSeconds;

      dxFilter.setAlpha(smoothingFactor(dtSeconds, dCutoff));
      const edx = dxFilter.filter(dx);

      const cutoff = minCutoff + beta * Math.abs(edx);
      xFilter.setAlpha(smoothingFactor(dtSeconds, cutoff));
      return xFilter.filter(value);
    },

    /** Clears all internal state — call after a meaningful tracking gap. */
    reset() {
      xFilter.reset();
      dxFilter.reset();
      lastTimestampMs = null;
    },
  };
}
