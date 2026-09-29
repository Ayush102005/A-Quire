import { expect, test, describe, beforeEach } from 'vitest';
import { GazeCalibration } from '../utils/gazeCalibration';

describe('gazeCalibration validation', () => {
  let calib;

  beforeEach(() => {
    calib = new GazeCalibration();
  });

  const generateSamplesForTarget = (targetX, targetY, noise = 0, count = 15) => {
    const target = calib.currentTarget;
    if (!target) return;
    
    for (let i = 0; i < count; i++) {
      const f0 = targetX + noise;
      const f1 = targetX + noise;
      const f2 = targetY + noise;
      const f3 = targetY + noise;
      
      calib.addSample({
          targetKey: target.key,
          targetX: target.x,
          targetY: target.y,
          pointIndex: target.index,
          features: [f0, f1, f2, f3, 0, 0],
          isValid: true,
          isBlinking: false,
          confidence: 1.0,
          timestamp: performance.now()
      });
    }
    
    if (calib.isTargetComplete(target.key)) {
        calib.advanceTarget();
    }
  };

  test('each target requires at least 15 samples', () => {
    // test mock array
        const _targets = [
      { key: '100-100', index: 0, x: 100, y: 100 },
      { key: '500-100', index: 1, x: 500, y: 100 },
      { key: '900-100', index: 2, x: 900, y: 100 },
      { key: '100-500', index: 3, x: 100, y: 500 },
      { key: '500-500', index: 4, x: 500, y: 500 },
      { key: '900-500', index: 5, x: 900, y: 500 },
      { key: '100-900', index: 6, x: 100, y: 900 },
      { key: '500-900', index: 7, x: 500, y: 900 },
      { key: '900-900', index: 8, x: 900, y: 900 }
    ];
    calib.startCalibration(_targets);
    generateSamplesForTarget(100, 100, 0, 15);
    generateSamplesForTarget(500, 100, 0, 15);
    generateSamplesForTarget(900, 100, 0, 15);
    generateSamplesForTarget(100, 500, 0, 15);
    generateSamplesForTarget(500, 500, 0, 15);
    generateSamplesForTarget(900, 500, 0, 15);
    generateSamplesForTarget(100, 900, 0, 15);
    generateSamplesForTarget(500, 900, 0, 15);
    generateSamplesForTarget(900, 900, 0, 14); // 14 samples!

    const success = calib.fit();
    expect(success.ok).toBe(false);
    expect(calib.diagnostics.error).toContain('Not enough valid targets');
  });

  test('clean synthetic data passes calibration', () => {
    // test mock array
        const _targets = [
      { key: '100-100', index: 0, x: 100, y: 100 },
      { key: '500-100', index: 1, x: 500, y: 100 },
      { key: '900-100', index: 2, x: 900, y: 100 },
      { key: '100-500', index: 3, x: 100, y: 500 },
      { key: '500-500', index: 4, x: 500, y: 500 },
      { key: '900-500', index: 5, x: 900, y: 500 },
      { key: '100-900', index: 6, x: 100, y: 900 },
      { key: '500-900', index: 7, x: 500, y: 900 },
      { key: '900-900', index: 8, x: 900, y: 900 }
    ];
    calib.startCalibration(_targets);
    generateSamplesForTarget(100, 100, 0.0, 15);
    generateSamplesForTarget(500, 100, 0.0, 15);
    generateSamplesForTarget(900, 100, 0.0, 15);
    generateSamplesForTarget(100, 500, 0.0, 15);
    generateSamplesForTarget(500, 500, 0.0, 15);
    generateSamplesForTarget(900, 500, 0.0, 15);
    generateSamplesForTarget(100, 900, 0.0, 15);
    generateSamplesForTarget(500, 900, 0.0, 15);
    generateSamplesForTarget(900, 900, 0.0, 15);

    const success = calib.fit();
    expect(success.ok).toBe(true);
    expect(calib.getStatus().status).toBe('calibrated');
    expect(calib.diagnostics.averageErrorPx).toBeLessThan(calib.diagnostics.allowedErrorPx);
  });

  test('noisy synthetic data fails calibration', () => {
    // test mock array
        const _targets = [
      { key: '100-100', index: 0, x: 100, y: 100 },
      { key: '500-100', index: 1, x: 500, y: 100 },
      { key: '900-100', index: 2, x: 900, y: 100 },
      { key: '100-500', index: 3, x: 100, y: 500 },
      { key: '500-500', index: 4, x: 500, y: 500 },
      { key: '900-500', index: 5, x: 900, y: 500 },
      { key: '100-900', index: 6, x: 100, y: 900 },
      { key: '500-900', index: 7, x: 500, y: 900 },
      { key: '900-900', index: 8, x: 900, y: 900 }
    ];
    calib.startCalibration(_targets);
    const targets = [
      [100, 100], [500, 100], [900, 100],
      [100, 500], [500, 500], [900, 500],
      [100, 900], [500, 900], [900, 900]
    ];
    for (const [tx, ty] of targets) {
      const target = calib.currentTarget;
      for (let i = 0; i < 15; i++) {
        calib.addSample({
            targetKey: target.key,
            targetX: target.x,
            targetY: target.y,
            pointIndex: target.index,
            features: [0.5, 0.5, 0.5, 0.5, 0, 0], // Constant features mean it cannot fit the 9 distinct points well
            isValid: true,
            isBlinking: false,
            confidence: 1.0,
            timestamp: performance.now()
        });
      }
      calib.advanceTarget();
    }
    const success = calib.fit();
    expect(success.ok).toBe(false);
    expect(calib.getStatus().status).toBe('invalid');
  });
});