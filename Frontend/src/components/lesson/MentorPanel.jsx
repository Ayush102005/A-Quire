import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, Volume2, CheckCircle2,
  Loader2, ChevronUp, Lightbulb, Layers, AlignLeft, Send,
  Sparkles, RotateCcw,
} from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const CONTEXT = {
  concept: "Boltzmann's Formula",
  why: "The system noticed several pauses near this segment. This is one of the most conceptually dense points in the lesson — that's normal.",
};

const HINTS = [
  {
    level: 1,
    label: 'Hint 1',
    tone: 'Gentle nudge',
    prompt: 'What is Ω counting?',
    body: 'Try thinking of Ω not as a physical thing, but as a count. If you have 4 molecules in a box, how many distinct arrangements are possible in the left half versus the whole box?',
    audioLabel: 'Hear Hint 1',
  },
  {
    level: 2,
    label: 'Hint 2',
    tone: 'Stronger support',
    prompt: 'Why does ln appear in the formula?',
    body: 'Entropy must be additive — combining two systems should add their entropies. But microstates multiply. There is exactly one function that converts multiplication into addition. Which one?',
    audioLabel: 'Hear Hint 2',
  },
];

const ANALOGY = {
  title: 'Analogy: The Library',
  body: 'Imagine a library with 1,000 books. There is only one way for all books to be perfectly sorted. But there are millions of ways for them to be "messy". Entropy is that count of messy arrangements — and nature drifts toward mess simply because mess is overwhelmingly more probable.',
};

const SIMPLE = {
  title: 'Simpler Explanation',
  body: 'S = k · ln(Ω) says: entropy is a measure of how many ways a system can be arranged. More arrangements = higher entropy. Systems naturally move toward high entropy states not because of a force, but because high-entropy states are astronomically more likely.',
};

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

