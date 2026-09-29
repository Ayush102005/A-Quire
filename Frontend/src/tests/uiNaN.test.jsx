import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { CalibrationOverlay } from '../components/CalibrationOverlay';
import { GazeCalibration } from '../utils/gazeCalibration';
import * as GazeProviderModule from '../contexts/GazeProvider';

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

describe('Calibration Data Integrity & UI Guardrails', () => {
  describe('GazeCalibration Math', () => {
    let calib;
    beforeEach(() => {
      calib = new GazeCalibration();
    });

    const makeRawGaze = (features) => ({
      features,
      horizontal: 0,
      vertical: 0,
      direction: { horizontal: 'center', vertical: 'center' },
      confidence: 1.0,
      isBlinking: false,
      isValid: true,
      timestamp: performance.now()
    });

    const fillTargets = (valFn) => {
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
        calib.currentTarget = { ...pt, settlingUntil: 0 };
        calib.currentTarget.appearTime = performance.now() - 1000;
        for (let i = 0; i < 15; i++) {
          valFn(pt);
        }
      }
    };

    test('1. fit with valid finite samples returns finite averageErrorPx', () => {
      fillTargets(pt => addTestSample(calib, makeRawGaze([pt.x/2000, pt.y/2000, 0, 0, 0, 0])));
      const res = calib.fit();
      expect(res.ok).toBe(true);
      expect(Number.isFinite(calib.diagnostics.averageErrorPx)).toBe(true);
    });

    test('2. invalid feature vectors are rejected', () => {
      calib.startCalibration([{ key: 'pt', index: 0, x: 100, y: 100 }]);
      calib.currentTarget = { key: 'pt', index: 0, x: 100, y: 100, settlingUntil: 0 };
      calib.currentTarget.appearTime = performance.now() - 1000;
      addTestSample(calib, { isValid: false });
      expect(calib.getStatus().sampleCount).toBe(0);
    });
    
    test('8. field names consumed by the UI match fit() output', () => {
      fillTargets(pt => addTestSample(calib, makeRawGaze([pt.x/2000, pt.y/2000, 0, 0, 0, 0])));
      calib.fit();
      expect(calib.diagnostics).toHaveProperty('averageErrorPx');
      expect(calib.diagnostics).toHaveProperty('allowedErrorPx');
    });
  });

  describe('UI Rendering', () => {
    test('9. UI never renders "NaNpx"', () => {
      vi.spyOn(GazeProviderModule, 'useGaze').mockReturnValue({
        calibration: {
            status: 'invalid',
            diagnostics: { averageErrorPx: NaN, allowedErrorPx: undefined },
            fit: vi.fn()
        },
        startCalibration: vi.fn(),
        resetCalibration: vi.fn(),
        setCalibrationTarget: vi.fn(),
        stream: null,
        rawGaze: null
      });

      render(<CalibrationOverlay />);

      expect(screen.queryByText(/NaNpx/i)).toBeNull();
      expect(screen.getByText('Calibration could not be evaluated')).toBeDefined();
      expect(screen.getByText('Reason: invalid calibration metric')).toBeDefined();
    });

    test('10. valid calibration renders a numeric px value', () => {
      vi.spyOn(GazeProviderModule, 'useGaze').mockReturnValue({
        calibration: {
            status: 'invalid',
            diagnostics: { averageErrorPx: 45.1, allowedErrorPx: 100 },
            fit: vi.fn()
        },
        startCalibration: vi.fn(),
        resetCalibration: vi.fn(),
        setCalibrationTarget: vi.fn(),
        stream: null,
        rawGaze: null
      });

      render(<CalibrationOverlay />);

      expect(screen.getByText('45px')).toBeDefined();
      expect(screen.getByText('below 100px')).toBeDefined();
    });
  });
});
