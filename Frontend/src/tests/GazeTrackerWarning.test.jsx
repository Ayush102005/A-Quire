import React from 'react';
import { render, act } from '@testing-library/react';
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

test('GazeTracker rendering does not trigger GazeProvider state updates', () => {
  const TestWrapper = () => {
    return (
      <GazeProvider>
        <GazeTracker />
      </GazeProvider>
    );
  };

  render(<TestWrapper />);
  
  // Wait a moment for effects
  act(() => {
    vi.useFakeTimers();
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();
  });
});
