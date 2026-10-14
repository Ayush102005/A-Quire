import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, Volume2, CheckCircle2,
  Loader2, ChevronUp, Lightbulb, Layers, AlignLeft, Send,
  Sparkles, RotateCcw, VolumeX, Mic, MicOff,
} from 'lucide-react';
import { renderLiteMarkdown } from '../../utils/renderLiteMarkdown';

// ─── Real-hint card ───────────────────────────────────────────────────────────
// Renders a hint returned from the AI mentor API

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">
      {children}
    </p>
  );
}

function AudioButton({ label, playing, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={playing ? 'Stop audio' : label}
      aria-pressed={playing}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
        playing
          ? 'bg-teal-700 text-white border-teal-700'
          : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700'
      }`}
    >
      <Volume2 className={`w-3 h-3 ${playing ? 'animate-pulse' : ''}`} />
      {playing ? 'Playing…' : 'Hear this'}
    </button>
  );
}

function UserMessageCard({ text, isDrawer = false }) {
  return (
    <div className="flex justify-end mt-2 mb-2">
      <div className={`rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-sm ${
        isDrawer 
          ? 'bg-teal-950/80 border border-teal-700/60 text-teal-100' 
          : 'bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-stone-800 dark:text-stone-100'
      }`}>
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

const LEVEL_LABELS = {
  basic:    '· Gentle nudge',
  detailed: '· Deeper guidance',
  example:  '· Worked example',
  custom:   '· Your question',
  quiz:     '· Quiz question',
  summary:  '· Summary',
  confused: '· Gentle nudge',
  analogy:  '· Analogy',
  simpler:  '· Simpler explanation',
};

function RealHintCard({ text, index, level, isNew, audioBase64, isMuted, isDrawer = false }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const playAudio = () => {
    if (!audioRef.current && audioBase64) {
      audioRef.current = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(e => console.error("Audio play failed:", e));
    }
  };

  const toggleAudio = () => {
    if (!audioBase64) return;
    
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      playAudio();
    }
  };

  useEffect(() => {
    if (isNew && audioBase64 && !isMuted) {
      playAudio();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, audioBase64]);

  return (
    <div
      className={`rounded-xl border transition-all duration-300 overflow-hidden ${
        isDrawer
          ? isNew ? 'ring-1 ring-teal-400/50 border-teal-500/40 bg-stone-900/90 text-stone-100' : 'border-stone-800 bg-stone-900/70 text-stone-100'
          : isNew ? 'ring-1 ring-teal-300 border-teal-200 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100' : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100'
      }`}
      aria-label={`Hint ${index + 1}`}
    >
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        isDrawer
          ? 'border-stone-800 bg-stone-800/60'
          : 'border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            isNew ? 'bg-teal-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
          }`}>
            {index + 1}
          </span>
          <span className={`text-xs font-semibold ${isDrawer ? 'text-stone-100' : 'text-stone-700 dark:text-stone-200'}`}>Hint {index + 1}</span>
          {level && (
            <span className="text-[10px] text-stone-400 font-medium">
              {LEVEL_LABELS[level] ?? ''}
            </span>
          )}
        </div>
        {audioBase64 && (
          <AudioButton
            label={`Hear Hint ${index + 1}`}
            playing={playing}
            onToggle={toggleAudio}
          />
        )}
      </div>
      <div className={`px-4 py-3.5 text-sm leading-relaxed space-y-2 ${
        isDrawer ? 'text-stone-100' : 'text-stone-800 dark:text-stone-100'
      }`}>
        {renderLiteMarkdown(text)}
      </div>
    </div>
  );
}

