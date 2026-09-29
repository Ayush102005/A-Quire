import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, Volume2, CheckCircle2,
  Loader2, ChevronUp, Lightbulb, Layers, AlignLeft, Send,
  Sparkles, RotateCcw, VolumeX,
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

function UserMessageCard({ text }) {
  return (
    <div className="flex justify-end mt-2 mb-2">
      <div className="bg-teal-50 border border-teal-100 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-sm">
        <p className="text-sm text-stone-700 leading-relaxed">{text}</p>
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

function RealHintCard({ text, index, level, isNew, audioBase64, isMuted }) {
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
      className={`rounded-xl border bg-white transition-all duration-300 overflow-hidden ${
        isNew ? 'ring-1 ring-teal-300 border-teal-200' : 'border-stone-200'
      }`}
      aria-label={`Hint ${index + 1}`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50/60">
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            isNew ? 'bg-teal-700 text-white' : 'bg-stone-200 text-stone-500'
          }`}>
            {index + 1}
          </span>
          <span className="text-xs font-semibold text-stone-700">Hint {index + 1}</span>
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
      <div className="px-4 py-4 text-sm text-stone-700 leading-relaxed space-y-2">
        {renderLiteMarkdown(text)}
      </div>
    </div>
  );
}

function SupportCard({ title, body, icon: Icon, playingId, cardId, onToggleAudio }) {
  const isPlaying = playingId === cardId;
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50/60">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-stone-500" />
          <span className="text-xs font-semibold text-stone-700">{title}</span>
        </div>
        <AudioButton
          label={`Hear ${title}`}
          playing={isPlaying}
          onToggle={() => onToggleAudio(cardId)}
        />
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-stone-600 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-5 flex items-center gap-3">
      <Loader2 className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-2.5 bg-stone-200 rounded-full animate-pulse w-3/4" />
        <div className="h-2 bg-stone-100 rounded-full animate-pulse w-full" />
        <div className="h-2 bg-stone-100 rounded-full animate-pulse w-5/6" />
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
  isOpen, isStruggle, isAutoDetected = false,
  hints = [], hintLoading = false,
  onGetHint, onClose, onExpand, onUnderstood,
  // The real reason this was auto-detected (see
  // InterventionOverlay.jsx's getStruggleReasonText) — null falls back to
  // the generic copy below, same as before this existed.
  reasonText = null,
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
  const audioTimerRef = useRef(null);
  const bottomRef = useRef(null);
  const prevHintsLen = useRef(0);
  
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
  
  const handleUnderstood = () => { handleReset(); onUnderstood?.(); };

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
      className="flex flex-col bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden h-[450px] shrink-0"
      aria-label="AI Mentor panel"
      role="complementary"
    >

      {/* ── Panel Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text leading-none">AI Learning Mentor</h2>
            <p className="text-[11px] text-muted mt-1 font-medium">Guided Socratic Help</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMuted(!isMuted)}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            aria-label="Minimize mentor panel"
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 sm:hidden"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">

        <div className="px-3 py-4 space-y-4">

          {/* ── Empty state / Context card ──────────────────────────────── */}
            {hints.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface-soft overflow-hidden">
                <div className="px-4 py-4 text-center">
                  <BookOpen className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-text font-medium mb-1">How can I help?</p>
                  <p className="text-xs text-muted leading-relaxed">
                    Ask the AI mentor about this lesson. You can request an explanation, example, summary, or quick quiz.
                  </p>
                </div>
              </div>
            ) : isAutoDetected ? (
              // System auto-detected struggle — show amber alert banner.
              // Previously always said "noticed pauses or inactivity"
              // verbatim regardless of what actually triggered it
              // (sustained fixation, looking away, rewinding, pausing, or
              // idling are five very different signals) — reasonText
              // (from InterventionOverlay.jsx's getStruggleReasonText)
              // says the real one when it's known.
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 overflow-hidden">
                <div className="px-4 pt-3 pb-3">
                  <SectionLabel>A-Quire detected you may be stuck</SectionLabel>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    {reasonText
                      ? `We noticed ${reasonText}. Your AI mentor is ready to help — no pressure.`
                      : 'The system noticed pauses or inactivity. Your AI mentor is ready to help — no pressure.'}
                  </p>
                </div>
              </div>
            ) : (
              // Manual request — show a neutral, welcoming banner
              <div className="rounded-xl border border-teal-100 bg-teal-50/50 overflow-hidden">
                <div className="px-4 pt-3 pb-3">
                  <SectionLabel>AI Mentor</SectionLabel>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Here’s some guidance to help you work through this section.
                  </p>
                </div>
              </div>
            )}

            {/* ── Real hints from API ────────────────────────── */}
            {hints.map((hint, i) => {
              const isStudent = typeof hint === 'object' && hint.role === 'student';
              if (isStudent) {
                return <UserMessageCard key={i} text={hint.text} />;
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
                />
              );
            })}

            {/* ── Loading skeleton ──────────────────────────── */}
            {(loadingNext || hintLoading) && <LoadingCard />}

            {/* ── Response input (shown after first hint) ───── */}
            {mentorHints.length > 0 && !(loadingNext || hintLoading) && (
              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                <label htmlFor="mentor-response" className="block px-4 pt-3 pb-1">
                  <SectionLabel>Your thinking</SectionLabel>
                </label>
                <div className="px-3 pb-3">
                  <textarea
                    id="mentor-response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="What do you think so far? Even a rough idea helps."
                    rows={3}
                    className="w-full resize-none text-sm text-stone-700 placeholder-stone-300 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 outline-none focus:border-teal-300 focus:ring-1 focus:ring-teal-200 transition-all leading-relaxed"
                    aria-label="Type your response to the mentor"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-stone-300 font-medium">
                      {response.length > 0 ? `${response.length} chars` : 'No pressure — just think out loud'}
                    </span>
                    <button
                      onClick={handleSubmitResponse}
                      disabled={!response.trim() || loadingNext}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white border-stone-200 text-stone-600 hover:border-teal-300 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                      aria-label="Submit your response"
                    >
                      <Send className="w-3 h-3" /> Submit
                    </button>
                  </div>
                </div>
              </div>
            )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Footer actions ───────────────────────────────────────────── */}
      <div className="border-t border-stone-100 px-3 py-3 space-y-2 shrink-0 bg-white">

          {/* Support actions row */}
          {(stage === 'hint-1' || stage === 'hint-2') && !(loadingNext || hintLoading) && (
            <div className="flex gap-1.5 mb-1">
              <button
                onClick={() => { setShowAnalogy(true); setShowSimple(false); triggerHint('analogy'); }}
                aria-pressed={showAnalogy}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                  showAnalogy
                    ? 'bg-stone-100 border-stone-300 text-stone-700'
                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'
                }`}
              >
                <Layers className="w-3 h-3" /> Analogy
              </button>
              <button
                onClick={() => { setShowSimple(true); setShowAnalogy(false); triggerHint('simpler'); }}
                aria-pressed={showSimple}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                  showSimple
                    ? 'bg-stone-100 border-stone-300 text-stone-700'
                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'
                }`}
              >
                <AlignLeft className="w-3 h-3" /> Simpler
              </button>
            </div>
          )}

          {/* Primary CTA: I understood */}
          {mentorHints.length > 0 && !(loadingNext || hintLoading) && stage !== 'success' && (
            <button
              onClick={handleUnderstood}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
              aria-label="Confirm you understood and continue the lesson"
            >
              <CheckCircle2 className="w-4 h-4" />
              I understood — continue lesson
            </button>
          )}

          {/* Secondary CTA: Next hint */}
          {mentorHints.length > 0 && mentorHints.length < 3 && !(loadingNext || hintLoading) && stage !== 'success' && (
            <button
              onClick={handleNextHint}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              aria-label="Get the next hint"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Need another hint
            </button>
          )}

          {/* Idle state — first action */}
          {mentorHints.length === 0 && !(loadingNext || hintLoading) && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleFirstHint}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                aria-label="Get the first gentle hint"
              >
                <Sparkles className="w-4 h-4" />
                Start with a gentle hint
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => triggerHint('detailed')}
                  className="py-1.5 px-2 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Explain this part
                </button>
                <button
                  onClick={() => triggerHint('example')}
                  className="py-1.5 px-2 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Give an example
                </button>
                <button
                  onClick={() => triggerHint('quiz')}
                  className="py-1.5 px-2 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Quiz me
                </button>
                <button
                  onClick={() => triggerHint('summary')}
                  className="py-1.5 px-2 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Summarize so far
                </button>
                <button
                  onClick={() => triggerHint('confused')}
                  className="py-1.5 px-2 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors col-span-2"
                >
                  I am confused
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {(loadingNext || hintLoading) && (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 bg-stone-50 border border-stone-100 text-stone-400 text-sm font-medium rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
              Preparing next step…
            </div>
          )}
        </div>
    </aside>
  );
}
