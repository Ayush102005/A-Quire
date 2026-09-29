import { useState, useEffect, useRef, useCallback } from 'react';
import { initFaceLandmarker } from '../utils/gazeEngine';
import { initObjectDetector } from '../utils/objectEngine';
import { createRawGaze } from '../utils/rawGazeTracker';
import { GazeCalibration } from '../utils/gazeCalibration';
import { GazeStateMachine, TrackingState, AttentionState } from '../utils/gazeState';
import { GazeTracker as LegacyGazeTracker } from '../utils/legacyGazeTracker';
import { createOneEuroFilterBank } from '../utils/oneEuroFilter';

// Was 0.8 — each new prediction only contributed 20% per tick, so the
// on-screen point took ~10 ticks (roughly a third of a second at the
// ~30fps cap below) to catch up to a real, sudden eye movement, on top of
// the One Euro filter already smoothing the raw features feeding into
// predict() one stage upstream. Two sequential low-pass stages compound
// their lag multiplicatively — this is the stage closest to what's
// actually rendered on screen, so it's the highest-leverage place to trade
// some of that smoothing back for responsiveness. Not empirically tuned
// against live jitter data (no camera access in this environment) — if
// this reads as too twitchy in practice, move it back up toward 0.6-0.7
// rather than reverting to 0.8, which was the reported problem.
const SCREEN_GAZE_SMOOTHING = 0.4;

// Sustained-fixation ("confusion") detection for the calibrated tracker —
// previously this only existed on the legacy tracker (a normalized-space
// radius check inside legacyGazeTracker.js's own loop, bypassing
// GazeStateMachine entirely); the new tracker had no equivalent at all, so
// AttentionState.FIXATED could never be reached while calibrated, and every
// page watching for it (LessonPlayer.jsx, DsaProblemPage.tsx,
// QuestionPracticePage.tsx) silently never fired.
//
// First version of this used the *calibrated* screenGaze prediction with an
// 80px pixel radius — that turned out to never actually fire in practice,
// for two independent reasons: (1) calibration error on a plain webcam
// regularly lands around 300px (see gazeCalibration.js's diagnostics), far
// exceeding an 80px radius, so the smoothed prediction routinely wandered
// out of the circle well before 12s of real, honest fixation could
// accumulate; (2) far more damning — the dwell timer was *fully reset*
// every tick the calibrated prediction wasn't available, which included
// every single blink (predict() is only attempted when
// `!currentRaw.isBlinking`). Humans blink roughly every 4-6 seconds on
// average, so surviving 12 *uninterrupted* seconds with literally zero
// blinks was close to impossible — the feature was effectively dead on
// arrival regardless of how well someone was actually fixating.
//
// Fixed by switching the signal entirely: instead of the calibrated
// screen-pixel prediction, this now tracks the same eye-relative iris
// ratio already computed every tick for calibration/prediction itself
// (features[0..3] = leftEyeX/Y, rightEyeX/Y from gazeEngine.js's
// extractFeatures — already One-Euro-filtered above), averaged L/R. This
// needs no calibration accuracy at all — it's the same class of signal
// legacyGazeTracker.js already uses successfully (raw iris position, EMA
// smoothed), just against a cleaner eye-corner-relative ratio rather than
// legacy's whole-frame iris position. FIXATION_RATIO_RADIUS mirrors
// legacy's own FIXATION_RADIUS (0.06) as the best available reference
// point — not independently tuned against live data, since no camera
// access exists in this environment. Separately, a blink no longer resets
// the dwell timer at all — it just holds it (see the tick loop below) —
// only genuine tracking loss (no face detected) resets it now.
const FIXATION_RATIO_RADIUS = 0.06;
const FIXATION_MS = 12000;

export const TRACKER_MODE = Object.freeze({
  NEW: "new",
  LEGACY: "legacy",
  UNAVAILABLE: "unavailable"
});

// 5000ms was tuned assuming detectForVideo() runs fast enough to clear
// MIN_VALID_STARTUP_FRAMES with room to spare. On slower hardware/delegates
// (observed: 8 detections in the full 5s window, every single one
// successful — a 100% hit rate, just genuinely slow throughput) that budget
// is too tight and falls back to legacy on devices that are actually fine,
// just not fast. The fix for "reliable but slow" is more time, not a lower
// bar — MIN_VALID_STARTUP_FRAMES stays as the actual confidence threshold.
//
// Was briefly raised to 15000 while detection ran through a Web Worker
// (moving detection off-thread meaningfully slowed per-frame throughput on
// this hardware — see faceLandmarkerRef's own REVERTED comment above for
// why that was reverted entirely). Back to 8000, matching the synchronous
// main-thread path's own already-observed throughput.
const STARTUP_TIMEOUT_MS = 15000;
const MIN_VALID_STARTUP_FRAMES = 10;
const MAX_CONSECUTIVE_INVALID_FRAMES = 90;
const RUNTIME_STALL_TIMEOUT_MS = 8000;
// While the 9-point calibration overlay is actively collecting/fitting, the
// main thread is under real extra load (overlay re-renders, the moving-dot
// CSS animation, calibration's own per-sample bookkeeping) on top of
// detectForVideo() itself running synchronously on the main thread. A
// transient hiccup there tripping the normal 3s stall threshold is an
// especially bad outcome:
// legacy mode can't calibrate at all (supportsScreenCalibration is
// trackerMode === NEW only), so falling back mid-calibration silently
// throws away all progress and leaves the student stuck without a way to
// retry short of reloading. Give calibration a longer, more forgiving
// threshold instead of exempting it entirely — a genuinely dead tracker
// should still eventually be caught.
const CALIBRATION_RUNTIME_STALL_TIMEOUT_MS = 15000;

const LEGACY_STARTUP_TIMEOUT_MS = 8000;
const MIN_LEGACY_VALID_RESULTS = 5;
const MAX_LEGACY_CONSECUTIVE_INVALID_RESULTS = 90;
const LEGACY_RUNTIME_STALL_TIMEOUT_MS = 5000;
const CONFUSION_EVENT_COOLDOWN_MS = 5000;

