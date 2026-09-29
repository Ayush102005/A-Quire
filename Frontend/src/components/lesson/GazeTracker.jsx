import React from 'react';
import { useGaze } from '../../contexts/GazeProvider';
import { TrackingState } from '../../utils/gazeState';

export const GazeTracker = () => {
  const { trackingState, calibrate, stopTracking, startTracking, isTrackingEnabled } = useGaze();

  if (!isTrackingEnabled) {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-50 flex gap-2">
      {trackingState === TrackingState.CALIBRATION_REQUIRED && (
        <button
          onClick={calibrate}
          className="bg-orange-500 text-white px-3 py-1 rounded text-sm shadow hover:bg-orange-600"
        >
          Calibrate Gaze
        </button>
      )}
    </div>
  );
};
