import { describe, it, expect } from 'vitest';
import { computeQualityFromImageData, scoreImageData, QUALITY_THRESHOLD } from '../utils/frameQuality';

// Builds a plain {data,width,height} ImageData-alike — no canvas needed,
// since computeQualityFromImageData is pure pixel math (this is exactly why
// it was split out of gazeWorker.js: jsdom has no OffscreenCanvas).
function makeImage(width, height, pixelFn) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y);
      const i = (y * width + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe('frameQuality', () => {
  it('scores a sharp checkerboard higher than a flat, featureless image', () => {
    const flat = makeImage(64, 48, () => [128, 128, 128]);
    const checkerboard = makeImage(64, 48, (x, y) => ((x + y) % 2 === 0 ? [255, 255, 255] : [0, 0, 0]));

    const flatScore = computeQualityFromImageData(flat);
    const sharpScore = computeQualityFromImageData(checkerboard);
    expect(sharpScore).toBeGreaterThan(flatScore);
  });

  it('penalizes a very dark frame', () => {
    const dark = makeImage(64, 48, (x, y) => ((x + y) % 2 === 0 ? [10, 10, 10] : [5, 5, 5]));
    const normal = makeImage(64, 48, (x, y) => ((x + y) % 2 === 0 ? [200, 200, 200] : [100, 100, 100]));
    expect(computeQualityFromImageData(dark)).toBeLessThan(computeQualityFromImageData(normal));
  });

  it('penalizes a blown-out (very bright) frame', () => {
    const bright = makeImage(64, 48, (x, y) => ((x + y) % 2 === 0 ? [250, 250, 250] : [245, 245, 245]));
    const normal = makeImage(64, 48, (x, y) => ((x + y) % 2 === 0 ? [200, 200, 200] : [100, 100, 100]));
    expect(computeQualityFromImageData(bright)).toBeLessThan(computeQualityFromImageData(normal));
  });

  it('scoreImageData buckets the score against QUALITY_THRESHOLD', () => {
    const flat = makeImage(64, 48, () => [128, 128, 128]); // no texture -> low blur score
    const { quality, qualityScore } = scoreImageData(flat);
    expect(qualityScore).toBeLessThan(QUALITY_THRESHOLD);
    expect(quality).toBe('low');

    const sharp = makeImage(64, 48, (x, y) => ((x + y) % 2 === 0 ? [255, 255, 255] : [0, 0, 0]));
    const sharpResult = scoreImageData(sharp);
    expect(sharpResult.quality).toBe('high');
  });

  it('never produces NaN, including on a degenerate 1x1 image', () => {
    const tiny = makeImage(1, 1, () => [128, 128, 128]);
    const score = computeQualityFromImageData(tiny);
    expect(Number.isNaN(score)).toBe(false);
  });
});