export function useGazeTracker() {
  const [trackerMode, setTrackerMode] = useState(TRACKER_MODE.NEW);
  const [trackerHealth, setTrackerHealth] = useState({
    mode: "new",
    status: "stopped",
    lastValidFrameAt: null,
    consecutiveInvalidFrames: 0,
    validFramesDuringStartup: 0,
    initializationError: null,
    fallbackReason: null,
    sessionId: null
  });

  const [isTracking, setIsTracking] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  
  const [rawGaze, setRawGaze] = useState(null);
  const [screenGaze, setScreenGaze] = useState(null);
  const [trackingState, setTrackingState] = useState(TrackingState.TRACKING_OFF);
  const [attentionState, setAttentionState] = useState(AttentionState.UNKNOWN);
  const [detectedObjects, setDetectedObjects] = useState([]);
  
  const [calibrationStatus, setCalibrationStatus] = useState("not_calibrated");
  const [calibrationSnapshot, setCalibrationSnapshot] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastCameraErrorRef = useRef(null); // see startWebcam()
  const animationFrameRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);
  const lastObjectDetectMsRef = useRef(0);
  // REVERTED: face detection briefly ran off the main thread via a Web
  // Worker (gazeWorkerClient.js/gazeWorker.js — both still in the codebase,
  // just unused now, in case this is worth revisiting later on faster
  // hardware). On this hardware it made each detection cycle take upward
  // of a second (worker round-trip + createImageBitmap() overhead on top
  // of an already CPU-delegate-bound, slow FaceLandmarker), which meant
  // MIN_SAMPLES_PER_TARGET=15 could take 15+ seconds of dead-steady gaze
  // per calibration target instead of a second or two — far longer than a
  // person can actually hold precise gaze without natural drift, and
  // calibration accuracy measurably, repeatedly got worse after this
  // change (332px -> 406px -> 436px average error across three real
  // attempts) despite every other fix tried in between (regression
  // regularization, feature filtering). The main-thread synchronous path
  // this reverts to was slower to build responsiveness-wise, but was the
  // one actually proven to produce working calibrations across this whole
  // session before the worker was introduced.
  const legacyTrackerRef = useRef(null);
  
  const trackerSessionIdRef = useRef(0);
  const activeTrackerRef = useRef(null);
  // Which session's fallback-to-legacy has already been initiated. Without
  // this, a failure partway through the tick loop (a real exception, with a
  // specific reason) and the separate 5s startup-health timeout racing in
  // parallel (same sessionId — transitionToLegacy doesn't bump it) can both
  // end up calling transitionToLegacy() for the same session: the tick
  // loop's catch fires first with the real reason, then the timeout's own
  // generic "startup_health_check_failed" fires moments later and
  // overwrites it, permanently hiding the actual cause. First reason wins;
  // reset whenever a new session actually starts (see startTracking()).
  const fallbackHandledSessionRef = useRef(null);
  const trackerHealthRef = useRef(trackerHealth);
  // In-flight guard for startTracking(): the "already healthy" check below
  // only covers the case where a *previous* start already finished. During
  // the startup window itself (status "starting" — camera prompt through
  // FaceLandmarker init through startup-frame collection, up to several
  // seconds) a second concurrent call sails right past that check and runs
  // the whole start sequence again, including a second independent
  // getUserMedia() call — the browser then prompts for camera permission
  // twice. This happens in practice via React StrictMode's double-invoked
  // mount effects (multiple gaze-enabled pages call requestTracking() on
  // mount) racing each other. Same class of bug as gazeEngine.js's
  // initFaceLandmarker() in-flight-promise cache; same fix shape here.
  const startTrackingPromiseRef = useRef(null);

  const calibrationController = useRef(new GazeCalibration());
  const stateMachine = useRef(new GazeStateMachine());
  const smoothedScreenGaze = useRef({ x: null, y: null });
  // { center: {x,y} | null, startMs: number | null } — see FIXATION_RATIO_RADIUS/
  // FIXATION_MS above.
  const fixationRef = useRef({ center: null, startMs: null });
  // Smooths the 6D raw feature vector itself, before it's used for either
  // calibration sample collection or live prediction — previously
  // unfiltered, so per-frame landmark-detection noise (a large share of
  // real-world calibration error) fed directly into the calibration fit.
  // minCutoff/beta are a reasonable starting point, not empirically tuned
  // against live data (no camera access here) — see oneEuroFilter.js's
  // own doc comment for the tuning sequence if these need adjusting.
  // beta raised from 0.05 -> 0.15: beta controls how much the cutoff
  // frequency opens up as the signal moves faster (the "One Euro" part of
  // One Euro Filter) — too low, and the filter stays heavily damped even
  // during real, fast eye movement, which reads as sluggish/laggy
  // regardless of how quickly downstream code reacts to it. minCutoff
  // (stationary-jitter suppression, matters for fixation-detection
  // stability — see FIXATION_RATIO_RADIUS above) is left unchanged.
  const featureFilterRef = useRef(createOneEuroFilterBank(6, { minCutoff: 1.0, beta: 0.15, dCutoff: 1.0 }));

  const lastLegacyAttentionStateRef = useRef("unknown");
  const lastConfusionEventAtRef = useRef(null);
  const startupFrameCountRef = useRef(0); // Synchronously updated — not subject to React batching
  const isStartingPhaseRef = useRef(false); // Set synchronously before loop starts
  // Diagnostics only, reset alongside startupFrameCountRef at the start of
  // every startTracking() attempt — see the "startup_health_check_failed"
  // throw below for why these exist: that reason alone couldn't distinguish
  // "detectForVideo() never even got called" / "it ran but never returned a
  // face" / "some other silent failure", all of which look identical
  // without this.
  const startupDetectCallCountRef = useRef(0);
  const startupFaceFoundCountRef = useRef(0);
  // Runtime health tracked in refs so React re-renders can't reset them
  const lastValidFrameAtRef = useRef(null);
  const consecutiveInvalidFramesRef = useRef(0);
  // Most recent valid, non-blinking feature vector — read by the implicit-
  // recalibration click/keydown handler below (see startTracking()'s
  // listener setup) without needing a state subscription. Kept as the last
  // *good* reading rather than cleared on every invalid frame, since a
  // click can land in the gap between ticks.
  const latestFeaturesRef = useRef(null);

  useEffect(() => {
    trackerHealthRef.current = trackerHealth;
  }, [trackerHealth]);

  // Hard invariant: legacy mode can never support calibration
  // (supportsScreenCalibration below is trackerMode === NEW only — legacy's
  // own tick loop never calls calibrationController.addSample() at all), so
  // calibrationStatus must never be left at "collecting"/"fitting" while
  // trackerMode is LEGACY. transitionToLegacy() already resets it inline,
  // but that's one call site trusting it always runs to completion — if a
  // session-id race bails it out early, or some other path flips trackerMode
  // to LEGACY without going through it, the calibration overlay is left
  // rendering the "look at the dot" collecting screen forever over a
  // tracker that can never feed it a single sample ("stuck at zero"). This
  // effect re-asserts the invariant unconditionally whenever trackerMode
  // actually changes, independent of how it got there.
  useEffect(() => {
    if (trackerMode !== TRACKER_MODE.LEGACY) return;
    if (calibrationStatus === 'collecting' || calibrationStatus === 'fitting') {
      calibrationController.current.stopCalibration();
      calibrationController.current.reset();
      setCalibrationStatus('unsupported');
      setCalibrationSnapshot(null);
    }
  }, [trackerMode, calibrationStatus]);

  const logDebug = useCallback((eventName, data) => {
    if (import.meta.env.VITE_GAZE_DEBUG_LOGS === "true") {
      console.log({ event: eventName, ...data });
    }
  }, []);

  const createStartingHealth = (sessionId) => ({
    mode: "new",
    status: "starting",
    lastValidFrameAt: null,
    consecutiveInvalidFrames: 0,
    validFramesDuringStartup: 0,
    initializationError: null,
    fallbackReason: null,
    sessionId
  });

  const createHealthyHealth = (sessionId) => ({
    mode: "new",
    status: "healthy",
    lastValidFrameAt: performance.now(),
    consecutiveInvalidFrames: 0,
    validFramesDuringStartup: trackerHealthRef.current.validFramesDuringStartup,
    initializationError: null,
    fallbackReason: null,
    sessionId
  });

  const toSafeTrackerFailureReason = (err) => {
    if (err && err.message && err.message.startsWith("legacy_")) return err.message;
    if (err && err.message) return err.message;
    return "unknown_error";
  };

  // videoRef.current is a <video> element created in memory and never
  // attached to the DOM (see below) — play() resolving only means playback
  // *started*, not that a frame has actually been decoded yet
  // (readyState/videoWidth/videoHeight). That gap used to be invisible:
  // startWebcam() returned true right after play(), and the *tick loop's*
  // own "video not ready" guard (readyState < 2 etc.) would just silently
  // keep bailing every frame without ever calling detectForVideo() — eating
  // the entire 5s startup budget on video buffering with zero face-detection
  // attempts actually made, then failing with the uninformative
  // "startup_health_check_failed". Waiting for real readiness here, with
  // its own bounded timeout and a specific failure reason, means that
  // startup budget is spent on what it's actually meant to measure (can a
  // face be detected), not swallowed by this.
  const VIDEO_READY_TIMEOUT_MS = 4000;
  const waitForVideoReady = (video) => new Promise((resolve) => {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      resolve(true);
      return;
    }
    let settled = false;
    const cleanup = () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      clearInterval(pollId);
      clearTimeout(timeoutId);
    };
    const onReady = () => {
      if (settled || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;
      settled = true;
      cleanup();
      resolve(true);
    };
    // Events are the primary signal; poll as a fallback in case a detached
    // (never appended to the DOM) video element doesn't fire them reliably
    // in every browser.
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    const pollId = setInterval(onReady, 100);
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    }, VIDEO_READY_TIMEOUT_MS);
  });

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        videoRef.current = video;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const ready = await waitForVideoReady(videoRef.current);
      if (!ready) {
        const v = videoRef.current;
        lastCameraErrorRef.current = `video_never_ready: readyState=${v.readyState} width=${v.videoWidth} height=${v.videoHeight}`;
        return false;
      }

      setCameraReady(true);
      return true;
    } catch (err) {
      console.error("[useGazeTracker] Camera error", err);
      // Previously discarded here — startTracking() only ever saw the
      // generic 'camera_could_not_be_started' thrown below, losing the
      // actual reason (NotAllowedError = permission denied, NotFoundError
      // = no camera device, NotReadableError = camera in use by another
      // app/tab, etc.). Stashed here so that message can make it into
      // fallbackReason instead of a string that doesn't say anything.
      lastCameraErrorRef.current = `${err.name || 'CameraError'}: ${err.message || 'unknown'}`;
      return false;
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const stopActiveTracker = useCallback(async ({ preserveWebcam = false, preserveCalibration = true } = {}) => {
    activeTrackerRef.current = null;
    setIsTracking(false);
    
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (legacyTrackerRef.current) {
      logDebug("legacy_tracker_cleanup", { sessionId: trackerSessionIdRef.current, reason: "stopActiveTracker" });
      legacyTrackerRef.current.destroy();
      legacyTrackerRef.current = null;
    }
    
    if (faceLandmarkerRef.current) {
        try { faceLandmarkerRef.current.close(); } catch (_) { }
        faceLandmarkerRef.current = null;
    }

    if (objectDetectorRef.current) {
        try { objectDetectorRef.current.close(); } catch (_) { }
        objectDetectorRef.current = null;
    }
    setDetectedObjects([]);

    if (!preserveWebcam) {
      stopWebcam();
    }
    
    setRawGaze(null);
    // Reset runtime health refs so they don't leak into next session
    lastValidFrameAtRef.current = null;
    consecutiveInvalidFramesRef.current = 0;
    fixationRef.current = { center: null, startMs: null };
    if (!preserveCalibration) {
      setScreenGaze(null);
    }
    
    lastLegacyAttentionStateRef.current = "unknown";
    lastConfusionEventAtRef.current = null;

    const newState = stateMachine.current.update({ isTrackingEnabled: false });
    setTrackingState(newState.trackingState);
    setAttentionState(newState.attentionState);
  }, [stopWebcam, logDebug]);

  const transitionToUnavailable = useCallback(async ({ sessionId, reason }) => {
    if (sessionId !== trackerSessionIdRef.current) return;
    
    logDebug("gaze_tracker_unavailable", { from: "legacy_or_new", to: "unavailable", sessionId, reason });

    await stopActiveTracker({ preserveWebcam: false, preserveCalibration: false });
    setTrackerMode(TRACKER_MODE.UNAVAILABLE);
    
    setTrackerHealth(prev => ({
      ...prev,
      mode: "unavailable",
      status: "failed",
      fallbackReason: reason,
      sessionId
    }));
    
    calibrationController.current.stopCalibration();
    calibrationController.current.reset();
    setCalibrationStatus("not_calibrated");
    setCalibrationSnapshot(null);
    setScreenGaze(null);
    smoothedScreenGaze.current = { x: null, y: null };
  }, [stopActiveTracker, logDebug]);

  const transitionToLegacy = useCallback(async ({ sessionId, reason }) => {
    if (sessionId !== trackerSessionIdRef.current) return;
    // Already handling (or handled) this exact session's fallback — the
    // first call's reason is the real one; ignore a later, redundant call
    // (e.g. the 5s startup timeout resolving after the tick loop already
    // failed for a more specific reason moments earlier).
    if (fallbackHandledSessionRef.current === sessionId) return;
    fallbackHandledSessionRef.current = sessionId;

    logDebug("gaze_tracker_legacy_fallback", { from: "new", to: "legacy", sessionId, reason });

    setTrackerHealth(prev => ({
      ...prev,
      mode: "legacy",
      status: "falling_back",
      fallbackReason: reason,
      sessionId
    }));

    await stopActiveTracker({ preserveWebcam: true, preserveCalibration: false });
    
    if (sessionId !== trackerSessionIdRef.current) return;

    calibrationController.current.stopCalibration();
    calibrationController.current.reset();
    setCalibrationStatus("unsupported");
    setCalibrationSnapshot(null);
    setScreenGaze(null);
    smoothedScreenGaze.current = { x: null, y: null };

    setTrackerMode(TRACKER_MODE.LEGACY);
    setIsTracking(true);

    try {
      if (!streamRef.current || !videoRef.current) {
        const success = await startWebcam();
        if (!success) {
          throw new Error('legacy_camera_stream_missing');
        }
      }
      if (sessionId !== trackerSessionIdRef.current) return;

      const legacyTracker = new LegacyGazeTracker();
      legacyTrackerRef.current = legacyTracker;
      
      let validFrames = 0;
      let consecutiveInvalid = 0;
      let lastValidAt = null;
      let legacyHealthy = false;
      let startMs = null;

      logDebug("legacy_tracker_init", { sessionId, modelLoaded: false });

      await legacyTracker.initialize({
          videoElement: videoRef.current,
          stream: streamRef.current,
          modelUrl: undefined,
          onFrame: (frameData) => {
              if (sessionId !== trackerSessionIdRef.current) return;
              const now = performance.now();
              if (startMs === null) startMs = now;
              
              // The callback firing means the legacy tracker processed a frame successfully
              const isFrameProcessed = true; 

              if (isFrameProcessed) {
                  validFrames++;
                  consecutiveInvalid = 0;
                  lastValidAt = now;
              } else {
                  consecutiveInvalid++;
              }
              
              if (!legacyHealthy) {
                  if (validFrames >= MIN_LEGACY_VALID_RESULTS) {
                      legacyHealthy = true;
                      activeTrackerRef.current = TRACKER_MODE.LEGACY;
                      setIsTracking(true);
                      setTrackerHealth(prev => ({ ...prev, status: "healthy", mode: "legacy", fallbackReason: reason }));
                      logDebug("legacy_tracker_health", { sessionId, validResults: validFrames, healthy: true, state: "healthy" });
                  } else if (now - startMs > LEGACY_STARTUP_TIMEOUT_MS) {
                      logDebug("legacy_tracker_health", { sessionId, validResults: validFrames, healthy: false, state: "startup_timeout" });
                      transitionToUnavailable({ sessionId, reason: "legacy_startup_timeout" });
                  }
              } else {
                  if (consecutiveInvalid >= MAX_LEGACY_CONSECUTIVE_INVALID_RESULTS || (lastValidAt && now - lastValidAt > LEGACY_RUNTIME_STALL_TIMEOUT_MS)) {
                      logDebug("legacy_tracker_health", { sessionId, consecutiveInvalidResults: consecutiveInvalid, healthy: false, state: "runtime_stall" });
                      transitionToUnavailable({ sessionId, reason: "legacy_runtime_stall" });
                  }
              }

              setRawGaze({
                  horizontal: null,
                  vertical: null,
                  confidence: null,
                  features: null,
                  direction: { horizontal: "unknown", vertical: "unknown" },
                  isValid: frameData.isValid,
                  timestamp: frameData.timestamp
              });
              
              if (legacyHealthy) {
                  let attention = AttentionState.UNKNOWN;
                  let shouldEmitConfused = false;
                  
                  if (frameData.attentionState === "focused") {
                      attention = AttentionState.ON_LESSON;
                      lastConfusionEventAtRef.current = null;
                  } else if (frameData.attentionState === "distracted") {
                      attention = AttentionState.OFF_LESSON;
                      lastConfusionEventAtRef.current = null;
                  } else if (frameData.attentionState === "confused") {
                      attention = AttentionState.FIXATED;
                      const wasConfused = lastLegacyAttentionStateRef.current === "confused";
                      const timeSinceLastConfusion = lastConfusionEventAtRef.current ? now - lastConfusionEventAtRef.current : Infinity;
                      
                      if (!wasConfused) {
                          shouldEmitConfused = true;
                          logDebug("legacy_confusion_event", { sessionId, emitted: true, reason: "entry" });
                      } else if (timeSinceLastConfusion >= CONFUSION_EVENT_COOLDOWN_MS) {
                          shouldEmitConfused = true;
                          logDebug("legacy_confusion_event", { sessionId, emitted: true, reason: "cooldown_elapsed" });
                      } else {
                          logDebug("legacy_confusion_event", { sessionId, emitted: false, reason: "cooldown_active" });
                      }
                      
                      if (shouldEmitConfused) {
                          lastConfusionEventAtRef.current = now;
                      }
                  } else {
                      lastConfusionEventAtRef.current = null;
                  }
                  
                  if (lastLegacyAttentionStateRef.current !== frameData.attentionState) {
                      logDebug("legacy_tracker_state_change", { sessionId, previousState: lastLegacyAttentionStateRef.current, currentState: frameData.attentionState });
                  }
                  
                  lastLegacyAttentionStateRef.current = frameData.attentionState;
                  
                  setTrackingState(TrackingState.TRACKING_ACTIVE);
                  setAttentionState(attention);
              }
          },
          onStateChange: () => {}
      });

      if (sessionId !== trackerSessionIdRef.current) {
          legacyTracker.destroy();
          return;
      }
      
      logDebug("legacy_tracker_init", { sessionId, modelLoaded: true });
      legacyTracker.start();

    } catch (err) {
      if (sessionId !== trackerSessionIdRef.current) return;
      transitionToUnavailable({ sessionId, reason: toSafeTrackerFailureReason(err) });
    }
  }, [stopActiveTracker, startWebcam, transitionToUnavailable, logDebug]);

  const startNewTrackerLoop = useCallback((sessionId) => {
    if (animationFrameRef.current !== null) return;
    let lastTs = -1;
    let lastProcessedWallMs = -1;
    const MIN_FRAME_INTERVAL_MS = 30; // ~30fps cap to avoid overloading the main thread

    const tick = async () => {
      if (sessionId !== trackerSessionIdRef.current) return;

      let ts = performance.now();
      
      let currentRaw = null;
      let currentScreen = null;
      
      try {
        if (!videoRef.current || videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
           animationFrameRef.current = requestAnimationFrame(tick);
           return;
        }

        // Throttle to ~30fps to avoid overloading main thread
        const wallMs = performance.now();
        if (wallMs - lastProcessedWallMs < MIN_FRAME_INTERVAL_MS) {
            animationFrameRef.current = requestAnimationFrame(tick);
            return;
        }
        lastProcessedWallMs = wallMs;
        
        if (ts <= lastTs) {
            animationFrameRef.current = requestAnimationFrame(tick);
            return;
        }
        lastTs = ts;

        if (objectDetectorRef.current && !isStartingPhaseRef.current) {
            const wallMs = performance.now();
            if (wallMs - lastObjectDetectMsRef.current > 1000) {
                lastObjectDetectMsRef.current = wallMs;
                try {
                    const objResult = objectDetectorRef.current.detectForVideo(videoRef.current, ts);
                    if (objResult && objResult.detections) {
                        const objects = objResult.detections
                            .flatMap(d => d.categories.map(c => c.categoryName))
                            .filter(name => ['cell phone', 'book'].includes(name));
                        
                        setDetectedObjects(prev => {
                            if (prev.length === objects.length && prev.every((v, i) => v === objects[i])) return prev;
                            return objects;
                        });
                    }
                } catch (err) {
                    console.warn("Object detection error:", err);
                }
            }
        }

        if (faceLandmarkerRef.current) {
          if (isStartingPhaseRef.current) startupDetectCallCountRef.current += 1;

          const result = faceLandmarkerRef.current.detectForVideo(videoRef.current, ts);
          let landmarks = result?.faceLandmarks?.[0] || null;

          if (isStartingPhaseRef.current && landmarks) startupFaceFoundCountRef.current += 1;

          currentRaw = createRawGaze(landmarks, true);

          if (sessionId !== trackerSessionIdRef.current) return;

          // Smooth the raw feature vector before it's used for live
          // prediction/fixation — per-frame landmark-detection jitter
          // previously fed straight into both, unfiltered. Skipped while
          // invalid/blinking (features is null then); the filter's own
          // dt-based gap handling (see oneEuroFilter.js) treats resuming
          // after any real gap as a fresh start on its own, so no explicit
          // reset is needed here.
          //
          // Calibration sample collection deliberately uses the
          // *unfiltered* features (rawUnfilteredFeatures below), not this
          // smoothed value — kept even after reverting detection back to
          // the main thread (see this file's REVERTED comment above, on
          // faceLandmarkerRef's declaration): calibration already has its
          // own cadence-independent noise handling (median across ~15
          // samples per target, plus fitRobust()'s outlier trim), which is
          // arguably a better fit for a one-shot batch process than a
          // real-time adaptive filter regardless of tick rate. Live
          // prediction still uses the filtered value, where the adaptive
          // smoothing genuinely helps perceived cursor responsiveness.
          let fixationSample = null;
          const rawUnfilteredFeatures = currentRaw.features ? [...currentRaw.features] : null;
          if (currentRaw.isValid && !currentRaw.isBlinking && currentRaw.features) {
            currentRaw = {
              ...currentRaw,
              features: featureFilterRef.current.filter(currentRaw.features, ts),
            };
            // Eye-relative ratio, averaged L/R, from the *smoothed* features
            // — see FIXATION_RATIO_RADIUS's doc comment above for why this
            // replaced the calibrated screen-pixel prediction as the
            // fixation signal.
            const [lx, ly, rx, ry] = currentRaw.features;
            fixationSample = { x: (lx + rx) / 2, y: (ly + ry) / 2 };
          }

          const health = trackerHealthRef.current;

          const isFrameProcessed = result !== undefined;

          if (isFrameProcessed) {
            lastValidFrameAtRef.current = ts;
            consecutiveInvalidFramesRef.current = 0;
            if (isStartingPhaseRef.current) {
              startupFrameCountRef.current += 1;
              health.validFramesDuringStartup = startupFrameCountRef.current;
              if (startupFrameCountRef.current % 5 === 0) {
                console.log(`[NewTracker] Startup frames: ${startupFrameCountRef.current}/${MIN_VALID_STARTUP_FRAMES}`);
              }
            }
          } else {
            consecutiveInvalidFramesRef.current += 1;
          }
          
          if (health.status === "healthy") {
            const timeSinceLastValid = lastValidFrameAtRef.current ? ts - lastValidFrameAtRef.current : 0;
            // See CALIBRATION_RUNTIME_STALL_TIMEOUT_MS's doc comment: give
            // an active calibration attempt more slack before declaring the
            // tracker stalled and bailing to a mode that can't calibrate.
            const isCalibratingNow = ['collecting', 'fitting'].includes(
              calibrationController.current.getStatus().status
            );
            const stallTimeoutMs = isCalibratingNow
              ? CALIBRATION_RUNTIME_STALL_TIMEOUT_MS
              : RUNTIME_STALL_TIMEOUT_MS;
            if (consecutiveInvalidFramesRef.current >= MAX_CONSECUTIVE_INVALID_FRAMES || timeSinceLastValid > stallTimeoutMs) {
                health.status = "degraded";
                setTrackerHealth({ ...health });
                
                logDebug("gaze_tracker_runtime_degraded", {
                   sessionId,
                   consecutiveInvalidFrames: consecutiveInvalidFramesRef.current,
                   lastValidFrameAgeMs: timeSinceLastValid,
                   reason: "stall_or_invalid_frames"
                });
                
                transitionToLegacy({ sessionId, reason: "runtime_stall_or_invalid" });
                return;
            }
          }

          setTrackerHealth({ ...health });
          setRawGaze(currentRaw);

          if (currentRaw.isValid && !currentRaw.isBlinking) {
            latestFeaturesRef.current = currentRaw.features;
          }

          const cal = calibrationController.current;
          
          if (cal.getStatus().status === "collecting") {
             const target = cal.getCurrentTarget();
             if (target && currentRaw.isValid && !currentRaw.isBlinking) {
                 const sample = {
                   targetKey: target.key,
                   pointIndex: target.index,
                   targetX: target.x,
                   targetY: target.y,
                   // Unfiltered — see the doc comment where
                   // rawUnfilteredFeatures is captured, above.
                   features: rawUnfilteredFeatures,
                   capturedAt: currentRaw.timestamp,
                   confidence: currentRaw.confidence,
                   isValid: currentRaw.isValid,
                   isBlinking: currentRaw.isBlinking
                 };
                 const calResult = cal.addSample(sample);
                 
                 if (calResult.accepted) {
                     setCalibrationSnapshot(cal.getSnapshot());
                 }
                 
                 if (calResult.targetCompleted) {
                     if (calResult.allTargetsCompleted) {
                         cal.fit();
                         setCalibrationSnapshot(cal.getSnapshot());
                         setCalibrationStatus(cal.getStatus().status);
                     } else {
                         cal.advanceTarget();
                         setCalibrationSnapshot(cal.getSnapshot());
                     }
                 }
             }
             if (calibrationStatus !== "collecting") {
                 setCalibrationStatus("collecting");
             }
          }
          
          if (cal.getStatus().status === "calibrated") {
             if (calibrationStatus !== "calibrated") {
                 setCalibrationStatus("calibrated");
             }
             if (currentRaw.isValid && !currentRaw.isBlinking) {
                 const pred = cal.predict(currentRaw.features);
                 if (pred) {
                     if (smoothedScreenGaze.current.x === null) {
                         smoothedScreenGaze.current = pred;
                     } else {
                         smoothedScreenGaze.current.x = smoothedScreenGaze.current.x * SCREEN_GAZE_SMOOTHING + pred.x * (1 - SCREEN_GAZE_SMOOTHING);
                         smoothedScreenGaze.current.y = smoothedScreenGaze.current.y * SCREEN_GAZE_SMOOTHING + pred.y * (1 - SCREEN_GAZE_SMOOTHING);
                     }
                     
                     const displayX = Math.max(0, Math.min(window.innerWidth, smoothedScreenGaze.current.x));
                     const displayY = Math.max(0, Math.min(window.innerHeight, smoothedScreenGaze.current.y));
                     
                     currentScreen = {
                         x: displayX,
                         y: displayY,
                         rawX: pred.x,
                         rawY: pred.y
                     };
                     setScreenGaze(currentScreen);
                 }
             }
          } else {
             if (screenGaze !== null) setScreenGaze(null);
             if (calibrationStatus !== cal.getStatus().status) {
                 setCalibrationStatus(cal.getStatus().status);
             }
          }
          
          const isCalibrated = cal.getStatus().status === "calibrated";
          const isInLessonAOI = currentScreen ? currentScreen.y > 100 && currentScreen.y < window.innerHeight - 100 : false;
          const isInViewport = currentScreen ? currentScreen.x >= 0 && currentScreen.x <= window.innerWidth && currentScreen.y >= 0 && currentScreen.y <= window.innerHeight : false;
          
          const newState = stateMachine.current.update({
            isTrackingEnabled: true,
            isCalibrated,
            isFaceVisible: currentRaw ? currentRaw.isValid : false,
            isConfident: true,
            isInLessonAOI,
            isInViewport
          });

          setTrackingState(newState.trackingState);

          // Sustained-fixation override — see FIXATION_RATIO_RADIUS/
          // FIXATION_MS above. A blink holds the dwell timer (neither
          // resets nor extends it) rather than cancelling it outright —
          // that was the actual bug that made this never fire in practice.
          // Only a real absence of a face resets it.
          let attentionStateToSet = newState.attentionState;
          if (currentRaw.isBlinking) {
            const fx = fixationRef.current;
            if (fx.center && fx.startMs !== null && ts - fx.startMs >= FIXATION_MS) {
              attentionStateToSet = AttentionState.FIXATED;
            }
          } else if (fixationSample) {
            const fx = fixationRef.current;
            if (!fx.center) {
              fx.center = fixationSample;
              fx.startMs = ts;
            } else {
              const dist = Math.hypot(fixationSample.x - fx.center.x, fixationSample.y - fx.center.y);
              if (dist <= FIXATION_RATIO_RADIUS) {
                if (ts - fx.startMs >= FIXATION_MS) {
                  attentionStateToSet = AttentionState.FIXATED;
                }
              } else {
                fx.center = fixationSample;
                fx.startMs = ts;
              }
            }
          } else {
            // Genuine tracking loss (no face detected at all, as opposed to
            // a blink) — reset for real rather than let a stale center
            // linger indefinitely.
            fixationRef.current = { center: null, startMs: null };
          }

          setAttentionState(attentionStateToSet);
        }
      } catch (err) {
        if (sessionId !== trackerSessionIdRef.current) return;
        console.error("Tracker loop exception:", err);
        transitionToLegacy({ sessionId, reason: toSafeTrackerFailureReason(err) });
        return;
      }
      
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [calibrationStatus, screenGaze, logDebug, transitionToLegacy]);

  const waitForStartupHealth = useCallback((sessionId) => {
    return new Promise((resolve) => {
      const startMs = performance.now();
      
      const check = () => {
        if (sessionId !== trackerSessionIdRef.current) {
          resolve(false);
          return;
        }
        
        const health = trackerHealthRef.current;
        if (startupFrameCountRef.current >= MIN_VALID_STARTUP_FRAMES) {
          logDebug("gaze_tracker_startup_health", {
            mode: "new",
            sessionId,
            validFramesDuringStartup: startupFrameCountRef.current,
            healthy: true,
            reason: null
          });
          resolve(true);
          return;
        }
        
        if (performance.now() - startMs > STARTUP_TIMEOUT_MS) {
          logDebug("gaze_tracker_startup_health", {
            mode: "new",
            sessionId,
            validFramesDuringStartup: startupFrameCountRef.current,
            healthy: false,
            reason: "startup_timeout"
          });
          resolve(false);
          return;
        }
        
        setTimeout(check, 100);
      };
      
      check();
    });
  }, [logDebug]);

  const startTracking = useCallback(async () => {
    if (
      activeTrackerRef.current === TRACKER_MODE.NEW &&
      trackerHealthRef.current.status === "healthy"
    ) {
      return;
    }

    // A start is already in flight — share it instead of racing a second
    // independent startup (see startTrackingPromiseRef comment above).
    if (startTrackingPromiseRef.current) {
      return startTrackingPromiseRef.current;
    }

    const runStart = async () => {
      await stopActiveTracker({ preserveWebcam: false, preserveCalibration: true });

      const sessionId = ++trackerSessionIdRef.current;
      fallbackHandledSessionRef.current = null; // fresh session — allow its own fallback to fire

      logDebug("gaze_tracker_start_attempt", { mode: "new", sessionId });

      setTrackerMode(TRACKER_MODE.NEW);

      const startingHealth = createStartingHealth(sessionId);
      setTrackerHealth(startingHealth);
      setTrackingState(TrackingState.INITIALIZING);
      setAttentionState(AttentionState.UNKNOWN);
      setIsTracking(true);

      try {
        const success = await startWebcam();
        if (!success) {
          throw new Error(`camera_could_not_be_started: ${lastCameraErrorRef.current || 'unknown'}`);
        }

        if (sessionId !== trackerSessionIdRef.current) return;

        if (!faceLandmarkerRef.current) {
          faceLandmarkerRef.current = await initFaceLandmarker();
        }
        if (!objectDetectorRef.current) {
          objectDetectorRef.current = await initObjectDetector();
        }

        if (sessionId !== trackerSessionIdRef.current) return;

        startupFrameCountRef.current = 0; // Reset before starting loop
        startupDetectCallCountRef.current = 0;
        startupFaceFoundCountRef.current = 0;
        isStartingPhaseRef.current = true;  // Mark startup phase synchronously
        lastValidFrameAtRef.current = null; // Reset runtime health refs
        consecutiveInvalidFramesRef.current = 0;
        startNewTrackerLoop(sessionId);


        const healthy = await waitForStartupHealth(sessionId);

        if (sessionId !== trackerSessionIdRef.current) return;

        if (!healthy) {
          isStartingPhaseRef.current = false;
          // Distinguishes "detectForVideo() was never even reached" (0/0 —
          // points at the tick loop itself not running) from "it ran but
          // never returned a face" (detects>0, faces=0 — a real, non-bug
          // problem: lighting/camera angle/positioning) from "faces were
          // found but startup still didn't count them as healthy" (faces>0
          // — points at a bug in how frames get counted as valid).
          throw new Error(
            `startup_health_check_failed (detectCalls=${startupDetectCallCountRef.current}, facesFound=${startupFaceFoundCountRef.current}, countedValid=${startupFrameCountRef.current}/${MIN_VALID_STARTUP_FRAMES})`
          );
        }

        isStartingPhaseRef.current = false;
        activeTrackerRef.current = TRACKER_MODE.NEW;
        setTrackerHealth(createHealthyHealth(sessionId));
      } catch (error) {
        if (sessionId !== trackerSessionIdRef.current) return;

        await transitionToLegacy({
          sessionId,
          reason: toSafeTrackerFailureReason(error)
        });
      }
    };

    const promise = runStart();
    startTrackingPromiseRef.current = promise;
    try {
      await promise;
    } finally {
      // Only clear if we're still the current in-flight start — a stale
      // finally from an old call must not clobber a newer one's slot.
      if (startTrackingPromiseRef.current === promise) {
        startTrackingPromiseRef.current = null;
      }
    }
  }, [startWebcam, startNewTrackerLoop, waitForStartupHealth, stopActiveTracker, transitionToLegacy, logDebug]);

  const retryTracking = useCallback(async () => {
    const sessionId = ++trackerSessionIdRef.current;
    logDebug("gaze_tracker_retry", { sessionId });
    
    await stopActiveTracker({ preserveWebcam: false, preserveCalibration: true });
    
    setTrackerHealth(prev => ({
        ...prev,
        fallbackReason: null,
        initializationError: null
    }));
    
    return startTracking();
  }, [stopActiveTracker, startTracking, logDebug]);

  // Explicit, user-chosen switch to the uncalibrated compatibility tracker
  // — for a student whose calibration keeps landing well outside target
  // (see CalibrationOverlay.jsx's "invalid" screen), "keep retrying the
  // same calibration" or "lose gaze tracking entirely" were the only two
  // options. Legacy tracking (simple fixation/distraction heuristics, no
  // screen-coordinate calibration needed at all) is usually a perfectly
  // fine middle ground, and was already what a failed calibration falls
  // back to automatically — this just lets a student opt into it directly
  // instead of needing calibration to fail on its own first.
  const switchToLegacyTracking = useCallback(async () => {
    const sessionId = ++trackerSessionIdRef.current;
    fallbackHandledSessionRef.current = null; // fresh session — this transition is allowed to run
    logDebug("gaze_tracker_legacy_by_choice", { sessionId });
    await transitionToLegacy({ sessionId, reason: "user_chose_compatibility_tracking" });
  }, [transitionToLegacy, logDebug]);

  const startCalibration = useCallback((targets) => {
    if (trackerMode !== TRACKER_MODE.NEW) {
      return { ok: false, message: "Calibration requires active new tracker" };
    }
    const res = calibrationController.current.startCalibration(targets);
    if (res.ok) {
        setCalibrationSnapshot(res.snapshot);
        setCalibrationStatus("collecting");
    } else {
        setCalibrationStatus("invalid");
    }
  }, [trackerMode]);
  
  const stopCalibration = useCallback(() => {
    if (trackerMode === TRACKER_MODE.LEGACY) return;
    calibrationController.current.stopCalibration();
    setCalibrationStatus(calibrationController.current.getStatus().status);
  }, [trackerMode]);
  
  const resetCalibration = useCallback(() => {
    calibrationController.current.reset();
    setCalibrationStatus(trackerMode === TRACKER_MODE.LEGACY ? "unsupported" : "not_calibrated");
    setCalibrationSnapshot(null);
    setScreenGaze(null);
    smoothedScreenGaze.current = { x: null, y: null };
  }, [trackerMode]);

  const setCalibrationTarget = useCallback((target) => {
    if (trackerMode === TRACKER_MODE.LEGACY) return;
    calibrationController.current.setCalibrationTarget(target);
  }, [trackerMode]);

  const fitCalibration = useCallback(() => {
    if (trackerMode === TRACKER_MODE.LEGACY) return false;
    const ok = calibrationController.current.fit();
    setCalibrationStatus(calibrationController.current.getStatus().status);
    return ok;
  }, [trackerMode]);
  
  // Implicit (continuous) recalibration: every real click/keypress is a
  // free ground-truth sample (the student is generally looking at what
  // they're about to click — the same assumption implicit calibration
  // techniques like WebGazer.js rely on). Feeds the most recent valid
  // feature reading + the event's known screen coordinates into
  // GazeCalibration.addImplicitSample(), which only actually refits every
  // few samples and only keeps a refit that doesn't regress accuracy on
  // the original explicit calibration (see gazeCalibration.js). Safe to
  // call unconditionally while tracking — addImplicitSample() itself is a
  // no-op until status is "calibrated".
  const handleImplicitAnchor = useCallback((e) => {
    const features = latestFeaturesRef.current;
    if (!features) return;
    const x = e.clientX ?? window.innerWidth / 2;
    const y = e.clientY ?? window.innerHeight / 2;
    calibrationController.current.addImplicitSample(features, x, y);
  }, []);

  useEffect(() => {
    if (!isTracking || trackerMode !== TRACKER_MODE.NEW) return;
    window.addEventListener('click', handleImplicitAnchor, { passive: true });
    window.addEventListener('keydown', handleImplicitAnchor, { passive: true });
    return () => {
      window.removeEventListener('click', handleImplicitAnchor);
      window.removeEventListener('keydown', handleImplicitAnchor);
    };
  }, [isTracking, trackerMode, handleImplicitAnchor]);

  useEffect(() => {
    return () => {
      trackerSessionIdRef.current++;
      stopActiveTracker({ preserveWebcam: false, preserveCalibration: false });
    };
  }, [stopActiveTracker]);

  return {
    trackerMode,
    trackerHealth,
    fallbackReason: trackerHealth.fallbackReason,
    rawGaze,
    screenGaze,
    supportsScreenCoordinates: trackerMode === TRACKER_MODE.NEW,
    supportsScreenCalibration: trackerMode === TRACKER_MODE.NEW,
    calibration: {
      status: calibrationStatus,
      diagnostics: trackerMode === TRACKER_MODE.NEW ? calibrationController.current.diagnostics : null,
      snapshot: calibrationSnapshot,
      fit: fitCalibration,
      model: null,
      sampleCount: 0,
      samplesByTarget: {}
    },
    startTracking,
    stopTracking: () => {
        trackerSessionIdRef.current++;
        stopActiveTracker({ preserveWebcam: false, preserveCalibration: true });
        setTrackerHealth(prev => ({ ...prev, status: "stopped" }));
    },
    retryTracking,
    switchToLegacyTracking,
    startCalibration,
    stopCalibration,
    resetCalibration,
    setCalibrationTarget,
    isTracking,
    cameraReady,
    
    trackingState,
    attentionState,
    detectedObjects,
    stream: streamRef.current
  };
}
