import React, { useState } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { GazeProvider } from '../contexts/GazeProvider';
import GazeTracker from '../components/lesson/GazeTracker';

// Force tracing
import.meta.env.VITE_GAZE_DEBUG_LOGS = 'true';

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Cannot update a component')) {
    originalError(...args);
    throw new Error('REACT WARNING: ' + args[0]);
  }
};

const Wrapper = () => {
  return (
    <GazeProvider>
      <GazeTracker isPaused={false} onFixation={() => {}} onInactivity={() => {}} />
    </GazeProvider>
  );
};

test('Calibration flow test to trigger warning', async () => {
  vi.useFakeTimers();

  const { unmount } = render(<Wrapper />);
  
  // Wait for initial render and effects
  act(() => {
    vi.advanceTimersByTime(100);
  });

  // Mock getCalibrationQuality so it returns something
  // Wait, the warning is supposedly triggered during the interval inside CalibrationOverlay!
  // GazeTracker renders CalibrationOverlay when showCalibration is true.
  // showCalibration is set to true when "Calibrate" button is clicked in GazeTracker.
  // But wait, the Calibrate button only appears when calibration is needed!
  // Let's just directly render CalibrationOverlay inside GazeProvider.

  unmount();
  vi.useRealTimers();
});
