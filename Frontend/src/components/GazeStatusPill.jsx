import React from 'react';
import { TrackingState, AttentionState } from '../utils/gazeState';
import { Eye, EyeOff, AlertCircle, Maximize, AlertTriangle, MonitorX, CameraOff, RefreshCw, Smartphone } from 'lucide-react';
import { useGaze } from '../contexts/GazeProvider';

export const GazeStatusPill = ({ 
  className,
  trackingState: propTrackingState, 
  attentionState: propAttentionState, 
  isTrackingEnabled: propIsTrackingEnabled,
  onEnableTracking: propOnEnableTracking,
  onCalibrate: propOnCalibrate,
  trackerHealth: propTrackerHealth,
  trackerMode: propTrackerMode,
  retryTracking: propRetryTracking,
  isActive, // Legacy
  quality, // Legacy
  onRetry // Legacy
}) => {
  const gaze = useGaze();

  const trackingState = propTrackingState !== undefined ? propTrackingState : gaze.trackingState;
  const attentionState = propAttentionState !== undefined ? propAttentionState : gaze.attentionState;
  const isTrackingEnabled = propIsTrackingEnabled !== undefined ? propIsTrackingEnabled : (isActive !== undefined ? isActive : gaze.isTracking);
  const detectedObjects = gaze.detectedObjects || [];
  const onEnableTracking = propOnEnableTracking !== undefined ? propOnEnableTracking : (gaze.requestTracking || gaze.startTracking);
  const onCalibrate = propOnCalibrate !== undefined ? propOnCalibrate : gaze.startCalibration;
  const trackerHealth = propTrackerHealth !== undefined ? propTrackerHealth : gaze.trackerHealth;
  const trackerMode = propTrackerMode !== undefined ? propTrackerMode : gaze.trackerMode;
  const retryTracking = propRetryTracking !== undefined ? propRetryTracking : (onRetry !== undefined ? onRetry : gaze.retryTracking);


  // 1. Failed / Unavailable
  if (trackerMode === 'unavailable' || trackerHealth?.status === 'failed') {
    return (
        <button 
          onClick={retryTracking}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 font-medium rounded-full hover:bg-red-200 transition-colors"
          title={trackerHealth?.fallbackReason ? `Error: ${trackerHealth.fallbackReason}` : 'Error'}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Failed: {trackerHealth?.fallbackReason || 'Unknown error'}</span>
          <RefreshCw className="w-3 h-3 ml-1" />
        </button>
    );
  }

  // 2. Tracking disabled / stopped
  if (!isTrackingEnabled || trackerHealth?.status === 'stopped' || trackerHealth?.status === 'idle') {
    return (
      <button 
        onClick={onEnableTracking}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors bg-white hover:bg-stone-50 text-stone-700 border-stone-200 shadow-sm"
      >
        <EyeOff className="w-4 h-4 text-stone-400" />
        <span>Enable focus tracking</span>
      </button>
    );
  }

  const modeSuffix = trackerMode === 'legacy' ? ' (Legacy)' : '';
  let label = `Gaze tracking active${modeSuffix}`;
  let Icon = Eye;
  let colorClass = 'bg-blue-50 text-blue-600 border-blue-200';
  let isInteractive = false;
  let onClick = undefined;

  // Legacy fallback UI — the reason the "new" tracker gave up used to be
  // visible only as a title="" tooltip (hover-only, invisible in a
  // screenshot) or buried in the console. Surfacing it directly on screen
  // here so it's actually reportable without opening devtools.
  if (trackerMode === 'legacy') {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors bg-purple-50 text-purple-700 border-purple-200 shadow-sm"
          title={trackerHealth?.fallbackReason ? `Fell back to compatibility tracking: ${trackerHealth.fallbackReason}` : 'Compatibility attention tracking active. Gaze cursor calibration is unavailable in this mode.'}
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Compatibility tracking active</span>
          <span className="sm:hidden">Legacy tracking</span>
        </div>
        {trackerHealth?.fallbackReason && (
          // Deliberately NOT truncated — the whole point of surfacing this
          // is to be screenshot-able. A truncated diagnostic string (e.g.
          // "startup_health_check_failed (detectCalls=142, facesFound=0,
          // ...") that cuts off exactly the numbers that matter defeats the
          // purpose. Wraps instead of overflowing the toolbar.
          <span className="text-xs text-[var(--text-faint)] font-mono whitespace-normal break-words max-w-md">
            reason: {trackerHealth.fallbackReason}
          </span>
        )}
      </div>
    );
  }

  // 3. Starting — trackerHealth.status and trackingState are two
  // independently-computed signals (the raw startup health-check vs. the
  // GazeStateMachine's own, separate confirmation timers) that don't always
  // update in lockstep: trackingState can reach TRACKING_ACTIVE well before
  // trackerHealth.status finishes its own (slower, stricter) health check —
  // LiveCameraPreview only reads trackingState, so it correctly shows
  // "Tracking Active" while this pill, checking trackerHealth.status first,
  // kept showing a stale "Starting..." underneath it. TRACKING_ACTIVE is
  // the more specific, more current signal here, so it wins.
  if (
    (trackerHealth?.status === 'starting' && trackingState !== TrackingState.TRACKING_ACTIVE) ||
    trackingState === TrackingState.INITIALIZING
  ) {
    label = `Starting gaze tracking...${modeSuffix}`;
    Icon = Eye;
    colorClass = 'bg-blue-50 text-blue-600 border-blue-200 opacity-75';
  } 
  // 4. Degraded
  else if (trackerHealth?.status === 'degraded' || trackingState === TrackingState.LOW_CONFIDENCE) {
    label = `Gaze tracking signal is unstable${modeSuffix}`;
    Icon = AlertCircle;
    colorClass = 'bg-yellow-50 text-yellow-600 border-yellow-200';
  }
  // 5. Calibration required
  else if (trackingState === TrackingState.CALIBRATION_REQUIRED) {
    label = `Calibrate tracking${modeSuffix}`;
    Icon = Maximize;
    colorClass = 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 cursor-pointer shadow-sm';
    isInteractive = true;
    onClick = onCalibrate;
  } 
  // 6. Healthy / Active
  else if (trackerHealth?.status === 'healthy' || trackingState === TrackingState.TRACKING_ACTIVE) {
    if (detectedObjects.length > 0) {
      label = `Distraction detected: ${detectedObjects.join(', ')}${modeSuffix}`;
      Icon = Smartphone;
      colorClass = 'bg-red-100 text-red-800 border-red-300';
    } else if (attentionState === AttentionState.FIXATED) {
      // Previously unreachable: AttentionState.FIXATED didn't exist as a
      // real value (see gazeState.js), so this branch never matched even
      // when a fixation episode was correctly detected and had already
      // fired a struggle event server-side — the pill silently kept
      // showing "Looking at lesson"/"Looking away" underneath, with zero
      // visible confirmation anything happened.
      label = `Possible confusion detected${modeSuffix}`;
      Icon = AlertCircle;
      colorClass = 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (attentionState === AttentionState.ON_LESSON) {
      label = `Gaze tracking active · Looking at lesson${modeSuffix}`;
      Icon = Eye;
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (attentionState === AttentionState.OFF_LESSON) {
      label = `Gaze tracking active · Looking away${modeSuffix}`;
      Icon = MonitorX;
      colorClass = 'bg-stone-100 text-stone-600 border-stone-200';
    } else {
      label = `Gaze tracking active${modeSuffix}`;
      Icon = Eye;
      colorClass = 'bg-blue-50 text-blue-600 border-blue-200';
    }
  }

  if (isInteractive) {
    return (
      <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${colorClass}`}
      >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${colorClass}`}>
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
  );
};

export default GazeStatusPill;