function SupportCard({ title, body, icon: Icon, playingId, cardId, onToggleAudio, isDrawer = false }) {
  const isPlaying = playingId === cardId;
  return (
    <div className={`rounded-xl border overflow-hidden ${
      isDrawer
        ? 'border-stone-800 bg-stone-900/70 text-stone-100'
        : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100'
    }`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        isDrawer
          ? 'border-stone-800 bg-stone-800/60'
          : 'border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40'
      }`}>
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-stone-400" />
          <span className={`text-xs font-semibold ${isDrawer ? 'text-stone-100' : 'text-stone-700 dark:text-stone-200'}`}>{title}</span>
        </div>
        <AudioButton
          label={`Hear ${title}`}
          playing={isPlaying}
          onToggle={() => onToggleAudio(cardId)}
        />
      </div>
      <div className="px-4 py-3">
        <p className={`text-sm leading-relaxed ${isDrawer ? 'text-stone-200' : 'text-stone-700 dark:text-stone-200'}`}>{body}</p>
      </div>
    </div>
  );
}

function LoadingCard({ isDrawer = false }) {
  return (
    <div className={`rounded-xl border px-4 py-4 flex items-center gap-3 ${
      isDrawer
        ? 'border-stone-800 bg-stone-900/60'
        : 'border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40'
    }`}>
      <Loader2 className="w-4 h-4 text-teal-500 animate-spin shrink-0" />
      <div className="space-y-2 flex-1">
        <div className={`h-2.5 rounded-full animate-pulse w-3/4 ${isDrawer ? 'bg-stone-700' : 'bg-stone-200 dark:bg-stone-700'}`} />
        <div className={`h-2 rounded-full animate-pulse w-full ${isDrawer ? 'bg-stone-800' : 'bg-stone-100 dark:bg-stone-800'}`} />
        <div className={`h-2 rounded-full animate-pulse w-5/6 ${isDrawer ? 'bg-stone-800' : 'bg-stone-100 dark:bg-stone-800'}`} />
      </div>
    </div>
  );
}

// ─── Minimized State ──────────────────────────────────────────────────────────

function MinimizedMentor({ isStruggle, onExpand }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onExpand}
        aria-label="Open AI Mentor panel"
        aria-expanded="false"
        className={`group flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
          isStruggle
            ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
        }`}
      >
        {/* Indicator dot */}
        {isStruggle && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
        )}
        <BookOpen className={`w-4 h-4 ${isStruggle ? 'text-amber-600' : 'text-teal-700'}`} />
        <span>AI Mentor</span>
        <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
      </button>
      {isStruggle && (
        <p className="text-[10px] font-semibold text-amber-600 text-center leading-tight">
          Needs attention
        </p>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function MentorPanel({
  isOpen, 
  isStruggle, 
  isAutoDetected = false,
  hints = [], 
  hintLoading = false,
  onGetHint, 
  onClose, 
  onExpand, 
  onUnderstood,
  // The real reason this was auto-detected (see
  // InterventionOverlay.jsx's getStruggleReasonText) — null falls back to
  // the generic copy below, same as before this existed.
  reasonText = null,
  isDrawer = false,
  id = 'mentor-panel',
}) {
  // panel scaffold state
  // 'idle' | 'loading' | 'hint-1' | 'hint-2' | 'success'
  const [stage, setStage] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [showAnalogy, setShowAnalogy] = useState(false);
  const [showSimple, setShowSimple] = useState(false);
  const [response, setResponse] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const audioTimerRef = useRef(null);
  const bottomRef = useRef(null);
  const prevHintsLen = useRef(0);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setResponse((prev) => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
        return;
      }
      try {
        // Explicitly request microphone permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Could not start recognition:", e);
        if (e.name === 'NotAllowedError') {
          alert("Microphone access was denied. Please allow microphone access in your browser settings.");
        } else {
          alert("Error starting voice input: " + e.message);
        }
        setIsListening(false);
      }
    }
  };
  
  const mentorHints = hints.filter(h => typeof h === 'string' || h.role !== 'student');

  const prevIsOpen = useRef(isOpen);

  // Reset stage whenever the panel transitions from closed → open,
  // so the user never lands on a stale "success" or loading screen.
  useEffect(() => {
    const wasOpen = prevIsOpen.current;
    prevIsOpen.current = isOpen;
    if (isOpen && !wasOpen) {
      setStage('idle');
      setShowAnalogy(false);
      setShowSimple(false);
      setResponse('');
      setLoadingNext(false);
    }
  }, [isOpen]);

  // Reset prevHintsLen when the hints array is externally cleared (new lesson
  // or "understood" flow), so the stage-advance effect fires correctly again.
  useEffect(() => {
    if (hints.length === 0) {
      prevHintsLen.current = 0;
    }
  }, [hints.length]);

  // Auto-scroll to bottom when content grows
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [stage, showAnalogy, showSimple, loadingNext]);

  // Advance stage automatically when a new hint arrives from the API
  useEffect(() => {
    if (hints.length > prevHintsLen.current) {
      prevHintsLen.current = hints.length;
      setLoadingNext(false);
      if (stage === 'idle' || stage === 'loading-hint') {
        setStage('hint-1');
      } else if (stage === 'hint-1' || stage === 'loading-detail') {
        setStage('hint-2');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hints.length]);

  const handleToggleAudio = (id) => {
    clearTimeout(audioTimerRef.current);
    if (playingId === id) { setPlayingId(null); return; }
    setPlayingId(id);
    audioTimerRef.current = setTimeout(() => setPlayingId(null), 4000);
  };

  const advanceStage = (next) => {
    // Used only as fallback when no onGetHint is wired
    setLoadingNext(true);
    setTimeout(() => { setLoadingNext(false); setStage(next); }, 1100);
  };

  const handleFirstHint = () => {
    if (onGetHint) {
      onGetHint('basic');
      setStage('loading-hint');
      setLoadingNext(true);
    } else {
      advanceStage('hint-1');
    }
  };

  const triggerHint = (type) => {
    if (onGetHint) {
      onGetHint(type);
      setStage('loading-hint');
      setLoadingNext(true);
    } else {
      advanceStage('hint-1');
    }
  };

  const handleNextHint = () => {
    if (onGetHint) {
      onGetHint('detailed');
      setStage('loading-detail');
      setLoadingNext(true);
    } else {
      advanceStage('hint-2');
    }
  };
  
  const handleSubmitResponse = () => {
    if (!response.trim() || !onGetHint) return;
    onGetHint('custom', response);
    setResponse('');
    setStage('loading-detail');
    setLoadingNext(true);
  };
  
  const handleUnderstood = () => {
    setStage('success');
    setPlayingId(null);
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    setTimeout(() => {
      setStage('idle');
    }, 2000);
    onUnderstood?.();
  };

  const handleReset = () => {
    setStage('idle');
    setShowAnalogy(false);
    setShowSimple(false);
    setResponse('');
    setPlayingId(null);
  };

  // ── Minimized ────────────────────────────────────────────────────────────────
  if (!isOpen) {
    return <MinimizedMentor isStruggle={isStruggle} onExpand={onExpand} />;
  }

  // ── Expanded ─────────────────────────────────────────────────────────────────
  return (
    <aside
      id={id}
      data-testid={id}
      className={`flex flex-col overflow-hidden ${
        isDrawer 
          ? 'h-full flex-1 bg-transparent border-0 shadow-none' 
          : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-sm h-[450px] shrink-0'
      }`}
      aria-label="AI Mentor panel"
      role="complementary"
    >

      {/* ── Panel Header / Subheader ───────────────────────────────── */}
      {isDrawer ? (
        <div className="flex items-center justify-between px-4 py-2 border-b border-stone-800/80 shrink-0 bg-stone-900/40 text-stone-300 text-xs">
          <span className="text-[11px] text-stone-400 font-medium">Guided Socratic Help · Focus Mode</span>
          <button
            id={`${id}-audio-toggle`}
            data-testid={`${id}-audio-toggle`}
            onClick={() => setIsMuted(!isMuted)}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/70 transition-colors text-[11px] cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-stone-500" /> : <Volume2 className="w-3.5 h-3.5 text-teal-400" />}
            <span>{isMuted ? 'Muted' : 'Voice on'}</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800 shrink-0 bg-white dark:bg-stone-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100 leading-none">AI Learning Mentor</h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-medium">Guided Socratic Help</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              id={`${id}-audio-toggle`}
              data-testid={`${id}-audio-toggle`}
              onClick={() => setIsMuted(!isMuted)}
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              id={`${id}-close-btn`}
              data-testid={`${id}-close-btn`}
              onClick={onClose}
              aria-label="Minimize mentor panel"
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 sm:hidden cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Scrollable body ──────────────────────────────────────── */}
      <div 
        id={`${id}-messages`}
        data-testid={`${id}-messages`}
        className="flex-1 overflow-y-auto min-h-0 scroll-smooth"
      >
        <div className="px-4 py-4 space-y-4">

          {/* ── Empty state / Context card ──────────────────────────────── */}
          {hints.length === 0 ? (
            <div 
              id={`${id}-empty-card`}
              data-testid={`${id}-empty-card`}
              className={`rounded-xl border overflow-hidden p-4 text-center ${
                isDrawer 
                  ? 'border-stone-800 bg-stone-900/60 text-stone-200' 
                  : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-800 dark:text-stone-100'
              }`}
            >
              <BookOpen className="w-8 h-8 text-teal-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold mb-1">How can I help?</p>
              <p className={`text-xs leading-relaxed mb-3 ${isDrawer ? 'text-stone-400' : 'text-stone-500 dark:text-stone-400'}`}>
                Ask the AI mentor about this lesson. You can request a simple explanation, an analogy, worked examples, or a quiz question.
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                <button 
                  onClick={() => triggerHint('confused')}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                    isDrawer 
                      ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700/60' 
                      : 'bg-stone-200/70 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200'
                  }`}
                >
                  I'm confused
                </button>
                <button 
                  onClick={() => triggerHint('example')}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                    isDrawer 
                      ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700/60' 
                      : 'bg-stone-200/70 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200'
                  }`}
                >
                  Give an example
                </button>
                <button 
                  onClick={() => triggerHint('simpler')}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                    isDrawer 
                      ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700/60' 
                      : 'bg-stone-200/70 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200'
                  }`}
                >
                  Explain simply
                </button>
              </div>
            </div>
          ) : isAutoDetected ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 overflow-hidden">
              <div className="px-4 pt-3 pb-3">
                <SectionLabel>A-Quire detected you may be stuck</SectionLabel>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {reasonText
                    ? `We noticed ${reasonText}. Your AI mentor is ready to help — no pressure.`
                    : 'The system noticed pauses or inactivity. Your AI mentor is ready to help — no pressure.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-200 overflow-hidden">
              <div className="px-4 pt-3 pb-3">
                <SectionLabel>AI Mentor</SectionLabel>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Here’s some guidance to help you work through this section.
                </p>
              </div>
            </div>
          )}

          {/* ── Real hints from API ────────────────────────── */}
          {hints.map((hint, i) => {
            const isStudent = typeof hint === 'object' && hint.role === 'student';
            if (isStudent) {
              return <UserMessageCard key={i} text={hint.text} isDrawer={isDrawer} />;
            }
            const hintText = typeof hint === 'string' ? hint : hint.text;
            const hintLevel = typeof hint === 'object' ? hint.level : undefined;
            const mentorIndex = hints.slice(0, i).filter(h => typeof h === 'string' || h.role !== 'student').length;
            return (
              <RealHintCard
                key={i}
                text={hintText}
                index={mentorIndex}
                level={hintLevel}
                isNew={i === hints.length - 1 && (stage === 'hint-1' || stage === 'hint-2')}
                audioBase64={hint.audio_base64}
                isMuted={isMuted}
                isDrawer={isDrawer}
              />
            );
          })}

          {/* ── Loading skeleton ──────────────────────────── */}
          {(loadingNext || hintLoading) && <LoadingCard isDrawer={isDrawer} />}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Chatbot Footer ───────────────────────────────────────────── */}
      <div className={`px-3 py-3 space-y-3 shrink-0 ${
        isDrawer 
          ? 'border-t border-stone-800 bg-stone-950/80 backdrop-blur-md' 
          : 'border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900'
      }`}>
        
        {/* Quick Actions */}
        {!(loadingNext || hintLoading) && (
          <div id={`${id}-quick-actions`} data-testid={`${id}-quick-actions`} className="flex gap-2">
            {mentorHints.length === 0 ? (
              <button
                id={`${id}-confused-btn`}
                data-testid={`${id}-confused-btn`}
                onClick={() => triggerHint('confused')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  isDrawer
                    ? 'text-stone-300 bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700'
                    : 'text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                I am confused
              </button>
            ) : stage === 'success' ? (
              <div
                id={`${id}-understood-success`}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Great! Continuing lesson...
              </div>
            ) : (
              <button
                id={`${id}-understood-btn`}
                data-testid={`${id}-understood-btn`}
                onClick={handleUnderstood}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> I understood — continue lesson
              </button>
            )}
          </div>
        )}

        {/* Input Area */}
        <div 
          id={`${id}-input-container`}
          data-testid={`${id}-input-container`}
          className={`flex items-end gap-2 rounded-xl px-2.5 py-2 transition-all ${
            isDrawer
              ? 'bg-stone-900/90 border border-stone-700/80 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-400/50'
              : 'bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-400/50'
          }`}
        >
          <textarea
            id="mentor-response"
            data-testid="mentor-response"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your question..."
            rows={1}
            className={`flex-1 resize-none bg-transparent outline-none text-sm placeholder-stone-400 max-h-24 overflow-y-auto leading-relaxed py-1 px-1 ${
              isDrawer ? 'text-stone-100' : 'text-stone-800 dark:text-stone-100'
            }`}
            aria-label="Type your response to the mentor"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitResponse();
              }
            }}
          />
          <div className="flex items-center gap-1 shrink-0 pb-0.5">
            <button
              id={`${id}-mic-btn`}
              data-testid={`${id}-mic-btn`}
              onClick={toggleListening}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isListening 
                  ? 'bg-red-500/20 text-red-400 animate-pulse' 
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
              title={isListening ? "Listening..." : "Use voice input"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              id={`${id}-send-btn`}
              data-testid={`${id}-send-btn`}
              onClick={handleSubmitResponse}
              disabled={!response.trim() || loadingNext || hintLoading}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-teal-600 hover:bg-teal-500 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 cursor-pointer"
              aria-label="Submit your response"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
