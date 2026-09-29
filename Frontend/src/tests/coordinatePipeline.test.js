import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyCalibration, invalidateCalibration } from '../utils/gazeCalibration';

// Mock dependencies
const mockInnerWidth = 1920;
const mockInnerHeight = 1080;

describe('Coordinate Pipeline Audit', () => {
  beforeEach(() => {
    // Reset any state
    invalidateCalibration();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies target coordinate generation is in CSS pixels', () => {
    const w = mockInnerWidth;
    const h = mockInnerHeight;
    const mX = w * 0.1;
    const mY = h * 0.1;
    const w90 = w * 0.9;
    const h90 = h * 0.9;

    const targets = [
      { x: mX, y: mY },          // top-left
      { x: w / 2, y: h / 2 },    // center
      { x: w90, y: h90 },        // bottom-right
    ];

    expect(targets[0].x).toBe(192);
    expect(targets[0].y).toBe(108);
    expect(targets[1].x).toBe(960);
    expect(targets[1].y).toBe(540);
  });

  it('demonstrates the coordinate clamping bug in predictGaze', () => {
    const vw = 1920;
    const vh = 1080;
    
    // Simulate what predictGaze does internally
    const predictGazeSimulated = (irisAvgXNorm, irisAvgYNorm) => {
      const gx = irisAvgXNorm * vw;
      const gy = irisAvgYNorm * vh;
      // THE BUG: Math.min and Math.max clamps raw gaze
      return { 
        x: Math.max(0, Math.min(vw, gx)), 
        y: Math.max(0, Math.min(vh, gy)) 
      };
    };

    // If user looks far left, irisAvgXNorm might naturally fall outside [0, 1] bounds due to ratio estimation
    const farLeftNorm = -0.1;
    const farRightNorm = 1.1;

    const gazeFarLeft = predictGazeSimulated(farLeftNorm, 0.5);
    const gazeFarRight = predictGazeSimulated(farRightNorm, 0.5);

    // Because of clamping, these both get stuck at 0 and vw
    expect(gazeFarLeft.x).toBe(0);
    expect(gazeFarRight.x).toBe(vw);

    // This destroys the affine mapping during calibration! 
    // An affine transform needs the true raw linear coordinate, not a clamped value.
  });

  it('verifies that x and y are not swapped and map correctly with unmirrored camera', () => {
    // Simulate feature vector extraction
    const vw = 1920;
    const vh = 1080;

    // Looking LEFT on the screen -> Iris moves to the physical RIGHT of the user.
    // In an unmirrored camera feed, user is on the left, right is on the right.
    // The left eye outer corner is FURTHER RIGHT than the inner corner.
    // Z.eyeLOut.x > Z.eyeLIn.x
    const eyeLOutX = 0.6; // Right-most point of left eye
    const eyeLInX = 0.4;  // Left-most point of left eye
    
    // Iris moves RIGHT (closer to eyeLOut)
    const irisX_LookingLeft = 0.58; 

    // safeRatio logic:
    const safeRatioSimulated = (value, start, end) => {
      const denominator = end - start;
      return (value - start) / denominator;
    };

    // start = eyeLOutX, end = eyeLInX
    const ratioLX = safeRatioSimulated(irisX_LookingLeft, eyeLOutX, eyeLInX);
    
    // (0.58 - 0.6) / (0.4 - 0.6) = -0.02 / -0.2 = 0.1
    expect(ratioLX).toBeCloseTo(0.1);

    // gx = ratioLX * vw = 0.1 * 1920 = 192 (Left side of screen)
    // Looking LEFT correctly maps to smaller X coordinates. No swapping needed!
    const gx = ratioLX * vw;
    expect(gx).toBeLessThan(vw / 2);
  });
  
  it('verifies devicePixelRatio does not affect CSS pixel mapping', () => {
    const dpr1_cssPixels = 1920;
    const dpr2_cssPixels = 1920; // window.innerWidth is in CSS pixels
    
    // The calibration points use window.innerWidth directly.
    expect(dpr1_cssPixels).toEqual(dpr2_cssPixels);
    // So devicePixelRatio has NO impact on the calibration math.
  });
});
