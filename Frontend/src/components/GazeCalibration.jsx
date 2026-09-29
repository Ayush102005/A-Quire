import React, { useState, useEffect } from 'react';
import { Target, CheckCircle } from 'lucide-react';

const CALIBRATION_POINTS = [
  { top: '10%', left: '10%' },
  { top: '10%', right: '10%' },
  { bottom: '10%', left: '10%' },
  { bottom: '10%', right: '10%' },
  { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
];

export default function GazeCalibration({ onComplete }) {
  const [currentPoint, setCurrentPoint] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Prevent scrolling while calibrating
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleClick = (e) => {
    // The actual calibration is handled by the global click listener in useGazeTracker.
    // We just advance the UI here.
    if (currentPoint < CALIBRATION_POINTS.length - 1) {
      setCurrentPoint((prev) => prev + 1);
    } else {
      setDone(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1000);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-teal-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fade-in">
        <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
        <h2 className="text-2xl font-bold">Calibration Complete</h2>
        <p className="mt-2 text-teal-100">Your gaze tracking is now more accurate.</p>
      </div>
    );
  }

  const pos = CALIBRATION_POINTS[currentPoint];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-sm">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center text-white select-none pointer-events-none">
        <h2 className="text-xl font-semibold mb-2">Optional Gaze Calibration</h2>
        <p className="text-stone-300">
          Please look at the target and click it.<br />
          Point {currentPoint + 1} of {CALIBRATION_POINTS.length}
        </p>
      </div>

      <button
        onClick={handleClick}
        className="absolute w-12 h-12 rounded-full bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.5)] transition-all animate-pulse hover:bg-teal-500/40 hover:scale-110"
        style={pos}
        aria-label="Calibration Target"
      >
        <Target className="w-6 h-6 text-teal-300" />
      </button>
    </div>
  );
}
