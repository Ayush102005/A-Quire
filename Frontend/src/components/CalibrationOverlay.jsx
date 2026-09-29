import React, { useEffect, useRef } from 'react';
import { useGaze } from '../contexts/GazeProvider';
import { TRACKER_MODE } from '../hooks/useGazeTracker';

const CALIBRATION_POINTS = [
  { key: 'top-left', index: 0, x: 0.1, y: 0.1 },
  { key: 'top-center', index: 1, x: 0.5, y: 0.1 },
  { key: 'top-right', index: 2, x: 0.9, y: 0.1 },
  { key: 'mid-left', index: 3, x: 0.1, y: 0.5 },
  { key: 'mid-center', index: 4, x: 0.5, y: 0.5 },
  { key: 'mid-right', index: 5, x: 0.9, y: 0.5 },
  { key: 'bot-left', index: 6, x: 0.1, y: 0.9 },
  { key: 'bot-center', index: 7, x: 0.5, y: 0.9 },
  { key: 'bot-right', index: 8, x: 0.9, y: 0.9 }
];

function finiteNumber(val) {
  if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) return null;
  return val;
}

function formatPx(val) {
  const num = finiteNumber(val);
  return num !== null ? `${Math.round(num)}px` : 'NaNpx';
}

export function CalibrationOverlay() {
  const {
    calibration,
    startCalibration,
    resetCalibration,
    stream,
    rawGaze,
    trackerMode,
    switchToLegacyTracking
  } = useGaze();

  const { status, diagnostics, snapshot } = calibration;
  const videoRef = useRef(null);

  // Belt-and-suspenders alongside useGazeTracker.js's own invariant effect:
  // legacy mode can never actually collect calibration samples (its tick
  // loop never touches the calibration controller), so if status somehow
  // still reads "collecting"/"fitting" while we're in legacy — a stray
  // render during the transition, or any path that flips trackerMode
  // without going through the normal reset — bail out rather than show a
  // dot that will never move past 0 samples.
  const stuckInLegacy = trackerMode === TRACKER_MODE.LEGACY && (status === 'collecting' || status === 'fitting');

  // Every hook this component calls must run on every render, in the same
  // order, regardless of `status`/`stuckInLegacy` — all early returns based
  // on those values live below, after every hook call. (An earlier version
  // of this fix put a `return null` here, before the video-stream effect
  // below it — since stuckInLegacy varies between renders, that skipped a
  // hook on some renders and not others: "Rendered fewer hooks than
  // expected.")
  useEffect(() => {
    if (stuckInLegacy) resetCalibration();
  }, [stuckInLegacy, resetCalibration]);

  // Bind video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, status]);

  if (stuckInLegacy) return null;

  // Initial trigger to start calibration from inside the overlay if it was mounted
  // But wait, the app currently calls startCalibration before rendering this?
  // Let's rely on useGazeTracker driving it, but we need to pass the array.
  // We'll call startCalibration(CALIBRATION_POINTS) when we want to retry.

  if (status === 'not_calibrated' || status === 'unsupported') return null;

  if (status === 'invalid') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
        <div className="bg-white text-black p-8 rounded-xl flex flex-col items-center max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2">Calibration needs improvement</h2>
          <div className="text-gray-600 mb-6 w-full bg-slate-100 p-4 rounded-lg text-sm text-left overflow-hidden">
            {diagnostics && (
              <>
                {finiteNumber(diagnostics.averageErrorPx) === null ? (
                  <>
                    <p><strong>Calibration could not be evaluated</strong></p>
                    <p>Reason: {diagnostics.error || "invalid calibration metric"}</p>
                  </>
                ) : (
                  <>
                    <p><strong>Average error:</strong> {formatPx(diagnostics.averageErrorPx)}</p>
                    <p><strong>Target:</strong> {finiteNumber(diagnostics.allowedErrorPx) === null ? "unavailable" : `below ${formatPx(diagnostics.allowedErrorPx)}`}</p>
                  </>
                )}
                {diagnostics.horizontalFeatureVariation && (() => {
                  const hv = diagnostics.horizontalFeatureVariation;
                  const fmt = (n) => (typeof n === 'number' && Number.isFinite(n)) ? n.toFixed(3) : 'n/a';
                  return (
                    <div className="mt-3 pt-3 border-t border-slate-300 font-mono text-xs">
                      <p className="font-sans font-bold not-italic mb-1">Feature signal diagnostic</p>
                      <p>left target median (L/R eye): {fmt(hv.leftTargetMedian?.leftEyeX)} / {fmt(hv.leftTargetMedian?.rightEyeX)}</p>
                      <p>center target median (L/R eye): {fmt(hv.centerTargetMedian?.leftEyeX)} / {fmt(hv.centerTargetMedian?.rightEyeX)}</p>
                      <p>right target median (L/R eye): {fmt(hv.rightTargetMedian?.leftEyeX)} / {fmt(hv.rightTargetMedian?.rightEyeX)}</p>
                      <p>left→right delta (L/R eye): {fmt(hv.leftToRightDelta?.leftEyeX)} / {fmt(hv.leftToRightDelta?.rightEyeX)}</p>
                      <p className="font-sans">
                        <strong>Both eyes agree on direction:</strong>{' '}
                        <span className={hv.sameDirection ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'}>
                          {hv.sameDirection ? 'YES' : 'NO'}
                        </span>
                      </p>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
          
          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={() => {
                const mapped = CALIBRATION_POINTS.map(pt => ({
                   ...pt,
                   x: pt.x * window.innerWidth,
                   y: pt.y * window.innerHeight
                }));
                startCalibration(mapped);
              }}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try again
            </button>
            <button
              onClick={switchToLegacyTracking}
              className="w-full px-6 py-3 border border-purple-300 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors font-medium"
              title="Simpler attention tracking (focused/distracted/confused) with no screen-position calibration needed — this is what a failed calibration already falls back to automatically; this lets you skip straight to it."
            >
              Use compatibility tracking instead
            </button>
            <button
              onClick={resetCalibration}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Continue without gaze tracking
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'calibrated') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none transition-opacity duration-1000 opacity-0" style={{ animation: 'fadeOut 2s forwards' }}>
        <style>{`
          @keyframes fadeOut {
            0% { opacity: 1; pointer-events: auto; }
            80% { opacity: 1; pointer-events: none; }
            100% { opacity: 0; pointer-events: none; }
          }
        `}</style>
        <div className="bg-white text-black p-8 rounded-xl flex flex-col items-center shadow-2xl">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/50">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Calibration Complete!</h2>
          <p className="mt-2 text-gray-600">Your gaze tracking is now active and ready.</p>
        </div>
      </div>
    );
  }

  if (status === 'fitting') {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
          <div className="text-white text-2xl font-bold animate-pulse">Calculating mapping...</div>
        </div>
      );
  }

  if (!snapshot || !snapshot.currentTarget) return null;

  const currentPt = snapshot.currentTarget;
  const currentPointIndex = snapshot.currentTargetIndex;
  
  // Note: we can't synchronously know if it's settling vs collecting in a React render without passing settlingUntil in the snapshot.
  // But we can approximate visual state by letting the controller's snapshot drive the dots.
  
  const isSettling = performance.now() < currentPt.settlingUntil;
  const samplesCollected = snapshot.sampleCount || 0;
  
  const isDebug = import.meta.env.VITE_GAZE_DEBUG_LOGS === "true";

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/90 pointer-events-auto flex items-center justify-center overflow-hidden">
      <div className="absolute top-8 text-center w-full text-white pointer-events-none select-none">
        <h2 className="text-3xl font-bold mb-2">Look at the dot</h2>
        <p className="text-slate-300">Keep your head still and follow the dot with your eyes.</p>
        <div className="mt-4 flex gap-2 justify-center">
          {CALIBRATION_POINTS.map((_, i) => (
            <div key={i} className={`h-2 w-8 rounded-full transition-colors ${i < currentPointIndex ? 'bg-green-500' : i === currentPointIndex ? 'bg-blue-500' : 'bg-slate-700'}`} />
          ))}
        </div>
        
        {isDebug && rawGaze && (
            <div className="mt-4 text-xs font-mono bg-black/50 p-2 rounded inline-block text-left">
                <div>Samples overall: {samplesCollected}</div>
                <div>Completed Targets: {snapshot.completedTargetCount} / 9</div>
                <div>Dir: {rawGaze.direction?.horizontal} / {rawGaze.direction?.vertical}</div>
                <div>Blinking: {rawGaze.isBlinking ? "YES" : "NO"}</div>
                <div>Valid: {rawGaze.isValid ? "YES" : "NO"}</div>
            </div>
        )}
      </div>
      
      {stream && (
        <div className="absolute bottom-4 right-4 w-48 rounded-lg overflow-hidden border-2 border-slate-700 shadow-xl pointer-events-none">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-auto object-cover transform scale-x-[-1]"
          />
          <div className="absolute top-1 right-2 text-[10px] text-white font-mono bg-black/60 px-1 rounded">
            Live Feed
          </div>
        </div>
      )}

      <button 
        onClick={resetCalibration}
        className="absolute top-8 right-8 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors pointer-events-auto"
      >
        Cancel
      </button>

      {/* The moving target */}
      <div 
        className="absolute w-8 h-8 rounded-full transition-all duration-300 ease-in-out"
        style={{
          left: `${currentPt.x}px`,
          top: `${currentPt.y}px`,
          transform: 'translate(-50%, -50%)',
          backgroundColor: isSettling ? '#ef4444' : '#3b82f6', // red -> blue
          boxShadow: `0 0 20px ${isSettling ? '#ef4444' : '#3b82f6'}`,
        }}
      >
        {!isSettling && (
          <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75" />
        )}
      </div>
    </div>
  );
}
