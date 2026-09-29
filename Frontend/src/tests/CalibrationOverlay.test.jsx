import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { CalibrationOverlay } from '../components/CalibrationOverlay';
import * as GazeProviderModule from '../contexts/GazeProvider';

describe('CalibrationOverlay', () => {
  let mockUseGaze;

  beforeEach(() => {
    mockUseGaze = {
      calibration: {
          status: 'invalid',
          diagnostics: { error: 'Test error', averageErrorPx: 500, allowedErrorPx: 100 },
          fit: vi.fn()
      },
      startCalibration: vi.fn(),
      resetCalibration: vi.fn(),
      setCalibrationTarget: vi.fn(),
      stopCalibration: vi.fn(),
      stream: null,
      rawGaze: null
    };
    vi.spyOn(GazeProviderModule, 'useGaze').mockReturnValue(mockUseGaze);
  });

  test('failed calibration displays Try again and Continue without gaze tracking', () => {
    render(<CalibrationOverlay />);
    expect(screen.getByText(/Try again/i)).toBeDefined();
    expect(screen.getByText(/Continue without gaze tracking/i)).toBeDefined();
  });

  test('Continue without gaze tracking triggers resetCalibration', () => {
    render(<CalibrationOverlay />);
    fireEvent.click(screen.getByText(/Continue without gaze tracking/i));
    expect(mockUseGaze.resetCalibration).toHaveBeenCalled();
  });

  test('Try again triggers startCalibration', () => {
    render(<CalibrationOverlay />);
    fireEvent.click(screen.getByText(/Try again/i));
    expect(mockUseGaze.startCalibration).toHaveBeenCalled();
  });
});