function HintCard({ hint, isNew, playingId, onToggleAudio }) {
  const isPlaying = playingId === hint.level;
  return (
    <div
      className={`rounded-xl border bg-white transition-all duration-300 overflow-hidden ${
        isNew ? 'ring-1 ring-teal-300 border-teal-200' : 'border-stone-200'
      }`}
      aria-label={`${hint.label}: ${hint.prompt}`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50/60">
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            isNew ? 'bg-teal-700 text-white' : 'bg-stone-200 text-stone-500'
          }`}>
            {hint.level}
          </span>
          <span className="text-xs font-semibold text-stone-700">{hint.label}</span>
          <span className="text-[10px] text-stone-400 font-medium">· {hint.tone}</span>
        </div>
        <AudioButton
          label={hint.audioLabel}
          playing={isPlaying}
          onToggle={() => onToggleAudio(hint.level)}
        />
      </div>

      {/* Prompt */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide mb-1.5">
          Consider this →
        </p>
        <p className="text-sm font-semibold text-stone-800 mb-2 leading-snug">
          {hint.prompt}
        </p>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        <p className="text-sm text-stone-600 leading-relaxed">
          {hint.body}
        </p>
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

function SuccessState({ onReset }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-800 mb-1">Great — keep going</p>
        <p className="text-xs text-stone-400 leading-relaxed max-w-[200px] mx-auto">
          The lesson will resume. Your mentor is still here if you need support later.
        </p>
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 hover:text-stone-600 transition-colors mt-2"
        aria-label="Revisit hints"
      >
        <RotateCcw className="w-3 h-3" /> Revisit hints
      </button>
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
  onClose,
  onExpand,
  onUnderstood,
}) {
  // panel scaffold state
  // 'idle' | 'loading' | 'hint-1' | 'hint-2' | 'success'
  const [stage, setStage] = useState(isStruggle ? 'idle' : 'idle');
  const [showAnalogy, setShowAnalogy] = useState(false);
  const [showSimple, setShowSimple] = useState(false);
  const [response, setResponse] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const audioTimerRef = useRef(null);
  const bottomRef = useRef(null);

  // Reset when panel opens fresh on struggle
  useEffect(() => {
    if (isOpen && isStruggle && stage === 'idle') {
      // auto-show first hint after brief pause
    }
  }, [isOpen, isStruggle]);

  // Auto-scroll to bottom when content grows
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [stage, showAnalogy, showSimple, loadingNext]);

  const handleToggleAudio = (id) => {
    clearTimeout(audioTimerRef.current);
    if (playingId === id) { setPlayingId(null); return; }
    setPlayingId(id);
    audioTimerRef.current = setTimeout(() => setPlayingId(null), 4000);
  };

  const advanceStage = (next) => {
    setLoadingNext(true);
    setTimeout(() => {
      setLoadingNext(false);
      setStage(next);
    }, 1100);
  };

  const handleFirstHint = () => advanceStage('hint-1');
  const handleNextHint = () => advanceStage('hint-2');
  const handleUnderstood = () => { setStage('success'); onUnderstood?.(); };

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
      className="flex flex-col bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden h-full"
      aria-label="AI Mentor panel"
      role="complementary"
    >

      {/* ── Panel Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-teal-700" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-800 leading-none">AI Mentor</h2>
            <p className="text-[10px] text-stone-400 mt-0.5 font-medium">Guided Socratic Help</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Minimize mentor panel"
          className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">

        {/* Success state */}
        {stage === 'success' ? (
          <SuccessState onReset={handleReset} />
        ) : (
          <div className="px-3 py-4 space-y-4">

            {/* ── Context card ──────────────────────────────── */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 overflow-hidden">
              <div className="px-4 pt-3 pb-1">
                <SectionLabel>You may be stuck on</SectionLabel>
                <p className="text-sm font-bold text-stone-900 leading-snug mb-2">
                  {CONTEXT.concept}
                </p>
              </div>
              <div className="px-4 pb-3">
                <p className="text-xs text-stone-500 leading-relaxed">
                  {CONTEXT.why}
                </p>
              </div>
            </div>

            {/* ── Hint 1 ────────────────────────────────────── */}
            {(stage === 'hint-1' || stage === 'hint-2') && (
              <HintCard
                hint={HINTS[0]}
                isNew={stage === 'hint-1'}
                playingId={playingId}
                onToggleAudio={handleToggleAudio}
              />
            )}

            {/* ── Hint 2 ────────────────────────────────────── */}
            {stage === 'hint-2' && (
              <HintCard
                hint={HINTS[1]}
                isNew={true}
                playingId={playingId}
                onToggleAudio={handleToggleAudio}
              />
            )}

            {/* ── Loading skeleton ──────────────────────────── */}
            {loadingNext && <LoadingCard />}

            {/* ── Support cards ─────────────────────────────── */}
            {showAnalogy && !loadingNext && (
              <SupportCard
                title="Analogy"
                body={ANALOGY.body}
                icon={Layers}
                playingId={playingId}
                cardId="analogy"
                onToggleAudio={handleToggleAudio}
              />
            )}

            {showSimple && !loadingNext && (
              <SupportCard
                title="Simpler Explanation"
                body={SIMPLE.body}
                icon={AlignLeft}
                playingId={playingId}
                cardId="simple"
                onToggleAudio={handleToggleAudio}
              />
            )}

            {/* ── Response input (shown after hint-1) ───────── */}
            {(stage === 'hint-1' || stage === 'hint-2') && !loadingNext && (
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
                      disabled={!response.trim()}
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
        )}
      </div>

      {/* ── Footer actions (hidden in success) ──────────────────── */}
      {stage !== 'success' && (
        <div className="border-t border-stone-100 px-3 py-3 space-y-2 shrink-0 bg-white">

          {/* Support actions row */}
          {(stage === 'hint-1' || stage === 'hint-2') && (
            <div className="flex gap-1.5 mb-1">
              <button
                onClick={() => { setShowAnalogy(true); setShowSimple(false); }}
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
                onClick={() => { setShowSimple(true); setShowAnalogy(false); }}
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
          {(stage === 'hint-1' || stage === 'hint-2') && (
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
          {stage === 'hint-1' && !loadingNext && (
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
          {stage === 'idle' && !loadingNext && (
            <button
              onClick={handleFirstHint}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
              aria-label="Get the first gentle hint"
            >
              <Sparkles className="w-4 h-4" />
              Start with a gentle hint
            </button>
          )}

          {/* Loading state */}
          {loadingNext && (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 bg-stone-50 border border-stone-100 text-stone-400 text-sm font-medium rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
              Preparing next step…
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
