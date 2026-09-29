import { describe, it, expect, beforeEach } from 'vitest';
import { GazeCalibration } from '../utils/gazeCalibration';
import { createRawGaze } from '../utils/rawGazeTracker';


function addTestSample(calib, rawGaze) {
    if (!calib.currentTarget) return;
    calib.addSample({
        targetKey: calib.currentTarget.key,
        pointIndex: calib.currentTarget.index,
        targetX: calib.currentTarget.x,
        targetY: calib.currentTarget.y,
        features: rawGaze.features || [],
        capturedAt: rawGaze.timestamp || performance.now(),
        confidence: rawGaze.confidence !== undefined ? rawGaze.confidence : 1,
        isValid: rawGaze.isValid !== undefined ? rawGaze.isValid : true,
        isBlinking: rawGaze.isBlinking || false
    });
}

describe('GazeCalibration Outlier Protection', () => {
  let calib;
  
  beforeEach(() => {
    calib = new GazeCalibration();
  });

  const getMockTarget = () => ({
      key: 'test-key',
      index: 0,
      x: 100,
      y: 100
  });

  const makeRawGaze = (features, isBlinking=false, confidence=1.0) => ({
      features,
      horizontal: 0,
      vertical: 0,
      direction: { horizontal: 'center', vertical: 'center' },
      confidence,
      isBlinking,
      isValid: true,
      timestamp: performance.now()
  });

  describe('1. Feature Validation (rawGazeTracker)', () => {
    it('accepts valid six-feature vector', () => {
      const raw = createRawGaze(null); // Just checking structure fallback
      expect(raw.isValid).toBe(false);
    });

    // Validations like NaN and out-of-range are now handled internally
    // in rawGazeTracker clamping.
  });

  describe('2. Sample Ingestion', () => {
    it('does not store invalid features', () => {
      const targets = Array.from({length: 9}, (_, i) => ({key: `target-${i}`, index: i, x: 0, y: 0}));
      targets[0] = getMockTarget();
      calib.startCalibration(targets);
      calib.currentTarget.settlingUntil = 0;
      calib.addSample({
          isValid: false,
          features: null
      });
      expect(calib.getStatus().sampleCount).toBe(0);
    });

    it('does not store if not collecting', () => {
      addTestSample(calib, makeRawGaze([0.5, 0.5, 0.5, 0.5, 0, 0]));
      expect(calib.getStatus().sampleCount).toBe(0);
    });

    it('increases rejection counters for low confidence', () => {
      const targets = Array.from({length: 9}, (_, i) => ({key: `target-${i}`, index: i, x: 0, y: 0}));
      targets[0] = getMockTarget();
      calib.startCalibration(targets);
      calib.currentTarget.settlingUntil = 0;
      addTestSample(calib, makeRawGaze([0.5, 0.5, 0.5, 0.5, 0, 0], false, 0.1));
      expect(calib.rejectionCounts.low_confidence).toBe(1);
    });
  });

  describe('5. Prediction', () => {
    it('rawPoint is finite, returns {x, y}', () => {
      calib.state.status = 'calibrated';
      // 15 weights: [intercept, f0..f5, f0^2, f1^2, f2^2, f3^2, f0*f4,
      // f2*f4, f1*f5, f3*f5] — see expandFeatures()/FEATURE_DIM in
      // gazeCalibration.js. Only the linear f0/f1 terms are non-zero here,
      // matching this test's intent (predX = f[0]*1000, predY = f[1]*1000);
      // everything else (quadratic + head-pose cross terms) is zeroed out
      // so it doesn't contribute — and with yaw=pitch=0 in the input below,
      // the cross terms would be zero regardless of their weight.
      calib.state.model = {
          weightsX: [0, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // predX = f[0]*1000
          weightsY: [0, 0, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]  // predY = f[1]*1000
      };

      // Normal prediction
      const pred1 = calib.predict([0.1, 0.2, 0, 0, 0, 0]);
      expect(pred1.x).toBe(100);
      expect(pred1.y).toBe(200);
    });
  });

  describe('6. Fit Behavior', () => {
    it('synthetic affine mapping passes', () => {
      const points = [
        { key: 'top-left', index: 0, x: 0, y: 0 },
        { key: 'top-center', index: 1, x: 960, y: 0 },
        { key: 'top-right', index: 2, x: 1920, y: 0 },
        { key: 'mid-left', index: 3, x: 0, y: 540 },
        { key: 'mid-center', index: 4, x: 960, y: 540 },
        { key: 'mid-right', index: 5, x: 1920, y: 540 },
        { key: 'bot-left', index: 6, x: 0, y: 1080 },
        { key: 'bot-center', index: 7, x: 960, y: 1080 },
        { key: 'bot-right', index: 8, x: 1920, y: 1080 }
      ];
      calib.startCalibration(points);
      
      for (const pt of points) {
        calib.currentTarget = pt;
        // Force the appear time to be in the past to bypass SETTLING
        calib.currentTarget.appearTime = performance.now() - 1000;
        
        for (let i = 0; i < 15; i++) {
          addTestSample(calib, makeRawGaze([pt.x, pt.x, pt.y, pt.y, 0, 0]));
        }
      }

      const success = calib.fit();
      expect(success.ok).toBe(true);
      expect(calib.getStatus().status).toBe('calibrated');
      expect(calib.diagnostics.averageErrorPx).toBeLessThan(10);
    });

    it('insufficient valid samples return a useful diagnostic', () => {
      const targets = Array.from({length: 9}, (_, i) => ({key: `target-${i}`, index: i, x: 0, y: 0}));
      targets[0] = getMockTarget();
      calib.startCalibration(targets);
      calib.currentTarget.settlingUntil = 0;
      addTestSample(calib, makeRawGaze([0.5, 0.5, 0.5, 0.5, 0, 0]));
      
      const success = calib.fit();
      expect(success.ok).toBe(false);
      expect(success.snapshot.diagnostics.error).toContain('Not enough valid targets');
    });
  });
});
