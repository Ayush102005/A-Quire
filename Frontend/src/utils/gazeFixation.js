/**
 * gazeFixation.js
 * ===============
 * I-DT (Identification by Dispersion Threshold) algorithm for fixation detection.
 *
 * A fixation is a run of gaze samples whose bounding-box dispersion
 * (`(maxX-minX) + (maxY-minY)`) stays under `maxDispersionPx` for at least
 * `minDurationMs`. Small jitter around a point stays inside one fixation;
 * a fast saccade across AOIs exceeds the dispersion threshold and breaks it.
 * Defaults below are overridden by callers with `gazeConfig.minFixationDurationMs`
 * / `dispersionThresholdPx` — see `useGazeTracker.js`.
 */

const DEFAULT_MIN_DURATION_MS = 100;
const DEFAULT_DISPERSION_PX = 80;

/**
 * @param {{ minDurationMs?: number, maxDispersionPx?: number }} params
 * @returns {{ addSample: (gazePoint: {x:number,y:number}|null, timestamp: number, aoiId: string|null) => object|null }}
 */
export function createFixationDetector(params = {}) {
  const minDurationMs = params.minDurationMs || DEFAULT_MIN_DURATION_MS;
  const maxDispersionPx = params.maxDispersionPx || DEFAULT_DISPERSION_PX;
  
  let window = [];
  let isFixating = false;
  let fixationStartTs = null;
  let lastAoiId = null;

  function calculateDispersion(pts) {
    if (pts.length === 0) return 0;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return (maxX - minX) + (maxY - minY);
  }

  return {
    /**
     * Feed a new sample. Returns a completed FixationEvent if a fixation just ended,
     * otherwise null.
     */
    addSample(gazePoint, timestamp, aoiId) {
      if (!gazePoint) {
        // Blink or looking away ends fixation
        if (isFixating && window.length > 0) {
          const evt = this._finishFixation(timestamp);
          this._reset();
          return evt;
        }
        this._reset();
        return null;
      }

      window.push({ x: gazePoint.x, y: gazePoint.y, ts: timestamp, aoi: aoiId });
      const duration = window[window.length - 1].ts - window[0].ts;
      const dispersion = calculateDispersion(window);

      if (dispersion <= maxDispersionPx) {
        if (!isFixating && duration >= minDurationMs) {
          isFixating = true;
          fixationStartTs = window[0].ts;
          lastAoiId = aoiId;
        } else if (isFixating) {
          // Continue fixation
          lastAoiId = aoiId || lastAoiId;
        }
        return null;
      } else {
        // Dispersion threshold exceeded
        if (isFixating) {
          // Fixation just ended. The last point caused the break, so exclude it.
          const breakPoint = window.pop();
          const evt = this._finishFixation(breakPoint.ts);
          
          // Start new window with the breaking point
          this._reset();
          window.push(breakPoint);
          
          return evt;
        } else {
          // Not fixating, just clear old samples from window to keep it tight
          while (window.length > 1 && calculateDispersion(window) > maxDispersionPx) {
            window.shift();
          }
          return null;
        }
      }
    },

    _finishFixation(endTs) {
      let sumX = 0, sumY = 0;
      for (const p of window) {
        sumX += p.x; sumY += p.y;
      }
      const centroid = { x: sumX / window.length, y: sumY / window.length };
      
      return {
        startTs: fixationStartTs,
        endTs: endTs,
        durationMs: endTs - fixationStartTs,
        centroid,
        aoiId: lastAoiId
      };
    },

    _reset() {
      window = [];
      isFixating = false;
      fixationStartTs = null;
      lastAoiId = null;
    }
  };
}
