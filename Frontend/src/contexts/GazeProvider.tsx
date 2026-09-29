import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useGazeTracker } from '../hooks/useGazeTracker';
import { GazePermissionModal, resetGazeConsent } from '../components/GazePermissionModal';
import { CONSENT_KEY } from '../config/gazeConfig';

interface GazeContextType {
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  gazeReady: boolean;
  gazeQuality: string;
  facePresent: boolean;
  /** True when the pipeline is capable of producing gaze right now (ready and not engineFailed). */
  gazeAvailable: boolean;
  /** True once MediaPipe/WebGL has failed to init or thrown at runtime (e.g. Firefox WebGL context failure) — gaze is unsupported for this session. */
  engineFailed: boolean;
  /** 'focused' | 'off-target' | 'unavailable' | 'gaze-unsupported' — see GAZE_PIPELINE.md. */
  gazeStatus: string;
  rawGazePoint: { x: number, y: number } | null;
  /** Called by GazeTracker.jsx once its <video> is playing. Drives the hook. */
  setVideoElement: (el: HTMLVideoElement | null) => void;
  struggleScore: number;
  fixationDurationMs: number;
  gazeOffScreenMs: number;
  currentLine: string | null;
  fixationCount: number;
  offTargetWindow: { offTargetDwellMs: number; offTargetFixationCount: number };
  resetMetrics: () => void;
  setContainerElement: (el: HTMLElement | null) => void;
  setContext: (ctx: string) => void;
  onFixation: (durationMs: number, score: number) => void;
  onInactivity: (durationMs: number, score: number) => void;
  setFixationCallback: (cb: ((durationMs: number, score: number) => void) | null) => void;
  setInactivityCallback: (cb: ((durationMs: number, score: number) => void) | null) => void;
  retryInit: () => void;
  /** Re-show the consent modal (resets any previous 'denied' choice). */
  requestConsent: () => void;
  /** Feed non-gaze struggle signals (pauses, rewatches, …) into the auto-hint fusion gate. */
  reportBehaviorSignal: (partial: Record<string, unknown>) => void;
}

const GazeContext = createContext<GazeContextType | undefined>(undefined);

const traceProviderUpdate = (name: string, payload: any) => {
  if (import.meta.env.VITE_GAZE_DEBUG_LOGS === 'true') {
    // @ts-ignore
    const isRendering = window.__gaze_calibration_rendering > 0;
    console.trace(`[gaze-react-update] ${name} | CalibrationOverlay rendering: ${isRendering}`, payload);
  }
};

