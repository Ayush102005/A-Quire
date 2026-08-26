/**
 * frameQuality.js
 * ===============
 * Pure pixel-math frame-quality scoring (blur via Laplacian variance +
 * luminance), split out of gazeWorker.js so it's testable without needing
 * OffscreenCanvas/2D-context support (unavailable in the jsdom test
 * environment) or the worker's MediaPipe imports. `gazeWorker.js` is the
 * only real caller — it draws each detection bitmap into a small
 * OffscreenCanvas and passes the resulting ImageData here.
 */

export const QUALITY_THRESHOLD = 0.25; // below this -> 'low'

/**
 * @param {{ data: Uint8ClampedArray|number[], width: number, height: number }} imageData
 * @returns {number} 0..1, higher = better (sharper, well-lit)
 */
export function computeQualityFromImageData(imageData) {
  const { data, width, height } = imageData;
  const n = width * height;

  let sumLum = 0;
  const gray = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;
    sumLum += lum;
  }

  const meanLum = sumLum / n;

  // Laplacian variance (blur detection) — 3×3 kernel approximation
  let lapVar = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap =
        -gray[idx - width - 1] - gray[idx - width] - gray[idx - width + 1] -
        gray[idx - 1] + 8 * gray[idx] - gray[idx + 1] -
        gray[idx + width - 1] - gray[idx + width] - gray[idx + width + 1];
      lapVar += lap * lap;
      count++;
    }
  }
  lapVar = count > 0 ? lapVar / count : 0;

  // Normalise: blur score 0–1 (higher = sharper)
  const blurScore = Math.min(lapVar / 5000, 1.0);
  // Luminance score: penalise very dark (<30) or very bright (>220)
  const lumScore = meanLum < 30 || meanLum > 220 ? 0.3 : 1.0;

  return Math.min(blurScore, lumScore);
}

/** @returns {{ quality: 'high'|'low', qualityScore: number }} */
export function scoreImageData(imageData) {
  const qualityScore = computeQualityFromImageData(imageData);
  return { quality: qualityScore < QUALITY_THRESHOLD ? 'low' : 'high', qualityScore };
}
