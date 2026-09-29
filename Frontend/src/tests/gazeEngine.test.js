import { expect, test, describe, beforeEach } from 'vitest';
import { extractFeatures, resetGazeEngineState } from '../utils/gazeEngine';

// Helper to construct mock landmarks
function makeMockLandmarks(overrides = {}) {
  const lm = new Array(478).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0 }));
  
  // Nose
  lm[1] = { x: 0.5, y: 0.5, z: -0.1 };
  
  // Left eye (133, 33, 159, 145, 468)
  lm[133] = { x: 0.45, y: 0.4, z: 0 };
  lm[33] = { x: 0.35, y: 0.4, z: 0 };
  lm[159] = { x: 0.4, y: 0.38, z: 0 };
  lm[145] = { x: 0.4, y: 0.42, z: 0 };
  lm[468] = { x: 0.4, y: 0.4, z: 0 };

  // Right eye (362, 263, 386, 374, 473)
  lm[362] = { x: 0.55, y: 0.4, z: 0 };
  lm[263] = { x: 0.65, y: 0.4, z: 0 };
  lm[386] = { x: 0.6, y: 0.38, z: 0 };
  lm[374] = { x: 0.6, y: 0.42, z: 0 };
  lm[473] = { x: 0.6, y: 0.4, z: 0 };

  // Apply overrides
  Object.keys(overrides).forEach(key => {
    lm[Number(key)] = { ...lm[Number(key)], ...overrides[key] };
  });

  return lm;
}

describe('gazeEngine', () => {
  beforeEach(() => {
    resetGazeEngineState();
  });

  test('extracts 6-dimensional feature vector for valid landmarks', () => {
    const lm = makeMockLandmarks();
    const features = extractFeatures(lm);
    expect(features).toBeDefined();
    expect(features).toHaveLength(6);
    expect(features.every(Number.isFinite)).toBe(true);
  });

  test('centered gaze produces ratios near 0.5', () => {
    const lm = makeMockLandmarks();
    const features = extractFeatures(lm);
    
    // leftX, leftY, rightX, rightY should be ~0.5
    expect(features[0]).toBeCloseTo(0.5, 1);
    expect(features[1]).toBeCloseTo(0.5, 1);
    expect(features[2]).toBeCloseTo(0.5, 1);
    expect(features[3]).toBeCloseTo(0.5, 1);
  });

  test('horizontal movement changes horizontal features correctly and in the same direction', () => {
    // Screen-left fixture (eyes looking left)
    // Left eye (unmirrored): 133(inner=0.45), 33(outer=0.35). Iris moves left towards 0.35. Let's say 0.37
    // Right eye (unmirrored): 362(inner=0.55), 263(outer=0.65). Iris moves left towards 0.55. Let's say 0.57
    const lmLeft = makeMockLandmarks({
      468: { x: 0.37, y: 0.4, z: 0 },
      473: { x: 0.57, y: 0.4, z: 0 }
    });

    // Screen-center fixture
    const lmCenter = makeMockLandmarks({
      468: { x: 0.40, y: 0.4, z: 0 },
      473: { x: 0.60, y: 0.4, z: 0 }
    });

    // Screen-right fixture (eyes looking right)
    // Left eye: Iris moves right towards 0.45. Let's say 0.43
    // Right eye: Iris moves right towards 0.65. Let's say 0.63
    const lmRight = makeMockLandmarks({
      468: { x: 0.43, y: 0.4, z: 0 },
      473: { x: 0.63, y: 0.4, z: 0 }
    });

    // We test mirrored (the default) as it's what the app uses
    const fLeft = extractFeatures(lmLeft, true);
    const fCenter = extractFeatures(lmCenter, true);
    const fRight = extractFeatures(lmRight, true);

    const leftEyeDelta = fRight[0] - fLeft[0];
    const rightEyeDelta = fRight[2] - fLeft[2];

    expect(leftEyeDelta).not.toBe(0);
    expect(rightEyeDelta).not.toBe(0);
    expect(Math.sign(leftEyeDelta)).toBe(Math.sign(rightEyeDelta));

    // Combined horizontal raw gaze check
    const horizontalLeft = (fLeft[0] + fLeft[2]) / 2;
    const horizontalRight = (fRight[0] + fRight[2]) / 2;

    expect(horizontalLeft).not.toBeCloseTo(horizontalRight, 5);

    // In mirrored mode, X ratio 0->1 becomes 1->0.
    // Unmirrored: moving right increases X ratio. Mirrored: moving right DECREASES X ratio.
    expect(horizontalRight).toBeLessThan(horizontalLeft);
  });

  test('vertical movement changes vertical features correctly', () => {
    // Move left iris down to the lower lid (145), y = 0.42
    const lm = makeMockLandmarks({
      468: { x: 0.4, y: 0.42, z: 0 }
    });
    
    const features = extractFeatures(lm);
    // Upper=0.38, Lower=0.42. Dist=0.04. Iris-Upper = 0.42-0.38 = 0.04.
    // Ratio = 1.0
    expect(features[1]).toBeCloseTo(1.0, 2);
  });

  test('blink or near-closed eye uses fallback vertical ratio', () => {
    // 1. Establish valid open eye
    const lmOpen = makeMockLandmarks({
      468: { x: 0.4, y: 0.41, z: 0 } // slightly lower
    });
    const fOpen = extractFeatures(lmOpen);
    expect(fOpen[1]).toBeCloseTo(0.75, 2);

    // 2. Simulate blink by bringing upper/lower lids together
    const lmBlink = makeMockLandmarks({
      159: { x: 0.4, y: 0.4, z: 0 },
      145: { x: 0.4, y: 0.4, z: 0 }, // dist = 0
      468: { x: 0.4, y: 0.4, z: 0 }
    });
    const fBlink = extractFeatures(lmBlink);
    
    // Should reuse 0.75
    expect(fBlink[1]).toBeCloseTo(0.75, 2);
  });

  test('handles missing landmarks safely', () => {
    expect(extractFeatures(null)).toBeNull();
    expect(extractFeatures([])).toBeNull();
    // Incomplete array
    expect(extractFeatures(new Array(100).fill({x:0, y:0, z:0}))).toBeNull();
  });

  test('never allows NaN or Infinity in output vector (coerces to 0.5)', () => {
    // Introduce NaNs into landmarks
    // With strict checking, if any required point is NaN, it returns null
    const lm = makeMockLandmarks({
      468: { x: NaN, y: 0.4, z: 0 }
    });
    const features = extractFeatures(lm);
    expect(features).toBeNull();
  });

  test('missing required landmark rejects full frame', () => {
    const lm = makeMockLandmarks();
    lm[33] = null; // Remove left inner corner
    const features = extractFeatures(lm);
    expect(features).toBeNull();
  });
});
