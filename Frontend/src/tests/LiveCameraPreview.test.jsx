import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LiveCameraPreview from '../components/lesson/LiveCameraPreview';
import { TrackingState } from '../utils/gazeState';

describe('LiveCameraPreview', () => {
  // Props match the component's actual API (isTrackingEnabled/
  // onToggleTracking/onSimulateFixation/onSimulateInactivity) — this test
  // file previously used a stale prop set (onPauseTracking/
  // onDisableTracking/onTogglePreview) left over from before a refactor;
  // LessonPlayer.jsx's mobile call site had the exact same staleness bug
  // (fixed alongside this).
  const defaultProps = {
    stream: {},
    trackingState: TrackingState.TRACKING_ACTIVE,
    attentionState: 'UNKNOWN',
    isCalibrated: true,
    isTrackingEnabled: true,
    onToggleTracking: vi.fn(),
    onStartCalibration: vi.fn(),
    onSimulateFixation: vi.fn(),
    onSimulateInactivity: vi.fn(),
  };

  it('renders correctly when stream is provided', () => {
    render(<LiveCameraPreview {...defaultProps} />);
    expect(screen.getByText('Focus Tracking')).toBeInTheDocument();
    expect(screen.getByText('Tracking Active')).toBeInTheDocument();
  });

  it('hides calibrate button if already calibrated', () => {
    render(<LiveCameraPreview {...defaultProps} />);
    expect(screen.getByText('Calibration Complete')).toBeInTheDocument();
    expect(screen.queryByText('Calibrate Gaze')).not.toBeInTheDocument();
  });

  it('shows calibrate button if uncalibrated but face is visible', () => {
    render(
      <LiveCameraPreview
        {...defaultProps}
        isCalibrated={false}
        trackingState={TrackingState.CALIBRATION_REQUIRED}
      />
    );
    expect(screen.getByText('Calibrate Gaze')).toBeInTheDocument();
  });

  it('calls onToggleTracking when the toggle switch is clicked', () => {
    render(<LiveCameraPreview {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Toggle Focus Tracking'));
    expect(defaultProps.onToggleTracking).toHaveBeenCalled();
  });

  it('shows appropriate privacy labels', () => {
    render(<LiveCameraPreview {...defaultProps} />);
    expect(screen.getByText(/Local camera preview/i)).toBeInTheDocument();
    expect(screen.getByText(/Video is not recorded or uploaded/i)).toBeInTheDocument();
  });

  it('does not display Focused', () => {
    render(<LiveCameraPreview {...defaultProps} />);
    expect(screen.queryByText(/Focused/i)).not.toBeInTheDocument();
  });
});
