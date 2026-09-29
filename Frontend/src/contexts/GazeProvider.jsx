import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useGazeTracker } from '../hooks/useGazeTracker';
import { TrackingState } from '../utils/gazeState';
import { GazePermissionModal } from '../components/GazePermissionModal';

const GazeContext = createContext(null);

const CONSENT_KEY = 'aquire_gaze_consent_granted';

// Must match CalibrationOverlay.jsx's own CALIBRATION_POINTS exactly (same
// keys/indices/order) — duplicated here rather than pulled into a shared
// module for now to keep this change's footprint small.
const CALIBRATION_POINTS = [
  { key: 'top-left', index: 0, x: 0.1, y: 0.1 },
  { key: 'top-center', index: 1, x: 0.5, y: 0.1 },
  { key: 'top-right', index: 2, x: 0.9, y: 0.1 },
  { key: 'mid-left', index: 3, x: 0.1, y: 0.5 },
  { key: 'mid-center', index: 4, x: 0.5, y: 0.5 },
  { key: 'mid-right', index: 5, x: 0.9, y: 0.5 },
  { key: 'bot-left', index: 6, x: 0.1, y: 0.9 },
  { key: 'bot-center', index: 7, x: 0.5, y: 0.9 },
  { key: 'bot-right', index: 8, x: 0.9, y: 0.9 },
];

export const GazeProvider = ({ children }) => {
  const gaze = useGazeTracker();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [consentGranted, setConsentGranted] = useState(
    () => localStorage.getItem(CONSENT_KEY) === 'true'
  );
  // Guards the calibration auto-trigger below so it fires once per tracking
  // session, not on every render where status happens to be
  // "not_calibrated" — that status is also what a user's own explicit
  // "Continue without gaze tracking" click resets to (see
  // CalibrationOverlay.jsx's resetCalibration()), and re-firing there would
  // silently overrule their choice to skip it.
  const autoCalibrationAttemptedRef = useRef(false);

  // NOTE: there is deliberately no "auto-start tracking on mount" effect
  // here anymore. GazeProvider is mounted once, globally, above the router
  // (see App.jsx) — every page gets it, including Home/Login/Signup where
  // camera access has no business being requested. A blanket auto-start
  // effect here previously raced with each gaze-enabled page's own mount-
  // time requestTracking() call (see LessonPlayer.jsx): on a fresh page
  // load both fired within moments of each other, and since
  // startTracking()'s reentrancy guard only skips when the tracker is
  // already "healthy" (not merely "starting"), the second call tore down
  // and restarted the still-initializing first attempt — visible as two
  // full "Created TensorFlow Lite XNNPACK delegate" init cycles a few
  // seconds apart in the console, roughly doubling real startup latency.
  // Auto-starting is each *page's* responsibility now (call
  // requestTracking() from useGaze() in a mount effect) — see
  // LessonPlayer.jsx for the pattern; the other gaze-enabled pages
  // (AdaptiveQuiz/AssessmentPage/DsaProblemPage/QuestionPracticePage)
  // should get the same treatment.

  // Auto-start calibration once tracking comes up healthy and needs it —
  // previously required the student to find and click a manual "Calibrate
  // Gaze" button; CalibrationOverlay.jsx itself never triggered
  // startCalibration() (see its own comment questioning who was supposed
  // to). One attempt per tracking session: reset the guard whenever
  // tracking goes off then on again (a fresh lesson visit / retry), so it
  // still auto-attempts on the next session but doesn't nag repeatedly
  // within this one after the student backs out of a failed attempt via
  // "Continue without gaze tracking".
  useEffect(() => {
    if (!gaze.isTracking) {
      autoCalibrationAttemptedRef.current = false;
      return;
    }
    if (
      gaze.trackingState === TrackingState.CALIBRATION_REQUIRED &&
      gaze.calibration?.status === 'not_calibrated' &&
      !autoCalibrationAttemptedRef.current
    ) {
      autoCalibrationAttemptedRef.current = true;
      const targets = CALIBRATION_POINTS.map((pt) => ({
        ...pt,
        x: pt.x * window.innerWidth,
        y: pt.y * window.innerHeight,
      }));
      gaze.startCalibration(targets);
    }
  }, [gaze.isTracking, gaze.trackingState, gaze.calibration?.status, gaze.startCalibration]);

  const handleConsent = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setConsentGranted(true);
    setShowPermissionModal(false);
    gaze.startTracking();
  }, [gaze]);

  const handleDecline = useCallback(() => {
    setShowPermissionModal(false);
  }, []);

  const requestTracking = useCallback(() => {
    if (consentGranted) {
      gaze.startTracking();
    } else {
      setShowPermissionModal(true);
    }
  }, [consentGranted, gaze]);

  const gazeAdapter = {
    ...gaze,
    isActive: gaze.isTracking,
    setIsActive: (active) => {
      if (active) requestTracking();
      else gaze.stopTracking();
    },
    // Expose for the pill so it can prompt consent if needed
    requestTracking,
    gazeQuality: gaze.trackingState === TrackingState.TRACKING_ACTIVE ? 'good' : (gaze.trackingState === TrackingState.LOW_CONFIDENCE ? 'poor' : 'none'),
    retryInit: gaze.retryTracking,
    // Both deprecated in the new (state-based, see attentionState/
    // trackingState above) gaze API — callers still register these
    // (DsaProblemPage.jsx, QuestionPracticePage.jsx) so they need to stay
    // as no-ops rather than undefined. setFixationCallback had a stub;
    // setInactivityCallback didn't, so every caller that registered one
    // threw "setInactivityCallback is not a function" the instant it ran —
    // on DsaProblemPage specifically, this was invisible for a while
    // because the DSA lesson routing bug meant that page was never
    // actually reached (see lessonPath()'s fix).
    setFixationCallback: () => {},
    setInactivityCallback: () => {}
  };

  return (
    <GazeContext.Provider value={gazeAdapter}>
      {children}
      <GazePermissionModal
        isOpen={showPermissionModal}
        onClose={handleDecline}
        onAccept={handleConsent}
      />
    </GazeContext.Provider>
  );
};

export const useGaze = () => {
  const context = useContext(GazeContext);
  if (!context) {
    throw new Error('useGaze must be used within a GazeProvider');
  }
  return context;
};
