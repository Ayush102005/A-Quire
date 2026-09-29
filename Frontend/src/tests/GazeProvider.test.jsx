import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GazeProvider } from '../contexts/GazeProvider';
import { useGaze } from '../contexts/useGaze';
import { useGazeTracker } from '../hooks/useGazeTracker';

vi.mock('../hooks/useGazeTracker');

// A simple test component to consume the context
const TestComponent = () => {
  const gaze = useGaze();
  return (
    <div>
      <div data-testid="is-active">{gaze.isActive.toString()}</div>
      <div data-testid="gaze-quality">{gaze.gazeQuality}</div>
      <button onClick={() => gaze.setIsActive(true)}>Enable</button>
      <button onClick={() => gaze.setIsActive(false)}>Disable</button>
    </div>
  );
};

describe('GazeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children successfully', () => {
    useGazeTracker.mockReturnValue({
      gazeReady: true,
      gazeQuality: 'good',
      stream: null,
      struggleScore: 0,
      fixationDurationMs: 0,
      gazeOffScreenMs: 0,
      resetMetrics: vi.fn(),
    });

    render(
      <GazeProvider>
        <div data-testid="child">Child Content</div>
      </GazeProvider>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Child Content');
  });

  it('maintains active state when camera permission is granted/quality is good', () => {
    useGazeTracker.mockReturnValue({
      gazeReady: true,
      gazeQuality: 'good',
      stream: {},
      struggleScore: 0,
      fixationDurationMs: 0,
      gazeOffScreenMs: 0,
      resetMetrics: vi.fn(),
    });

    render(
      <GazeProvider>
        <TestComponent />
      </GazeProvider>
    );

    act(() => {
      screen.getByText('Enable').click();
    });

    expect(screen.getByTestId('is-active')).toHaveTextContent('true');
    expect(screen.getByTestId('gaze-quality')).toHaveTextContent('good');
  });

  it('turns off automatically when camera permission is denied (gazeQuality unavailable)', () => {
    // The auto-kill effect only fires after the engine was briefly ready
    // (avoids killing gaze mid-initialization) — simulate that real
    // ready-then-lost transition rather than starting already-unavailable.
    useGazeTracker.mockReturnValue({
      gazeReady: true,
      gazeQuality: 'good',
      stream: null,
      struggleScore: 0,
      fixationDurationMs: 0,
      gazeOffScreenMs: 0,
      resetMetrics: vi.fn(),
    });

    const { rerender } = render(
      <GazeProvider>
        <TestComponent />
      </GazeProvider>
    );

    act(() => {
      screen.getByText('Enable').click();
    });
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');

    useGazeTracker.mockReturnValue({
      gazeReady: false,
      gazeQuality: 'unavailable',
      stream: null,
      struggleScore: 0,
      fixationDurationMs: 0,
      gazeOffScreenMs: 0,
      resetMetrics: vi.fn(),
    });

    act(() => {
      rerender(
        <GazeProvider>
          <TestComponent />
        </GazeProvider>
      );
    });

    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    expect(screen.getByTestId('gaze-quality')).toHaveTextContent('unavailable');
  });
});
