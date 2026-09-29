import React, { useEffect, useState, useRef } from 'react';
import { useGaze } from '../contexts/GazeProvider';

const CALIBRATION_POINTS = [
  { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
  { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 },
  { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 }
];

const SAMPLES_PER_POINT = 15;
const SETTLE_DELAY_MS = 800; // time to wait before collecting samples

const FEATURE_SCALES = [1.5, 1.5, 1.5, 1.5, 4.0, 4.0];

function normalizedFeatureDistance(a, b) {
  return Math.sqrt(
    a.reduce((sum, value, index) => {
      const d = (value - b[index]) / FEATURE_SCALES[index];
      return sum + d * d;
    }, 0)
  );
}

// Distance threshold for an extreme sample compared to the median.
// Using a relatively loose threshold here to only drop clear outliers
const OUTLIER_DISTANCE_THRESHOLD = 1.0; 

export function CalibrationOverlay() {
  const {
    calibrationPhase,
    calibrationPoint,
    setCalibrationPoint,
    submitValidatedSamples,
    startCalibration,
    finishCalibration,
    cancelCalibration,
    calibrationError,
    calibrationDiagnostics,
    debugFeatures,
    stream
  } = useGaze();

  const [samplesCollected, setSamplesCollected] = useState(0);
  const samplesCollectedRef = useRef(0);
  const rawSamplesBufferRef = useRef([]);
  const [isSettling, setIsSettling] = useState(true);
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  
  // Track the previously seen debugFeatures array to avoid duplicate rapid sampling
  // if MediaPipe hasn't updated its output
  const lastDebugFeaturesRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, calibrationPhase]);

  useEffect(() => {
    if (calibrationPhase !== 'calibrating') return;

    // Reset for the new point
    setSamplesCollected(0);
    samplesCollectedRef.current = 0;
    rawSamplesBufferRef.current = [];
    lastDebugFeaturesRef.current = null;
    setIsSettling(true);

    timerRef.current = setTimeout(() => {
      setIsSettling(false);
    }, SETTLE_DELAY_MS);

    return () => clearTimeout(timerRef.current);
  }, [calibrationPoint, calibrationPhase]);

  useEffect(() => {
    if (calibrationPhase !== 'calibrating' || isSettling) return;

    let loopId;
    const sampleLoop = () => {
      // Don't keep collecting if we've already reached the target and are waiting for React to re-render
      if (samplesCollectedRef.current >= SAMPLES_PER_POINT) {
        loopId = requestAnimationFrame(sampleLoop);
        return;
      }

      if (debugFeatures && debugFeatures !== lastDebugFeaturesRef.current) {
        // Only collect genuinely new feature arrays
        lastDebugFeaturesRef.current = debugFeatures;
        
        // Copy the features so mutations outside don't affect our buffer
        rawSamplesBufferRef.current.push([...debugFeatures]);
        const currentBuffer = rawSamplesBufferRef.current;

        if (currentBuffer.length >= SAMPLES_PER_POINT) {
          // Calculate coordinate-wise median
          const median = [];
          for (let i = 0; i < 6; i++) {
            const vals = currentBuffer.map(s => s[i]).sort((a, b) => a - b);
            median.push(vals[Math.floor(vals.length / 2)]);
          }

          // Calculate distance from median and remove clearly extreme samples
          const validSamples = currentBuffer.filter(s => {
            const dist = normalizedFeatureDistance(s, median);
            return dist < OUTLIER_DISTANCE_THRESHOLD;
          });

          // Check if we still have at least 15 real valid samples
          if (validSamples.length >= SAMPLES_PER_POINT) {
            const pt = CALIBRATION_POINTS[calibrationPoint];
            const absX = pt.x * window.innerWidth;
            const absY = pt.y * window.innerHeight;

            const finalSamples = validSamples.slice(0, SAMPLES_PER_POINT);
            submitValidatedSamples(finalSamples, absX, absY);

            samplesCollectedRef.current = SAMPLES_PER_POINT;
            setSamplesCollected(SAMPLES_PER_POINT);

            // Move to next point or finish
            if (calibrationPoint < CALIBRATION_POINTS.length - 1) {
              setCalibrationPoint(calibrationPoint + 1);
            } else {
              finishCalibration();
            }
          } else {
             // We had 15 but some were outliers. Let UI show how many valid we currently have.
             // We cap it at 14 visually so it doesn't jump to 15 until it's done.
             setSamplesCollected(validSamples.length);
          }
        } else {
          setSamplesCollected(currentBuffer.length);
        }
      }

      loopId = requestAnimationFrame(sampleLoop);
    };

    loopId = requestAnimationFrame(sampleLoop);
    return () => cancelAnimationFrame(loopId);
  }, [
    calibrationPhase, 
    isSettling, 
    calibrationPoint, 
    debugFeatures,
    submitValidatedSamples, 
    finishCalibration, 
    setCalibrationPoint
  ]);

  if (calibrationPhase === 'none') {
    if (calibrationError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className="bg-white text-black p-8 rounded-xl flex flex-col items-center max-w-md text-center">
            <h2 className="text-2xl font-bold mb-2">Calibration needs improvement</h2>
            <div className="text-gray-600 mb-6 w-full bg-slate-100 p-4 rounded-lg text-sm text-left">
              {calibrationDiagnostics && (
                <>
                  <p><strong>Average error:</strong> {Math.round(calibrationDiagnostics.averageErrorPx)}px</p>
                  <p><strong>Target:</strong> below {Math.round(calibrationDiagnostics.allowedErrorPx)}px</p>
                  <div className="mt-2 text-xs border-t border-slate-300 pt-2 grid grid-cols-2 gap-x-2">
                     <p>Fit Avg Error: {Math.round(calibrationDiagnostics.calibrationFitAvgErrorPx)}px</p>
                     <p>Fit Max Error: {Math.round(calibrationDiagnostics.calibrationFitMaxErrorPx)}px</p>
                     <p>Clamped Fit Avg: {Math.round(calibrationDiagnostics.displayClampedFitAvgErrorPx)}px</p>
                     <p>Held-Out Med: {Math.round(calibrationDiagnostics.heldOutValidationMedianErrorPx)}px</p>
                     <p>Held-Out Max: {Math.round(calibrationDiagnostics.heldOutValidationMaxErrorPx)}px</p>
                  </div>
                </>
              )}
              {!calibrationDiagnostics && <p>{calibrationError}</p>}
            </div>
            
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={startCalibration}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try again
              </button>
              <button 
                onClick={cancelCalibration}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Continue without gaze tracking
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  if (calibrationPhase === 'complete') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-white text-black p-8 rounded-xl flex flex-col items-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
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

  const currentPt = CALIBRATION_POINTS[calibrationPoint];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 pointer-events-auto flex items-center justify-center overflow-hidden">
      <div className="absolute top-8 text-center w-full text-white pointer-events-none select-none">
        <h2 className="text-3xl font-bold mb-2">Look at the dot</h2>
        <p className="text-slate-300">Keep your head still and follow the dot with your eyes.</p>
        <div className="mt-4 flex gap-2 justify-center">
          {CALIBRATION_POINTS.map((_, i) => (
            <div key={i} className={`h-2 w-8 rounded-full transition-colors ${i < calibrationPoint ? 'bg-green-500' : i === calibrationPoint ? 'bg-blue-500' : 'bg-slate-700'}`} />
          ))}
        </div>
        <div className="mt-4 text-xs font-mono bg-black/50 p-2 rounded">
          Debug: samples={samplesCollected}/{SAMPLES_PER_POINT}, isSettling={isSettling ? 'true' : 'false'}, pt={calibrationPoint}
          <br/>Features: {debugFeatures ? 'Valid' : 'Null'}
        </div>
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
        onClick={cancelCalibration}
        className="absolute top-8 right-8 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
      >
        Cancel
      </button>

      {/* The moving target */}
      <div 
        className="absolute w-8 h-8 rounded-full transition-all duration-300 ease-in-out"
        style={{
          left: `${currentPt.x * 100}%`,
          top: `${currentPt.y * 100}%`,
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