export function GazeProvider({ children }: { children: React.ReactNode }) {
  const [isActive, _setIsActive] = useState(() => {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  });
  const setIsActive = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    traceProviderUpdate('setIsActive', val);
    _setIsActive(val);
  }, []);

  const [isPaused, _setIsPaused] = useState(false);
  const setIsPaused = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    traceProviderUpdate('setIsPaused', val);
    _setIsPaused(val);
  }, []);

  const [showConsentModal, _setShowConsentModal] = useState(false);
  const setShowConsentModal = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    traceProviderUpdate('setShowConsentModal', val);
    _setShowConsentModal(val);
  }, []);

  const [videoElement, _setVideoElement] = useState<HTMLVideoElement | null>(null);
  const setVideoElement = useCallback((val: HTMLVideoElement | null | ((prev: HTMLVideoElement | null) => HTMLVideoElement | null)) => {
    traceProviderUpdate('setVideoElement', val);
    _setVideoElement(val);
  }, []);

  const [containerElement, _setContainerElement] = useState<HTMLElement | null>(null);
  const setContainerElement = useCallback((val: HTMLElement | null | ((prev: HTMLElement | null) => HTMLElement | null)) => {
    traceProviderUpdate('setContainerElement', val);
    _setContainerElement(val);
  }, []);

  const [contextVal, _setContext] = useState<string>('practice');
  const setContext = useCallback((val: string | ((prev: string) => string)) => {
    traceProviderUpdate('setContext', val);
    _setContext(val);
  }, []);

  const containerRef = useRef<HTMLElement | null>(null);
  useEffect(() => { containerRef.current = containerElement; }, [containerElement]);

  const fixationCallbackRef   = useRef<((durationMs: number, score: number) => void) | null>(null);
  const inactivityCallbackRef = useRef<((durationMs: number, score: number) => void) | null>(null);
  const lastInactivityTrigger = useRef<number>(0);
  const wasReadyRef           = useRef(false);

  const {
    gazeReady,
    gazeQuality,
    facePresent,
    gazeAvailable,
    engineFailed,
    gazeStatus,
    rawGazePoint,
    struggleScore,
    fixationDurationMs,
    gazeOffScreenMs,
    currentLine,
    fixationCount,
    offTargetWindow,
    resetMetrics,
    retryInit,
    reportBehaviorSignal,
  } = useGazeTracker({
    videoElement,
    containerRef: containerRef,
    context: contextVal,
    enabled: isActive,
    isPaused,
    onStruggleDetected: (score: number, action: any) => {
      if (fixationCallbackRef.current) {
        fixationCallbackRef.current(fixationDurationMs, score);
      }
      resetMetrics();
    },
  });

  const handleConsent = useCallback((granted: boolean) => {
    setShowConsentModal(false);
    if (granted) {
      setIsActive(true);
      retryInit();
    }
  }, [retryInit]);

  const requestConsent = useCallback(() => {
    const existing = localStorage.getItem(CONSENT_KEY);
    if (existing === 'granted') {
      setIsActive(true);
      retryInit();
    } else {
      setShowConsentModal(true);
    }
  }, [retryInit]);

  // Track inactivity via gazeOffScreenMs
  useEffect(() => {
    if (isActive && !isPaused && gazeOffScreenMs > 10000) {
      const now = Date.now();
      if (now - lastInactivityTrigger.current > 15000) {
        lastInactivityTrigger.current = now;
        if (inactivityCallbackRef.current) {
          inactivityCallbackRef.current(gazeOffScreenMs, struggleScore);
        }
        resetMetrics();
      }
    }
  }, [isActive, isPaused, gazeOffScreenMs, struggleScore, resetMetrics]);

  useEffect(() => {
    if (gazeReady) wasReadyRef.current = true;
  }, [gazeReady]);

  // Auto-kill isActive only after the engine was working and then lost
  // signal — but NOT for engineFailed (unsupported browser/WebGL failure):
  // per the gaze-unsupported contract, the camera preview should keep
  // running and just show a "not supported" notice, not be torn down.
  useEffect(() => {
    if (gazeQuality === 'unavailable' && !engineFailed && isActive && wasReadyRef.current) {
      setIsActive(false);
      wasReadyRef.current = false;
    }
  }, [gazeQuality, engineFailed, isActive]);

  const setFixationCallback = useCallback((cb: ((durationMs: number, score: number) => void) | null) => {
    fixationCallbackRef.current = cb;
  }, []);

  const setInactivityCallback = useCallback((cb: ((durationMs: number, score: number) => void) | null) => {
    inactivityCallbackRef.current = cb;
  }, []);

  const onFixation = useCallback((durationMs: number, score: number) => {
    if (fixationCallbackRef.current) fixationCallbackRef.current(durationMs, score);
  }, []);

  const onInactivity = useCallback((durationMs: number, score: number) => {
    if (inactivityCallbackRef.current) inactivityCallbackRef.current(durationMs, score);
  }, []);

  return (
    <GazeContext.Provider value={{
      isActive,
      setIsActive,
      isPaused,
      setIsPaused,
      gazeReady,
      gazeQuality,
      facePresent,
      gazeAvailable,
      engineFailed,
      gazeStatus,
      rawGazePoint,
      setVideoElement,
      struggleScore,
      fixationDurationMs,
      gazeOffScreenMs,
      currentLine,
      fixationCount,
      offTargetWindow,
      resetMetrics,
      setContainerElement,
      setContext,
      onFixation,
      onInactivity,
      setFixationCallback,
      setInactivityCallback,
      retryInit,
      requestConsent,
      reportBehaviorSignal,
    }}>
      {children}
      <GazePermissionModal onConsent={handleConsent} show={showConsentModal} />
    </GazeContext.Provider>
  );
}

export function useGaze() {
  const context = useContext(GazeContext);
  if (context === undefined) {
    throw new Error('useGaze must be used within a GazeProvider');
  }
  return context;
}
