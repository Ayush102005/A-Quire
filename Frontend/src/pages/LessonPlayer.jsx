import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, connectNotifications, getAccessToken, ensureFreshAccessToken, getCurrentUser } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import VideoPlayer from '../components/lesson/VideoPlayer';
import MentorPanel from '../components/lesson/MentorPanel';
import InterventionOverlay, { getInterventionSeverity, getStruggleReasonText } from '../components/lesson/InterventionOverlay';
import TranscriptPanel from '../components/lesson/TranscriptPanel';
import StudyMaterialPanel from '../components/lesson/StudyMaterialPanel';
import PersonalNotesPanel from '../components/lesson/PersonalNotesPanel';
import { LoadingState, ErrorState } from '../components/UXStates';
import { useGaze } from '../contexts/GazeProvider';
import GazeStatusPill from '../components/GazeStatusPill';
import LiveCameraPreview from '../components/lesson/LiveCameraPreview';
import FocusModeHUD from '../components/lesson/FocusModeHUD';
import { Zap } from 'lucide-react';
import { TrackingState, AttentionState } from '../utils/gazeState';
import './LessonPlayer.css';

export default function LessonPlayer() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [searchParams] = useSearchParams();
  const lessonId = Number(searchParams.get('id')) || null;
  const [lesson, setLesson] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState('1x');
  const [activeTab, setActiveTab] = useState('transcript');
  const [activeChapter, setActiveChapter] = useState(2);
  const videoRef = useRef(null);

  // Merge a partial lesson update (from StudyMaterialPanel's PDF/notes
  // upload/save calls) into local state without a full lesson refetch.
  const handleLessonUpdate = useCallback((partial) => {
    setLesson((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  // Gaze Integration
  const {
    trackingState,
    attentionState,
    isTracking,
    calibration,
    startTracking,
    stopTracking,
    startCalibration,
    requestTracking,
    stream
  } = useGaze();

  const isTrackingEnabled = isTracking;
  const isCalibrated = calibration.status === 'calibrated';

  const [showLivePreview, setShowLivePreview] = useState(true);

  // Start gaze tracking as soon as the lesson page opens, instead of
  // waiting for the student to find and click the toggle in
  // LiveCameraPreview. requestTracking() (not startTracking() directly)
  // still respects consent: if the camera was already approved in a
  // previous session it starts immediately, otherwise it shows the
  // GazePermissionModal explanation first — this only removes the extra
  // manual step, not the consent decision itself. Calibration then
  // auto-follows once tracking is healthy (see GazeProvider.jsx).
  useEffect(() => {
    requestTracking();
  // Once per mount — requestTracking reads current consent state itself
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also read course_id from URL if navigated from CourseDetail
  const courseId = Number(searchParams.get('course_id')) || null;

  // ── Struggle Detection State ───────────────────────────────────────────────
  const [struggleEventId, setStruggleEventId] = useState(null);
  // struggleEvent holds the full monitor result so InterventionOverlay can
  // compute severity. Must be declared here — setStruggleEvent is called
  // inside detectStruggleRef; if missing it throws a ReferenceError that
  // silently prevents struggleEventIdRef from ever being set.
  const [struggleEvent, setStruggleEvent] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(true);
  const [hints, setHints] = useState([]);
  const [hintLoading, setHintLoading] = useState(false);
  // True only when the *system* auto-detected a struggle (gaze/inactivity).
  // False for manual "Ask mentor" requests — controls which context banner
  // is shown in MentorPanel (amber "stuck" vs neutral "here to help").
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [transcriptLang, setTranscriptLang] = useState('original');
  const [translatedTranscript, setTranslatedTranscript] = useState(null);
  
  const [isTranslating, setIsTranslating] = useState(false);

  // Audio Mode Check-in State (Default: 10 minutes for production)
  const AUDIO_CHECKIN_INTERVAL_MS = 10 * 60 * 1000;
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [checkinData, setCheckinData] = useState(null);
  const audioModeIntervalRef = useRef(null);

  // Focus Mode State
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusDrawerType, setFocusDrawerType] = useState(null); // null | 'mentor' | 'notes'

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        setIsFocusMode((prev) => !prev);
      } else if (e.key === 'Escape' && isFocusMode) {
        if (focusDrawerType) {
          setFocusDrawerType(null);
        } else {
          setIsFocusMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, focusDrawerType]);

  useEffect(() => {
    if (isAudioMode && isPlaying && trackingState === TrackingState.TRACKING_ACTIVE) {
      if (!audioModeIntervalRef.current) {
        audioModeIntervalRef.current = setInterval(() => {
          triggerAudioCheckin();
        }, AUDIO_CHECKIN_INTERVAL_MS);
      }
    } else {
      if (audioModeIntervalRef.current) {
        clearInterval(audioModeIntervalRef.current);
        audioModeIntervalRef.current = null;
      }
    }
    return () => {
      if (audioModeIntervalRef.current) {
        clearInterval(audioModeIntervalRef.current);
        audioModeIntervalRef.current = null;
      }
    };
  }, [isAudioMode, isPlaying, trackingState]);

  const triggerAudioCheckin = async () => {
    setIsPlaying(false);
    setCheckinData({ loading: true, question: null, isCorrect: null, feedback: null, answer: '' });
    try {
      const res = await api.post('/mentor/audio-checkin/generate', {
        lesson_id: lessonId,
        current_timestamp_ms: currentTimeRef.current * 1000,
        window_size_ms: 180000 
      });
      setCheckinData({ loading: false, question: res.data.question, isCorrect: null, feedback: null, answer: '' });
    } catch (e) {
      console.error(e);
      setCheckinData(null);
      setIsPlaying(true);
    }
  };

  const submitAudioCheckin = async () => {
    if (!checkinData?.answer) return;
    setCheckinData(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.post('/mentor/audio-checkin/verify', {
        question: checkinData.question,
        answer: checkinData.answer
      });
      setCheckinData(prev => ({
        ...prev,
        loading: false,
        isCorrect: res.data.is_correct,
        feedback: res.data.feedback
      }));
      if (res.data.is_correct) {
        setTimeout(() => {
          setCheckinData(null);
          setIsPlaying(true);
        }, 3000);
      }
    } catch (e) {
      console.error(e);
      setCheckinData(prev => ({ ...prev, loading: false }));
    }
  };


  // Refs — mutable values that don't trigger re-renders
  const pauseCountRef = useRef(0);
  const lastPauseAtSecRef = useRef(null); // playhead position (seconds) of the most recent pause — fallback when there's no transcript
  const lastPauseSegmentRef = useRef(null); // transcript segment index of the most recent pause, when a transcript exists
  const lastPauseAtMsRef = useRef(0); // wall-clock time of the most recent pause
  const rewatchCountRef = useRef(0);
  const lastRewatchToRef = useRef(null); // playhead position (seconds) the most recent rewind landed on — fallback when there's no transcript
  const lastRewatchSegmentRef = useRef(null); // transcript segment index the most recent rewind landed on, when a transcript exists
  const lastRewatchAtMsRef = useRef(0);  // wall-clock time of the most recent rewind
  const currentTimeRef = useRef(0);
  const inactivityTimerRef = useRef(null);
  const idleStartRef = useRef(null);
  const progressSaveTimerRef = useRef(null);
  const mainContainerRef = useRef(null);
  // Auto-struggle budget for this lesson visit: up to maxAutoHintsPerLesson
  // triggers, each at least autoHintCooldownMs apart. Shared across gaze
  // (fixation/inactivity) and behavioral (pause/rewatch/idle) triggers —
  // replaces a one-shot "fire once ever" latch so the config is meaningful.
  const autoStruggleCountRef = useRef(0);
  const lastAutoStruggleAtRef = useRef(0);
  const wsRef = useRef(null);
  const lessonRef = useRef(null);             // always-current lesson (avoids stale closures)
  const struggleEventIdRef = useRef(null);    // always-current event ID
  const detectStruggleRef = useRef(null);
  const handleGetHintRef = useRef(null);

  const pauseVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (typeof video.pauseVideo === 'function') {
        video.pauseVideo();
      } else if (typeof video.pause === 'function') {
        video.pause();
      }
    } catch (_) {}
    setIsPlaying(false);
  }, []);

  // Auto-struggle budget gate — see refs above. Manual triggers don't consume
  // the budget but do restart the cooldown, so an auto-trigger can't fire
  // immediately after the student already asked for help themselves.
  const canFireAutoStruggle = useCallback(() => {
    // Generous limit for investor presentations and testing (up to 20 triggers per session)
    if (autoStruggleCountRef.current >= 20) return false;
    // 8-second cooldown so repeat demonstrations for investors work smoothly without awkward wait times
    if (Date.now() - lastAutoStruggleAtRef.current < 8000) return false;
    return true;
  }, []);

  const markAutoStruggleFired = useCallback(() => {
    autoStruggleCountRef.current += 1;
    lastAutoStruggleAtRef.current = Date.now();
  }, []);

  // Gaze-assisted struggle cooldowns
  const gazeCooldownRef = useRef(0);
  const isGazeStruggleFiredForCurrentEpisode = useRef(false);
  const isFixationStruggleFiredForCurrentEpisode = useRef(false);
  const currentOffLessonStartMs = useRef(null);
  const lastInteractionMsRef = useRef(Date.now());

  // Track user interactions to reset playback inactivity timer
  useEffect(() => {
    const handleInteract = () => { lastInteractionMsRef.current = Date.now(); };
    window.addEventListener('mousemove', handleInteract);
    window.addEventListener('click', handleInteract);
    window.addEventListener('keydown', handleInteract);
    window.addEventListener('scroll', handleInteract, true);
    return () => {
      window.removeEventListener('mousemove', handleInteract);
      window.removeEventListener('click', handleInteract);
      window.removeEventListener('keydown', handleInteract);
      window.removeEventListener('scroll', handleInteract, true);
    };
  }, []);

  
  // Gaze-plus-behavior combination rule
  useEffect(() => {
    if (isAudioMode) return;
    if (trackingState !== TrackingState.TRACKING_ACTIVE) {

      currentOffLessonStartMs.current = null;
      isGazeStruggleFiredForCurrentEpisode.current = false;
      isFixationStruggleFiredForCurrentEpisode.current = false;
      return;
    }

    if (attentionState === AttentionState.ON_LESSON || attentionState === AttentionState.UNKNOWN) {
      currentOffLessonStartMs.current = null;
      isGazeStruggleFiredForCurrentEpisode.current = false;
      isFixationStruggleFiredForCurrentEpisode.current = false;
      return;
    }

    // Sustained fixation ("confusion") — the tracker itself already
    // decided this before ever reporting FIXATED (see
    // legacyGazeTracker.js's own 12s FIXATION_MS timer), unlike
    // OFF_LESSON below where *this* effect accumulates the duration.
    // This branch previously didn't exist: attentionState reaching
    // FIXATED fell through every check below untouched, so a correctly-
    // detected confusion episode never actually triggered anything a
    // student could see — the whole pathway from gaze fixation to an AI
    // mentor hint was missing its last link.
    if (attentionState === AttentionState.FIXATED) {
      currentOffLessonStartMs.current = null;
      if (!isFixationStruggleFiredForCurrentEpisode.current && canFireAutoStruggle() && Date.now() - gazeCooldownRef.current >= 60000) {
        isFixationStruggleFiredForCurrentEpisode.current = true;
        gazeCooldownRef.current = Date.now();
        markAutoStruggleFired();
        detectStruggleRef.current?.({
          isManual: false,
          fixationMs: 12000, // legacyGazeTracker.js's FIXATION_MS — the threshold that actually fired this
          inactivityMs: 0,
          idleSeconds: 0
        });
      }
      return;
    }
    isFixationStruggleFiredForCurrentEpisode.current = false;

    if (attentionState === AttentionState.OFF_LESSON) {
      if (!currentOffLessonStartMs.current) {
        currentOffLessonStartMs.current = Date.now();
      }

      const offLessonDuration = Date.now() - currentOffLessonStartMs.current;

      // Rule: Sustained OFF_LESSON for >= 20 seconds
      if (offLessonDuration >= 20000) {
        if (!isGazeStruggleFiredForCurrentEpisode.current && Date.now() - gazeCooldownRef.current >= 60000) {
          
          let behaviorCorroborated = false;
          const timeSinceInteraction = Date.now() - lastInteractionMsRef.current;
          
          if (isPlaying && timeSinceInteraction >= 45000) {
            behaviorCorroborated = true; // Playing + no interaction for 45s
          } else if (!isPlaying && timeSinceInteraction >= 30000) {
            // Wait, standard pause is > 30s + OFF_LESSON
            const pauseDuration = Date.now() - (idleStartRef.current || Date.now());
            if (pauseDuration >= 30000) {
              behaviorCorroborated = true; // Paused for 30s
            }
          }

          if (behaviorCorroborated && canFireAutoStruggle()) {
            isGazeStruggleFiredForCurrentEpisode.current = true;
            gazeCooldownRef.current = Date.now();
            markAutoStruggleFired();
            detectStruggleRef.current?.({ 
              isManual: false, 
              idleSeconds: Math.floor(timeSinceInteraction / 1000), 
              inactivityMs: timeSinceInteraction,
              fixationMs: 0 
            });
          }
        }
      }
    }
  }, [trackingState, attentionState, isPlaying, canFireAutoStruggle, markAutoStruggleFired]);

  useEffect(() => {
    let active = true;
    async function loadLesson() {
      if (!lessonId) {
        setError('No lesson selected.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [lessonData, progressData] = await Promise.all([
          api.lessons.get(lessonId),
          api.progress.get(lessonId),
        ]);

        if (!active) return;
        setLesson(lessonData);
        setProgress(progressData);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load lesson data.');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    loadLesson();
    return () => {
      active = false;
    };
  }, [lessonId]);

  // Keep lessonRef always current so async callbacks see the latest lesson
  useEffect(() => { lessonRef.current = lesson; }, [lesson]);
  useEffect(() => { struggleEventIdRef.current = struggleEventId; }, [struggleEventId]);

  const [wsStatus, setWsStatus] = useState('connecting');

  // ── WebSocket: receive real-time hint pushes ────────────────────────
  useEffect(() => {
    if (!lessonId) return;
    if (!getAccessToken()) return;

    let reconnectTimeout = null;
    let attempt = 0;
    const MAX_ATTEMPTS = 4;

    let cancelled = false;

    const connectWS = async () => {
      // Proactively refresh on every (re)connect attempt rather than just
      // re-reading localStorage — access tokens expire after 30 min
      // (ACCESS_TOKEN_EXPIRE_MINUTES). Re-reading alone only helps if some
      // unrelated REST call happened to trigger api.js's 401-refresh first;
      // on a page with no such call, getAccessToken() keeps handing back
      // the same already-expired token forever. A WS handshake sent with an
      // expired token gets accepted then immediately closed (code 1008) by
      // the backend, which Firefox surfaces as "can't establish a
      // connection" rather than a clean close. ensureFreshAccessToken()
      // decodes the token's exp claim and, if expired, uses the refresh
      // token to get a new one before we ever attempt the handshake.
      const token = await ensureFreshAccessToken();
      if (cancelled) return;
      if (!token) {
        setWsStatus('disconnected');
        return;
      }
      setWsStatus('connecting');
      const ws = connectNotifications(
        token,
        (msg) => {
          if (msg.type === 'hint' && msg.hint_text) {
            setHints(prev => {
              if (prev.length > 0 && prev[prev.length - 1].text === msg.hint_text) return prev;
              return [...prev, { 
                role: 'mentor', 
                text: msg.hint_text,
                audio_base64: msg.audio_base64 
              }];
            });
            setMentorOpen(true);
            setHintLoading(false);
            if (msg.event_id) {
              setStruggleEventId(msg.event_id);
              struggleEventIdRef.current = msg.event_id;
            }
            setShowOverlay(false);
            setMentorOpen(true);
            // Once we get the hint from WebSocket, pause the video!
            pauseVideo();
          }
        },
        // onError
        (err) => console.error("WS error:", err),
        // onClose
        () => {
          wsRef.current = null;
          if (cancelled) return;
          attempt++;
          // Previously gave up permanently after MAX_ATTEMPTS (~30s total),
          // leaving "Live connection lost" up forever with a full page
          // reload as the only way to recover — even from a purely
          // transient blip (dev server restart, brief network hiccup) that
          // would have cleared itself. Now: still surface the
          // "disconnected" banner once attempts exceed MAX_ATTEMPTS so it's
          // visibly not silent, but keep retrying indefinitely at the
          // capped backoff interval in the background. ws.onopen already
          // resets attempt to 0 and flips wsStatus back to 'connected'
          // (below), so a background reconnect that succeeds clears the
          // banner on its own with no user action needed.
          if (attempt > MAX_ATTEMPTS) setWsStatus('disconnected');
          const delay = Math.min(1000 * (2 ** Math.min(attempt, MAX_ATTEMPTS)), 15000);
          reconnectTimeout = setTimeout(connectWS, delay);
        }
      );
      
      // We know it connected if onopen triggers, but we don't have onopen exposed.
      // We can just assume connected if it doesn't close immediately.
      ws.addEventListener('open', () => {
        attempt = 0;
        setWsStatus('connected');
      });

      wsRef.current = ws;
    };

    connectWS();

    return () => {
      cancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      try { wsRef.current?.close(); } catch (_) {}
      wsRef.current = null;
    };
  }, [lessonId]);



  // ── Progress auto-save every 15 s while lesson is mounted ────────────
  useEffect(() => {
    progressSaveTimerRef.current = setInterval(async () => {
      if (!lessonId || currentTimeRef.current <= 0) return;
      const totalSecs = lessonRef.current?.duration_seconds ?? 0;
      const pct = totalSecs > 0
        ? Math.min(100, parseFloat(((currentTimeRef.current / totalSecs) * 100).toFixed(1)))
        : 0;
      try { await api.progress.update(lessonId, currentTimeRef.current, pct); } catch (_) { /* silent */ }
    }, 15_000);
    return () => clearInterval(progressSaveTimerRef.current);
  }, [lessonId]);

  // ── Struggle detection (stored in ref so stale closures are never an issue) ─
  // Build a transcript context string from up to 5 segments around the current
  // playhead position. Stored as `notes` on the struggle event so the AI mentor
  // can generate a hint that is grounded in what was actually being taught.
  // Which transcript segment a given playhead time falls in — the actual
  // line boundary, not a guessed fixed-width window. Shared by the
  // transcript-context builder below and the rewind/"same line" detector
  // in handleTimeUpdate, so both agree on what "the same line" means.
  const findTranscriptSegmentIndex = (segments, currentTimeSecs) => {
    if (!segments?.length) return -1;
    const idx = segments.findIndex(s => currentTimeSecs >= s.start && currentTimeSecs <= (s.end ?? s.start + 9999));
    if (idx >= 0) return idx;
    // Fallback: last segment whose start is before current time
    return segments.reduce((best, s, i) => (s.start <= currentTimeSecs ? i : best), -1);
  };

  const buildTranscriptContext = (segments, currentTimeSecs) => {
    if (!segments?.length) return null;
    const idx = Math.max(0, findTranscriptSegmentIndex(segments, currentTimeSecs));
    const start = Math.max(0, idx - 10);
    const end   = Math.min(segments.length - 1, idx + 10);
    const text  = segments.slice(start, end + 1).map(s => s.text).join(' ').trim();
    return text ? text.slice(0, 6000) : null; // cap to notes field limit
  };

  detectStruggleRef.current = async ({
    isManual = false,
    idleSeconds = 0,
    fixationMs = 0,
    inactivityMs = 0,
    struggleScore = null,
    // Both call sites that actually trigger off a rewind/pause burst reset
    // rewatchCountRef/pauseCountRef to 0 *before* calling this (see the
    // "re-arm" comments at those call sites) — this function used to always
    // read the ref directly, so by the time it ran the value being sent was
    // already 0, regardless of what really triggered it. The backend's
    // determine_event_type() then had nothing to classify this as
    // "rewatch_spike"/"pause_frequent" with, so it fell through to
    // "general_confusion" every time — which is exactly why the specific
    // reason text never showed up for these two triggers. Callers that
    // fire off a specific rewatch/pause burst now pass the pre-reset value
    // explicitly; anything else (manual trigger, etc.) falls back to
    // reading the ref's current value, same as before.
    rewatchCount = null,
    pauseCount = null,
  } = {}) => {
    const user = getCurrentUser();
    if (!user || !lessonId) {
      console.warn('[StruggleMonitor] Skipped — no user or lessonId', { user: !!user, lessonId });
      return;
    }

    // Validate IDs before building the payload — parseInt(null/undefined) = NaN
    // which would make the Pydantic schema reject with a 422 (silently, since the
    // old catch block swallowed all errors).
    const resolvedLessonId = parseInt(lessonId, 10);
    if (isNaN(resolvedLessonId) || resolvedLessonId <= 0) {
      console.error('[StruggleMonitor] Invalid lesson_id — skipping:', lessonId);
      if (isManual) setMentorOpen(true);
      return;
    }
    const rawCourseId = parseInt(lessonRef.current?.course_id || courseId || 1, 10);
    const resolvedCourseId = isNaN(rawCourseId) || rawCourseId <= 0 ? undefined : rawCourseId;

    // Gather transcript context around current playhead
    const transcriptContext = buildTranscriptContext(transcriptItems, currentTimeRef.current);
    const activeSegId = transcriptItems.find(
      s => currentTimeRef.current >= s.start && currentTimeRef.current <= (s.end ?? s.start + 9999)
    )?.id?.toString()?.slice(0, 100) ?? null;

    const payload = {
      student_id: user.id,
      lesson_id: resolvedLessonId,
      course_id: resolvedCourseId,
      rewatch_count: rewatchCount ?? rewatchCountRef.current,
      pause_count: pauseCount ?? pauseCountRef.current,
      idle_seconds: idleSeconds,
      completion_percent: 0,
      failed_attempts: 0,
      lesson_timestamp_ms: Math.round(currentTimeRef.current * 1000),
      struggle_score: struggleScore,
      manual_trigger: isManual,
      inactivity_duration_ms: Math.round(idleSeconds * 1000),
      fixation_duration_ms: Math.round(fixationMs),
      gaze_off_screen_ms: Math.round(inactivityMs),
      transcript_window_id: activeSegId,
      notes: transcriptContext ? `Transcript context: ${transcriptContext}`.substring(0, 1950) : null,
      client_event_id: `lesson-${lessonId}-${Date.now()}`,
    };
    console.debug('[StruggleMonitor] Calling /struggle/monitor', {
      lessonId: payload.lesson_id,
      courseId: payload.course_id,
      rewatch: payload.rewatch_count,
      pause: payload.pause_count,
      manual: payload.manual_trigger,
    });

    try {
      const result = await api.struggles.monitor(payload);
      if (result?.detected && result?.event_id) {
        // Only consume auto-struggle budget on a confirmed detected event —
        // previously markAutoStruggleFired() was called at the call site
        // *before* this function ran, so a failed API call (e.g. 422) still
        // burned the budget and blocked legitimate future triggers for 60 s.
        if (!isManual) {
          markAutoStruggleFired();
        }
        setStruggleEvent(result);
        setStruggleEventId(result.event_id);
        struggleEventIdRef.current = result.event_id;
        console.debug('[StruggleMonitor] Struggle detected', { eventId: result.event_id, type: result.event_type });
        if (isManual) {
          setIsAutoDetected(false); // user asked — not system-detected
          setMentorOpen(true);
        } else {
          setIsAutoDetected(true);  // system detected
          setShowOverlay(true);     // Display the interactive intervention modal to the user!
          setMentorOpen(true);      // Open mentor panel immediately
          setActiveTab('mentor');   // On tabbed layout, switch to mentor tab
          if (isFocusMode) {
            setFocusDrawerType('mentor');
          }
          // Automatically generate the hint in the background
          handleGetHintRef.current?.('basic');
        }
      } else if (isManual) {
        // Manual trigger always opens mentor even without a detected event
        setMentorOpen(true);
      } else {
        console.debug('[StruggleMonitor] No struggle detected by backend', result?.status);
      }
    } catch (err) {
      // Previously: catch (_) — silently swallowed ALL errors including 422s,
      // auth failures, and network errors. Students and developers had zero
      // visibility into why struggle events were not appearing.
      console.error('[StruggleMonitor] /struggle/monitor call failed:', err);
      if (isManual) setMentorOpen(true);
    }
  };

  // ── Hint fetching (stored in ref) ───────────────────────────────────
  const handleMentorUnderstood = () => {
    setShowOverlay(false);
    setFocusDrawerType(null);
    if (activeTab === 'mentor') {
      setActiveTab('transcript');
    }
    setMentorOpen(false);
    if (videoRef.current) {
      try {
        if (typeof videoRef.current.playVideo === 'function') {
          videoRef.current.playVideo();
        } else if (typeof videoRef.current.play === 'function') {
          videoRef.current.play();
        }
      } catch (err) {
        console.warn('Could not auto-resume video on understood:', err);
      }
    }
  };

  handleGetHintRef.current = async (level = 'basic', customMsg = null, languageOverride = null) => {
    // Map MentorPanel shortcut levels → valid backend hint_level + optional
    // system-injected custom message.
    // Backend schema only accepts: basic | detailed | example | custom
    const LEVEL_MAP = {
      // quiz: ask the AI to generate a question, not a hint
      quiz:    { apiLevel: 'custom', autoMsg: 'Quiz me with a single question about what was just explained to test my understanding. Ask the question clearly without giving away the answer, then wait for my reply.' },
      // summary: gentle recap
      summary: { apiLevel: 'basic',  autoMsg: 'Give me a brief summary of the key points covered so far in this lesson.' },
      // confused: gentle nudge
      confused: { apiLevel: 'basic', autoMsg: null },
      // analogy: relate the concept to something familiar
      analogy: { apiLevel: 'custom', autoMsg: 'Can you explain this using a simple, everyday analogy?' },
      // simpler: re-explain in easier terms, not a deeper dive
      simpler: { apiLevel: 'custom', autoMsg: 'Can you explain that again in simpler terms, using easier vocabulary and shorter sentences?' },
    };

    const mapped   = LEVEL_MAP[level];
    const safeLevel = mapped?.apiLevel ?? level;
    // Prefer the caller's customMsg over the auto-generated one
    const effectiveMsg = customMsg ?? mapped?.autoMsg ?? null;

    if (!struggleEventIdRef.current) {
      // No event yet — create one via manual trigger
      await detectStruggleRef.current?.({ isManual: true });
    }
    const evId = struggleEventIdRef.current;
    if (!evId) return; // If still no event, bail out.

    if (effectiveMsg && effectiveMsg !== mapped?.autoMsg) {
      // Only echo student-typed messages into the chat, not system auto-msgs
      setHints(prev => [...prev, { role: 'student', text: effectiveMsg }]);
    }

    setHintLoading(true);
    try {
      // `hints` here still reflects state from before this turn (React
      // state updates are async, and the student-echo setHints above hasn't
      // applied yet) — the prior turns the mentor needs to read a short
      // reply (e.g. answering its own question) in context instead of as an
      // unrelated fragment. Same fix as DsaProblemPage.tsx's hint panel.
      const history = hints.map(h => ({ role: h.role, text: h.text }));
      const result = await api.struggles.getHint(evId, safeLevel, effectiveMsg, languageOverride, history);
      if (result?.hint_text) {
        setHints(prev => {
          if (prev.length > 0 && prev[prev.length - 1].text === result.hint_text) return prev;
          // Store the original intent label so MentorPanel can display it
          return [...prev, { 
            role: 'mentor', 
            text: result.hint_text, 
            level: level,
            audio_base64: result.audio_base64 
          }];
        });
        // Once we get the hint from the API, pause the video!
        pauseVideo();
      }
    } catch (_) { /* silent */ } finally {
      setHintLoading(false);
    }
  };

  // Hint fetching (stored in ref)


  // Stable callbacks that delegate through the refs (safe to pass as props)
  const onGetHint = useCallback((level, customMsg, languageOverride) => handleGetHintRef.current?.(level, customMsg, languageOverride), []);
  const onManualMentor = useCallback(() => {
    lastAutoStruggleAtRef.current = Date.now();
    setMentorOpen(true);
    handleGetHintRef.current?.('basic');
  }, []);

  const handleSeek = useCallback((time) => {
    if (videoRef.current) {
      if (typeof videoRef.current.seekTo === 'function') {
        videoRef.current.seekTo(time, true);
      } else {
        videoRef.current.currentTime = time;
      }
    }
  }, []);

  const handleReplay30s = useCallback(() => {
    const seekTo = Math.max(0, currentTimeRef.current - 30);
    if (videoRef.current?.seekTo) {
      videoRef.current.seekTo(seekTo, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = seekTo;
    }
    if (videoRef.current) {
      try {
        if (typeof videoRef.current.playVideo === 'function') videoRef.current.playVideo();
        else if (typeof videoRef.current.play === 'function') videoRef.current.play();
      } catch (_) {}
      setIsPlaying(true);
    }
  }, []);

  useEffect(() => {
    if (transcriptLang === 'original') {
      setTranslatedTranscript(null);
      return;
    }
    const fetchTranslated = async () => {
      setIsTranslating(true);
      try {
        const trans = await api.lessons.fetchTranslatedTranscript(lessonId, transcriptLang);
        setTranslatedTranscript(trans);
      } catch (err) {
        console.error("Failed to fetch translated transcript", err);
      } finally {
        setIsTranslating(false);
      }
    };
    fetchTranslated();
  }, [lessonId, transcriptLang]);
  const handleMarkComplete = useCallback(async () => {
    if (!lessonId) return;
    try {
      await api.progress.update(lessonId, currentTimeRef.current, 100, true);
      setProgress(prev => ({ ...prev, completion_percent: 100, is_completed: true }));
    } catch (_) { /* silent */ }
  }, [lessonId]);

  // Neither InterventionOverlay nor MentorPanel's auto-detected banner
  // showed why a struggle was flagged — always the same generic copy
  // regardless of which of the five very different signals actually fired.
  // struggleEvent already carries event_type (from the /struggle/monitor
  // response's determine_event_type()) — it was just never read.
  const struggleReasonText = getStruggleReasonText(struggleEvent?.event_type);

  const displayLesson = {
    course: lesson?.course_title || lesson?.course || '',
    module: lesson?.module_title || lesson?.module || '',
    title: lesson?.title || '',
    description: lesson?.description || '',
    videoUrl: lesson?.video_url || lesson?.videoUrl || lesson?.video || '',
    durationSeconds: lesson?.duration_seconds ?? lesson?.durationSeconds ?? lesson?.duration ?? 0,
  };

  const watchedSeconds = progress?.watched_seconds ?? progress?.watchedSeconds ?? 0;
  const totalSeconds = displayLesson.durationSeconds;
  
  const savedProgress = progress?.completion_percent ?? progress?.completionPercent ?? 0;
  const computedProgress = totalSeconds > 0 ? Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100)) : 0;
  const lessonProgress = Math.max(savedProgress, computedProgress);
  
  // DEBUG LOGGING
  console.log('LessonPlayer state:', {
    watchedSeconds,
    totalSeconds,
    savedProgress,
    computedProgress,
    lessonProgress,
    lesson_duration: lesson?.duration_seconds,
  });

  const currentTime = totalSeconds > 0 ? `${Math.floor(watchedSeconds / 60)}:${String(watchedSeconds % 60).padStart(2, '0')}` : '--:--';
  const totalTime = totalSeconds > 0 ? `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}` : '--:--';

  const chapters = lesson?.chapters ?? [];
  const transcriptItems = translatedTranscript || lesson?.transcript || lesson?.transcript_items || [];
  const resources = lesson?.resources || lesson?.links || [];
  const questions = lesson?.questions || lesson?.in_lesson_questions || [];

  const snapshotItems = [
    lessonProgress !== null ? { title: 'Completion', subtitle: `${Math.round(lessonProgress)}% complete` } : null,
    lesson?.difficulty ? { title: 'Difficulty', subtitle: lesson.difficulty } : null,
    lesson?.next_checkpoint ? { title: 'Next checkpoint', subtitle: lesson.next_checkpoint } : null,
  ].filter(Boolean);

  const hasMetaChips = lesson?.captions_enabled || chapters.length > 0 || transcriptItems.length > 0;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    // Check if it's a YouTube player (has playVideo method)
    if (video.playVideo && video.pauseVideo) {
      // YouTube player API
      if (video.getPlayerState() === 1) { // 1 = playing
        video.pauseVideo();
        setIsPlaying(false);
      } else {
        video.playVideo();
        setIsPlaying(true);
      }
    } else if (video.play && video.pause) {
      // Native video element
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleSpeed = () => setSpeed(prev => (prev === '1x' ? '1.25x' : '1x'));

  const handleTimeUpdate = useCallback((e) => {
    if (e?.target?.currentTime !== undefined) {
      const newTime = Math.floor(e.target.currentTime);
      // Detect rewatch: student seeked back more than 5 s. This is the
      // "reading the same line/section again and again" signal.
      //
      // Two bugs here previously: (1) a duplicated line incremented the
      // counter by 2 per detected rewatch instead of 1, so it satisfied
      // ">= 2" after a single rewind instead of two genuine ones; (2) the
      // counter never reset except when it fired, so it counted "any 2
      // rewinds anywhere in the lesson, however far apart" rather than
      // "rewound to roughly the same spot repeatedly" — two unrelated
      // rewinds on completely different topics, minutes apart, would
      // combine to fire even though neither indicates being stuck on any
      // one thing. "Same spot" is now the actual transcript line the
      // rewind landed in (via findTranscriptSegmentIndex, using the
      // lesson's own timestamped transcript segments — lessonRef.current,
      // not the transcriptItems variable directly, since this callback has
      // an empty deps array and would otherwise freeze on a stale
      // transcript from before it loaded), not a guessed fixed-width time
      // window — lines vary in length, and a fixed window can span
      // multiple real lines or miss the actual boundary. Falls back to a
      // fixed window only for lessons with no transcript at all.
      if (currentTimeRef.current - newTime > 4) {
        const REWATCH_BURST_WINDOW_MS = 2.5 * 60 * 1000;
        const MIN_MS_BETWEEN_DISTINCT_REWINDS = 1000;
        const now = Date.now();
        const msSinceLastRewind = now - lastRewatchAtMsRef.current;

        if (lastRewatchAtMsRef.current !== 0 && msSinceLastRewind < MIN_MS_BETWEEN_DISTINCT_REWINDS) {
          lastRewatchToRef.current = newTime;
          lastRewatchAtMsRef.current = now;
          currentTimeRef.current = newTime;
          setProgress(prev => ({ ...prev, watched_seconds: newTime }));
          return;
        }

        const withinBurstWindow = lastRewatchAtMsRef.current !== 0 && msSinceLastRewind <= REWATCH_BURST_WINDOW_MS;

        rewatchCountRef.current = withinBurstWindow ? rewatchCountRef.current + 1 : 1;
        lastRewatchToRef.current = newTime;
        lastRewatchAtMsRef.current = now;

        console.debug(`[StruggleMonitor] Rewatch event recorded (count: ${rewatchCountRef.current}, to: ${newTime}s, delta: ${Math.round(msSinceLastRewind / 1000)}s)`);

        if (rewatchCountRef.current >= 2) {
          if (!canFireAutoStruggle()) {
            console.debug('[StruggleMonitor] Rewatch burst blocked by budget/cooldown', {
              count: autoStruggleCountRef.current,
              msSinceLast: Date.now() - lastAutoStruggleAtRef.current,
            });
          } else {
            const firedRewatchCount = rewatchCountRef.current;
            rewatchCountRef.current = 0;
            lastRewatchToRef.current = null;
            lastRewatchSegmentRef.current = null;
            console.debug('[StruggleMonitor] Rewatch burst — firing struggle check! rewatchCount =', firedRewatchCount);
            detectStruggleRef.current?.({ isManual: false, idleSeconds: 0, rewatchCount: firedRewatchCount });
          }
        }
      }
      
      // If the user scrubbed the video by more than 3 seconds (forward or backward),
      // they are at a new part of the lesson. Clear any active struggle event so that
      // if they click "Ask Mentor", it generates fresh context for this new timestamp
      // rather than reusing context from a previous auto-detected struggle.
      if (Math.abs(currentTimeRef.current - newTime) > 3) {
        setStruggleEventId(null);
        struggleEventIdRef.current = null;
      }
      
      currentTimeRef.current = newTime;
      setProgress(prev => ({ ...prev, watched_seconds: newTime }));
    }
  }, []);

  const handleDurationChange = useCallback((duration) => {
    console.log('handleDurationChange called with duration:', duration, 'displayLesson.durationSeconds:', displayLesson.durationSeconds);
    if (displayLesson.durationSeconds === 0 && duration > 0) {
      console.log('Updating lesson duration in state to:', duration);
      setLesson(prev => prev ? { ...prev, duration_seconds: duration } : prev);
    }
  }, [displayLesson.durationSeconds]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    // Clear inactivity timer when playback resumes
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    idleStartRef.current = null;
    
    // Clear the active struggle event when they resume playing,
    // so any future "Ask Mentor" gets fresh context for the new timestamp.
    setStruggleEventId(null);
    struggleEventIdRef.current = null;
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    const now = Date.now();
    const msSinceLastPause = now - lastPauseAtMsRef.current;

    // Ignore accidental rapid double clicks (< 500ms)
    if (lastPauseAtMsRef.current !== 0 && msSinceLastPause < 500) {
      return;
    }

    // 2.5-minute rolling window for pause bursts
    const PAUSE_BURST_WINDOW_MS = 2.5 * 60 * 1000;
    const withinBurstWindow = lastPauseAtMsRef.current !== 0 && msSinceLastPause <= PAUSE_BURST_WINDOW_MS;

    // Pausing again within 2.5 minutes is considered frequent pausing (struggle signal)
    pauseCountRef.current = withinBurstWindow ? pauseCountRef.current + 1 : 1;
    lastPauseAtSecRef.current = currentTimeRef.current;
    lastPauseAtMsRef.current = now;

    console.debug(`[StruggleMonitor] Pause event recorded (count: ${pauseCountRef.current}, time: ${currentTimeRef.current}s, delta: ${Math.round(msSinceLastPause / 1000)}s)`);

    // Auto-detect on pause threshold (>= 2 pauses in burst window)
    if (pauseCountRef.current >= 2) {
      if (!canFireAutoStruggle()) {
        console.debug('[StruggleMonitor] Pause burst blocked by budget/cooldown', {
          count: autoStruggleCountRef.current,
          msSinceLast: Date.now() - lastAutoStruggleAtRef.current,
        });
      } else {
        const firedPauseCount = pauseCountRef.current;
        pauseCountRef.current = 0;
        lastPauseSegmentRef.current = null;
        lastPauseAtSecRef.current = null;
        console.debug('[StruggleMonitor] Pause burst — firing struggle check! pauseCount =', firedPauseCount);
        detectStruggleRef.current?.({ idleSeconds: 0, pauseCount: firedPauseCount });
      }
    }
    // Start 2-minute inactivity timer
    idleStartRef.current = Date.now();
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      inactivityTimerRef.current = null;
      const idleSecs = Math.round((Date.now() - (idleStartRef.current ?? Date.now())) / 1000);
      if (canFireAutoStruggle()) {
        markAutoStruggleFired();
        detectStruggleRef.current?.({ idleSeconds: idleSecs });
      }
    }, 120_000);
  }, [canFireAutoStruggle, markAutoStruggleFired]);
  const selectChapter = id => setActiveChapter(id);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(speed);
    }
  }, [speed]);

  if (loading) {
    return (
      <div className="lesson-player" data-theme={theme}>
        <div className="lesson-player__header">
          <div className="lesson-player__header-left">
            <button className="button button--text button--back" onClick={() => navigate(-1)} type="button">
              ← Back
            </button>
            <div>
              <p className="lesson-player__eyebrow">Lesson player</p>
              <h1>Loading lesson…</h1>
            </div>
          </div>
        </div>
        <div className="lesson-player__content">
          <LoadingState message={`Fetching lesson content for ID ${lessonId || 'unknown'}.`} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lesson-player" data-theme={theme}>
        <div className="lesson-player__header">
          <div className="lesson-player__header-left">
            <button className="button button--text button--back" onClick={() => navigate(-1)} type="button">
              ← Back
            </button>
            <div>
              <p className="lesson-player__eyebrow">Lesson player</p>
              <h1>Lesson unavailable</h1>
            </div>
          </div>
        </div>
        <div className="lesson-player__content">
          <ErrorState 
            title="Invalid Lesson" 
            message={error} 
            onRetry={() => navigate('/dashboard')} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`lesson-player ${isFocusMode ? 'lesson-player--focus' : ''} ${isFocusMode && focusDrawerType ? 'drawer-open' : ''}`} data-theme={theme}>
      {isFocusMode && (
        <FocusModeHUD
          lessonTitle={displayLesson.title}
          attentionState={attentionState}
          isTrackingEnabled={isTrackingEnabled}
          activeDrawer={focusDrawerType}
          theme={theme}
          onExitFocusMode={() => {
            setIsFocusMode(false);
            setFocusDrawerType(null);
          }}
          onOpenMentor={() => setFocusDrawerType((prev) => (prev === 'mentor' ? null : 'mentor'))}
          onOpenNotes={() => setFocusDrawerType((prev) => (prev === 'notes' ? null : 'notes'))}
        />
      )}

      {/* Focus Mode Slide-Over Drawer for Mentor / Notes */}
      {isFocusMode && focusDrawerType && (
        <div 
          id="focus-mode-drawer"
          data-testid="focus-mode-drawer"
          className="focus-mode-drawer"
        >
          <div 
            id="focus-mode-drawer-header"
            data-testid="focus-mode-drawer-header"
            className="flex items-center justify-between px-4 py-3 border-b border-stone-800 text-stone-200 shrink-0 bg-stone-950/70"
          >
            <span id="focus-mode-drawer-title" data-testid="focus-mode-drawer-title" className="font-semibold text-sm flex items-center gap-2 text-stone-100">
              {focusDrawerType === 'mentor' ? '🤖 AI Mentor' : '📝 Personal Notes'}
            </span>
            <button
              id="focus-mode-drawer-close-btn"
              data-testid="focus-mode-drawer-close-btn"
              onClick={() => setFocusDrawerType(null)}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close drawer"
              title="Close drawer (Esc)"
            >
              ✕
            </button>
          </div>
          <div 
            id="focus-mode-drawer-content"
            data-testid="focus-mode-drawer-content"
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            {focusDrawerType === 'mentor' ? (
              <MentorPanel
                id="focus-mentor-panel"
                isDrawer={true}
                isOpen={true}
                isStruggle={isAutoDetected || showOverlay}
                isAutoDetected={isAutoDetected}
                reasonText={struggleReasonText}
                hints={hints}
                hintLoading={hintLoading}
                onGetHint={onGetHint}
                onClose={() => setFocusDrawerType(null)}
                onExpand={() => {}}
                onUnderstood={handleMentorUnderstood}
                onReplay={handleReplay30s}
              />
            ) : (
              <div className="drawer-notes-wrapper">
                <PersonalNotesPanel 
                  id="focus-notes-panel"
                  textareaId="focus-notes-textarea"
                  lessonId={lessonId} 
                  className="flex-1 min-h-0" 
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="lesson-player__header flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="lesson-player__header-left flex items-start gap-4">
          <button className="button button--text button--back shrink-0 mt-1" onClick={() => navigate(-1)} type="button" aria-label="Go back">
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-3">
              <p className="lesson-player__eyebrow mb-0">Lesson player</p>
            </div>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight mt-1 mb-1">{displayLesson.title || 'Lesson player'}</h1>
            {(displayLesson.course || displayLesson.module) && (
              <p className="lesson-player__subline text-stone-500 font-medium">
                {[displayLesson.course, displayLesson.module].filter(Boolean).join(' → ')}
              </p>
            )}
          </div>
        </div>

        <div className="lesson-player__actions flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            id="focus-mode-toggle-btn"
            data-testid="focus-mode-toggle-btn"
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 hover:from-indigo-500/25 hover:to-purple-500/25 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none shadow-sm cursor-pointer"
            type="button"
            onClick={() => setIsFocusMode(true)}
            title="Enter Focus Mode (Press F)"
            aria-label="Enter Focus Mode"
          >
            <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span>Focus Mode</span>
            <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-indigo-500/20 rounded text-indigo-700 dark:text-indigo-300 font-mono">F</kbd>
          </button>

          <GazeStatusPill 
            trackingState={trackingState}
            attentionState={attentionState}
            isTrackingEnabled={isTrackingEnabled}
            onEnableTracking={() => {
              setShowLivePreview(true);
              startTracking();
            }}
            onCalibrate={startCalibration}
          />
          {isTrackingEnabled && !showLivePreview && (
            <button 
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none" 
              type="button" 
              onClick={() => setShowLivePreview(true)}
              aria-label="Show live preview"
            >
              Show Camera
            </button>
          )}
          <button className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none" type="button" onClick={onManualMentor}>
            Ask mentor
          </button>
          <button className="px-4 py-2 bg-[var(--primary)] hover:opacity-90 text-white font-semibold rounded-xl transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:outline-none" type="button" onClick={handleMarkComplete}>
            Mark complete
          </button>
          <button className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none" onClick={toggle} aria-label="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {showOverlay && (
        <InterventionOverlay
          lessonTitle={displayLesson.title}
          severity={getInterventionSeverity(struggleEvent)}
          reasonText={struggleReasonText}
          onResume={() => setShowOverlay(false)}
          onHint={() => { setShowOverlay(false); setMentorOpen(true); handleGetHintRef.current?.('basic'); }}
          onExplain={() => { setShowOverlay(false); setMentorOpen(true); handleGetHintRef.current?.('example'); }}
          onHinglish={() => { setShowOverlay(false); setMentorOpen(true); handleGetHintRef.current?.('detailed', null, 'hinglish'); }}
          onReplay={() => {
            setShowOverlay(false);
            const seekTo = Math.max(0, currentTimeRef.current - 30);
            if (videoRef.current?.seekTo) videoRef.current.seekTo(seekTo);
            else if (videoRef.current) videoRef.current.currentTime = seekTo;
          }}
          onExpand={() => setMentorOpen(true)}
        />
      )}
      <div className="lesson-player__layout">
        <main className="lesson-player__main" ref={mainContainerRef}>
          <section className="card video-card">
            <div className="video-card__frame video-player-wrapper" id="video-player-container">
              <VideoPlayer
                src={displayLesson.videoUrl}
                videoRef={videoRef}
                speed={speed}
                initialTime={progress?.watched_seconds || 0}
                onPlay={handlePlay}
                onPause={handlePause}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
              />
            </div>
            
            {/* Visual Progression Bar beneath video — hidden in focus mode */}
          {!isFocusMode && (
            <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 overflow-hidden shrink-0">
              <div 
                className="h-full bg-[var(--primary)] transition-[width] duration-300 ease-out" 
                style={{ width: `${Math.max(0, Math.min(100, lessonProgress || 0))}%` }} 
              />
            </div>
          )}
          </section>

          {/* Mobile Camera Preview */}
          {isTrackingEnabled && showLivePreview && (
            <div className="sm:hidden mt-4">
              {/* BUG FIX: was passing onPauseTracking/onDisableTracking/
                  onTogglePreview — props LiveCameraPreview never destructures
                  (it reads isTrackingEnabled/onToggleTracking/
                  onSimulateFixation/onSimulateInactivity, matching the
                  desktop render further below). This call site never got
                  updated after that refactor, so on mobile the toggle
                  switch/simulate buttons were dead — clicking them did
                  nothing — and isTrackingEnabled being unset here forced
                  the component into its permanent "Off" visual state
                  regardless of real tracking status. Now matches the
                  desktop call site's API. */}
              <LiveCameraPreview
                stream={stream}
                trackingState={trackingState}
                attentionState={attentionState}
                isCalibrated={isCalibrated}
                isTrackingEnabled={isTrackingEnabled}
                onToggleTracking={() => {
                  if (isTrackingEnabled) {
                    stopTracking();
                    setShowLivePreview(false);
                  } else {
                    startTracking();
                  }
                }}
                onStartCalibration={startCalibration}
                onSimulateFixation={() => detectStruggleRef.current?.({ isManual: false, fixationMs: 8000, inactivityMs: 0, idleSeconds: 0 })}
                onSimulateInactivity={() => detectStruggleRef.current?.({ isManual: false, fixationMs: 0, inactivityMs: 60000, idleSeconds: 60 })}
              />
            </div>
          )}

          {/* Learning Tabs — hidden in focus mode */}
          {!isFocusMode && (
          <section className="learning-tabs hidden sm:flex flex-col tabs-container">
            <div className="learning-tabs__header">
              <button 
                className={`learning-tab__button ${activeTab === 'transcript' ? 'learning-tab__button--active' : ''}`}
                onClick={() => setActiveTab('transcript')}
              >
                Transcript
              </button>
              <button 
                className={`learning-tab__button ${activeTab === 'notes' ? 'learning-tab__button--active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                Notes
              </button>
              <button 
                className={`learning-tab__button ${activeTab === 'resources' ? 'learning-tab__button--active' : ''}`}
                onClick={() => setActiveTab('resources')}
              >
                Resources
              </button>
            </div>
            
            <div className="learning-tabs__content p-4 h-[400px] active-content">
              {activeTab === 'transcript' && (
                <div className="h-full relative overflow-hidden flex flex-col transcript-container" id="transcript-panel">
                  <TranscriptPanel 
                    segments={transcriptItems} 
                    currentTime={progress?.watched_seconds || 0} 
                    onSeek={handleSeek} 
                    lang={transcriptLang}
                    onLangChange={setTranscriptLang}
                    isLoading={isTranslating}
                  />
                </div>
              )}
              {activeTab === 'notes' && (
                <PersonalNotesPanel lessonId={lessonId} className="p-2" />
              )}
              {activeTab === 'resources' && (
                <StudyMaterialPanel
                  lessonId={lessonId}
                  pdfFilename={lesson?.pdf_filename}
                  notesContent={lesson?.notes_content}
                  isOwner={!!lesson?.is_owner}
                  onLessonUpdate={handleLessonUpdate}
                />
              )}
            </div>
          </section>
          )}

          {/* Mobile Tab Content — hidden in focus mode */}
          {!isFocusMode && (
          <section className="learning-tabs flex sm:hidden flex-col mt-4 tabs-container">
            <div className="learning-tabs__content p-4 h-[400px] active-content">
              {activeTab === 'transcript' && (
                <div className="h-full relative overflow-hidden flex flex-col transcript-container" id="transcript-panel">
                  <TranscriptPanel
                    segments={transcriptItems}
                    currentTime={progress?.watched_seconds || 0}
                    onSeek={handleSeek}
                    lang={transcriptLang}
                    onLangChange={setTranscriptLang}
                    isLoading={isTranslating}
                  />
                </div>
              )}

              {activeTab === 'notes' && (
                <PersonalNotesPanel lessonId={lessonId} placeholder="Type your notes here..." className="p-2" />
              )}

              {activeTab === 'resources' && (
                <StudyMaterialPanel
                  lessonId={lessonId}
                  pdfFilename={lesson?.pdf_filename}
                  notesContent={lesson?.notes_content}
                  isOwner={!!lesson?.is_owner}
                  onLessonUpdate={handleLessonUpdate}
                />
              )}
              
              {activeTab === 'mentor' && (
                <div className="h-full mentor-chat" id="mentor-panel">
                  <MentorPanel
                    isOpen={true}
                    isStruggle={isAutoDetected || showOverlay}
                    isAutoDetected={isAutoDetected}
                    reasonText={struggleReasonText}
                    hints={hints}
                    hintLoading={hintLoading}
                    onGetHint={onGetHint}
                    onClose={() => setActiveTab('transcript')}
                    onExpand={() => {}}
                    onUnderstood={handleMentorUnderstood}
                    onReplay={handleReplay30s}
                  />
                </div>
              )}
            </div>
          </section>
          )}
        </main>

        {!isFocusMode && (
        <aside className="lesson-player__sidebar hidden sm:block flex-col gap-4">
          {wsStatus === 'disconnected' && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm font-medium flex items-center justify-between border border-red-100">
              <span>Live connection lost. Some features may be delayed.</span>
              <button onClick={() => window.location.reload()} className="text-xs bg-white px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none">
                Retry
              </button>
            </div>
          )}
          
          {/* ── AI Mentor Panel ─────────────────────────────────────── */}
          <div className="hidden sm:flex flex-col gap-3 mentor-chat" id="mentor-panel">
            <MentorPanel
              isOpen={mentorOpen}
              isStruggle={isAutoDetected || showOverlay}
              isAutoDetected={isAutoDetected}
              reasonText={struggleReasonText}
              hints={hints}
              hintLoading={hintLoading}
              onGetHint={onGetHint}
              onClose={() => setMentorOpen(false)}
              onExpand={() => setMentorOpen(true)}
              onUnderstood={handleMentorUnderstood}
              onReplay={handleReplay30s}
            />
          </div>


          {/* Audio Mode Toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800 text-sm">Audio / Note-Taking Mode</h3>
              <button 
                onClick={() => setIsAudioMode(!isAudioMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${isAudioMode ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAudioMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              When enabled, gaze tracking is relaxed. You will receive periodic AI check-ins to verify engagement while taking notes.
            </p>
          </div>
          
          {/* Desktop Camera Preview */}

          <div className="mb-4">
            <LiveCameraPreview
              stream={stream}
              trackingState={trackingState}
              attentionState={attentionState}
              isCalibrated={isCalibrated}
              isTrackingEnabled={isTrackingEnabled}
              onToggleTracking={() => {
                if (isTrackingEnabled) {
                  stopTracking();
                } else {
                  startTracking();
                }
              }}
              onStartCalibration={startCalibration}
              onSimulateFixation={() => detectStruggleRef.current?.({ isManual: false, fixationMs: 8000, inactivityMs: 0, idleSeconds: 0 })}
              onSimulateInactivity={() => detectStruggleRef.current?.({ isManual: false, fixationMs: 0, inactivityMs: 60000, idleSeconds: 60 })}
            />
          </div>

        </aside>
        )}
      </div>

      
      {/* Audio Checkin Modal */}
      {checkinData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                🎧 Audio Check-In
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                You are in Audio / Note-Taking Mode. Answer this quick question to prove you're still listening!
              </p>
              
              {checkinData.loading && !checkinData.question ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-gray-500">Generating question from the last 3 minutes...</p>
                </div>
              ) : (
                <>
                  <div className="bg-indigo-50 text-indigo-900 p-4 rounded-lg font-medium mb-4">
                    {checkinData.question}
                  </div>
                  
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                    placeholder="Your answer..."
                    value={checkinData.answer}
                    onChange={(e) => setCheckinData(prev => ({ ...prev, answer: e.target.value }))}
                    disabled={checkinData.loading || checkinData.isCorrect === true}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && checkinData.answer.trim()) {
                        submitAudioCheckin();
                      }
                    }}
                  />
                  
                  {checkinData.feedback && (
                    <div className={`p-3 rounded-lg text-sm mb-4 flex items-start gap-2 ${checkinData.isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                      <span>{checkinData.isCorrect ? '✅' : '❌'}</span>
                      <span>{checkinData.feedback}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3 mt-2">
                    {checkinData.isCorrect === false && (
                      <button 
                        onClick={() => {
                          setCheckinData(null);
                          setIsPlaying(true);
                        }}
                        className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                      >
                        Skip & Resume
                      </button>
                    )}
                    
                    {!checkinData.isCorrect && (
                      <button
                        onClick={submitAudioCheckin}
                        disabled={!checkinData.answer?.trim() || checkinData.loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {checkinData.loading && checkinData.question ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : null}
                        Submit Answer
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {!isFocusMode && (
      <div className="lesson-player__mobile-bar sm:hidden">

        <button 
          type="button" 
          className={`button ${activeTab === 'transcript' ? 'button--primary' : 'button--muted'} button--full`} 
          onClick={() => setActiveTab('transcript')}
        >
          Transcript
        </button>
        <button 
          type="button" 
          className={`button ${activeTab === 'mentor' ? 'button--primary' : 'button--muted'} button--full relative`} 
          onClick={() => setActiveTab('mentor')}
        >
          AI Mentor
          {hints.length > 0 && activeTab !== 'mentor' && (
            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
          )}
        </button>
        <button 
          type="button" 
          className={`button ${activeTab === 'notes' ? 'button--primary' : 'button--muted'} button--full`} 
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
      </div>
      )}
    </div>
  );
}
