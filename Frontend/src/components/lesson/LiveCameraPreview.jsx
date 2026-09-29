import React, { useEffect, useRef, useState } from 'react';
import { TrackingState } from '../../utils/gazeState';
import { Camera, TriangleAlert, Target } from 'lucide-react';

export default function LiveCameraPreview({
  stream,
  trackingState,
  attentionState,
  isCalibrated,
  isTrackingEnabled,
  onToggleTracking,
  onStartCalibration,
  onSimulateFixation,
  onSimulateInactivity
}) {
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
      setVideoReady(false);
    }
  }, [stream]);

  const handleLoadedMetadata = () => {
    if (videoRef.current?.videoWidth > 0 && videoRef.current?.videoHeight > 0) {
      setVideoReady(true);
    }
  };

  const isUnsupported = trackingState === TrackingState.ERROR || trackingState === TrackingState.FACE_NOT_VISIBLE;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 mb-4 flex flex-col gap-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-stone-900 dark:text-stone-100">Focus Tracking</span>
            <span className="text-xs text-stone-500">Privacy-first local AI</span>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={onToggleTracking}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${isTrackingEnabled ? 'bg-[#487a56]' : 'bg-stone-300 dark:bg-stone-700'}`}
          aria-label="Toggle Focus Tracking"
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTrackingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Privacy disclosure — webcam access deserves an explicit, always-visible
          reminder of what does (and doesn't) happen with the video, not just
          the one-word "Privacy-first" tagline above. */}
      <p className="text-[11px] text-stone-400 dark:text-stone-500 -mt-2">
        Local camera preview — video is not recorded or uploaded; only derived attention signals leave your device.
      </p>

      {/* Status Row */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isTrackingEnabled ? (trackingState === TrackingState.TRACKING_ACTIVE ? 'bg-green-500' : 'bg-orange-500') : 'bg-stone-400'}`} />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            {isTrackingEnabled 
              ? (trackingState === TrackingState.TRACKING_ACTIVE ? 'Tracking Active' : (trackingState === TrackingState.TRACKING_OFF ? 'Starting...' : 'Camera Status')) 
              : 'Off'}
          </span>
        </div>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 underline"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>

      {/* Details Row */}
      {showDetails && (
        <div className="flex flex-col xl:flex-row gap-4 pt-2">
          
          {/* Camera View */}
          <div className="relative w-full xl:w-32 h-32 xl:h-24 bg-stone-200 dark:bg-stone-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
            {(!stream || !isTrackingEnabled) && (
              <Camera className="w-8 h-8 text-stone-400 opacity-50" />
            )}
            <video
               ref={videoRef}
               autoPlay
               muted
               playsInline
               onLoadedMetadata={handleLoadedMetadata}
               className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${videoReady && stream && isTrackingEnabled ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
            />
            {/* N/A Pill */}
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
               <div className={`w-1.5 h-1.5 rounded-full ${attentionState === 'ON_LESSON' ? 'bg-green-400' : (attentionState === 'OFF_LESSON' ? 'bg-red-400' : 'bg-stone-400')}`} />
               {attentionState || 'N/A'}
            </div>
          </div>

          {/* Controls Column */}
          <div className="flex flex-col flex-1 gap-2">
            {isUnsupported ? (
              <div className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-3 py-1.5 text-xs rounded-md border border-stone-200 dark:border-stone-700 flex gap-2 items-center">
                <TriangleAlert className="w-4 h-4 shrink-0 text-amber-500" />
                Gaze tracking unsupported. Fallback to behavior only.
              </div>
            ) : null}

            <div className="flex gap-2">
              <button 
                onClick={onSimulateFixation}
                disabled={!isTrackingEnabled}
                className="flex-1 bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-md py-1.5 text-xs font-medium hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simulate Fixation
              </button>
              <button 
                onClick={onSimulateInactivity}
                disabled={!isTrackingEnabled}
                className="flex-1 bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-md py-1.5 text-xs font-medium hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simulate Inactivity
              </button>
            </div>

            <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md px-3 py-1.5 text-xs text-stone-500 dark:text-stone-400 flex items-center">
              {isCalibrated ? 'Calibrated' : 'Uncalibrated'}
            </div>

            <button 
              onClick={onStartCalibration}
              disabled={!isTrackingEnabled || isCalibrated}
              className="bg-[#487a56] hover:bg-[#3d6948] disabled:bg-stone-300 disabled:text-stone-500 text-white py-2 rounded-md font-medium flex items-center justify-center gap-2 w-full transition-colors mt-1"
            >
              <Target className="w-4 h-4" />
              {isCalibrated ? 'Calibration Complete' : 'Calibrate Gaze'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
