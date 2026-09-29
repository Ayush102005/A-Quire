import { expect, test, describe } from 'vitest';
import { createRawGaze } from '../utils/rawGazeTracker';

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

describe('rawGazeTracker', () => {
  test('Raw gaze labels agree with visual direction', () => {
    // Screen-left fixture (higher normalized feature values when mirrored)
    const lmLeft = makeMockLandmarks({
      468: { x: 0.37, y: 0.4, z: 0 },
      473: { x: 0.57, y: 0.4, z: 0 }
    });

    // Screen-center fixture
    const lmCenter = makeMockLandmarks({
      468: { x: 0.40, y: 0.4, z: 0 },
      473: { x: 0.60, y: 0.4, z: 0 }
    });

    // Screen-right fixture (lower normalized feature values when mirrored)
    const lmRight = makeMockLandmarks({
      468: { x: 0.43, y: 0.4, z: 0 },
      473: { x: 0.63, y: 0.4, z: 0 }
    });

    const leftGaze = createRawGaze(lmLeft, true);
    const centerGaze = createRawGaze(lmCenter, true);
    const rightGaze = createRawGaze(lmRight, true);

    expect(leftGaze.direction.horizontal).toBe("left");
    expect(centerGaze.direction.horizontal).toBe("center");
    expect(rightGaze.direction.horizontal).toBe("right");
  });
});
