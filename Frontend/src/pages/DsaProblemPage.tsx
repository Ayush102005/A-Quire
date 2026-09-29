import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Play, Send, CheckCircle2, XCircle,
  Lightbulb, BrainCircuit, Maximize2, Minimize2,
  Terminal, Loader2, Sparkles, BookOpen, Volume2, Eye, EyeOff
} from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import { useGaze } from '../contexts/GazeProvider';
import { AttentionState } from '../utils/gazeState';
import GazeStatusPill from '../components/GazeStatusPill';
import { LoadingState, ErrorState } from '../components/UXStates';
import ConfidenceSelector from '../components/ConfidenceSelector';
import { renderLiteMarkdown } from '../utils/renderLiteMarkdown';
import { api, getCurrentUser } from '../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Example {
  input: string;
  output: string;
  explanation?: string;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  // Approaches/reference code/complexity for lesson-authored (non-bank)
  // problems — deliberately kept separate from `description` and rendered
  // behind a collapsed-by-default reveal (see SolutionSection) instead of
  // being shown immediately alongside the problem statement, which would
  // hand a student the answer before they'd tried it themselves.
  solution?: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  examples: Example[];
  constraints: string[];
  starter_code_by_language: Record<string, string>;
  test_cases: any[];
}

interface TestResult {
  passed: boolean;
  expected: string;
  actual: string;
  execution_time_ms: number;
  memory_kb: number;
}

interface RunResult {
  status: 'SUCCESS' | 'WRONG_ANSWER' | 'ERROR' | 'LANGUAGE_NOT_SUPPORTED' | 'NO_TEST_CASES';
  output: string;
  test_results: TestResult[];
}

interface SubmitResult {
  verdict: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR';
  message: string;
  test_results: TestResult[];
}

const LANGUAGES = [
  { id: 'java', label: 'Java', monacoLang: 'java' },
  { id: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { id: 'python', label: 'Python', monacoLang: 'python' },
  { id: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
];

const DIFFICULTY_COLORS = {
  Easy: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400',
  Medium: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
  Hard: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400',
};

// ─── Components ───────────────────────────────────────────────────────────────

// Collapsed by default on purpose — approaches/reference code answer the
// problem outright, so showing them inline with the problem statement (the
// previous behavior) spoiled the answer before a student had a chance to
// attempt it themselves. An explicit click is the same "reveal spoiler"
// pattern most judge platforms use for this exact content.
const SolutionSection: React.FC<{ solution: string }> = ({ solution }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="mb-8 border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setRevealed(r => !r)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface)] transition-colors text-left"
      >
        <span className="font-semibold text-sm text-[var(--text)]">Approach &amp; Solution</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
          {revealed ? <><EyeOff className="w-3.5 h-3.5" />Hide</> : <><Eye className="w-3.5 h-3.5" />Show</>}
        </span>
      </button>
      {revealed && (
        <div className="prose prose-stone dark:prose-invert max-w-none text-[var(--text)] p-4 space-y-2">
          {renderLiteMarkdown(solution)}
        </div>
      )}
    </div>
  );
};

const ProblemStatement: React.FC<{ problem: Problem, confidence: number | null, setConfidence: (v: number) => void, onSuggestTestCase: () => void }> = ({ problem, confidence, setConfidence, onSuggestTestCase }) => (
  <div className="flex-1 overflow-y-auto p-6 bg-[var(--card-bg)] border-r border-[var(--border)] custom-scrollbar flex flex-col">
    <div className="flex-1">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-[var(--text)]">{problem.title}</h1>
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${DIFFICULTY_COLORS[problem.difficulty]}`}>
          {problem.difficulty}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {problem.tags.map(tag => (
          <span key={tag} className="px-2 py-1 bg-[var(--surface-2)] text-[var(--text-muted)] text-xs rounded-md border border-[var(--border)]">
            {tag}
          </span>
        ))}
      </div>

      {/* Was rendering the raw string directly — instructor-authored DSA
          content (see the lesson.problem_statement/approaches/code_solutions
          fold-in this page's own fetch effect does) routinely contains
          markdown headings and fenced code blocks, which showed up as
          literal "##"/"```cpp" text instead of being rendered. */}
      <div className="prose prose-stone dark:prose-invert max-w-none text-[var(--text)] mb-8 space-y-2">
        {renderLiteMarkdown(problem.description)}
      </div>

      {problem.examples.length > 0 && problem.examples.map((ex, idx) => (
        <div key={idx} className="mb-6">
          <p className="font-semibold text-[var(--text)] mb-2">Example {idx + 1}:</p>
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4 font-mono text-sm text-[var(--text)]">
            <p><span className="text-[var(--text-muted)]">Input:</span> {ex.input}</p>
            <p><span className="text-[var(--text-muted)]">Output:</span> {ex.output}</p>
            {ex.explanation && (
              <p className="mt-2 text-stone-600 dark:text-stone-400"><span className="text-[var(--text-muted)]">Explanation:</span> {ex.explanation}</p>
            )}
          </div>
        </div>
      ))}

      {problem.constraints.length > 0 && (
        <div className="mb-8">
          <p className="font-semibold text-[var(--text)] mb-2">Constraints:</p>
          <ul className="list-disc list-inside text-sm text-[var(--text)] space-y-1 bg-[var(--surface-2)] p-4 rounded-lg border border-[var(--border)] font-mono">
            {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      
      {problem.solution && <SolutionSection solution={problem.solution} />}
      
      <div className="mt-8 pt-4 border-t border-[var(--border)]">
        <button 
          onClick={() => onSuggestTestCase()}
          className="text-sm text-teal-400 hover:text-teal-300 font-medium flex items-center gap-2"
        >
          <Lightbulb className="w-4 h-4" />
          Suggest a missing test case
        </button>
      </div>

    </div>
    
    <div className="mt-auto pt-4 border-t border-[var(--border)]">
      <ConfidenceSelector value={confidence} onChange={setConfidence} disabled={false} />
    </div>
  </div>
);

interface DsaHintMessage {
  role: 'student' | 'mentor';
  text: string;
  // Amazon Polly audio for this hint, if AWS credentials are configured
  // server-side (see mentor_service.py's _generate_audio()) — base64 mp3,
  // undefined/null otherwise. MentorPanel.jsx (LessonPlayer's mentor
  // panel) already plays this; this panel never read it off the hint
  // response at all, so DSA/practice hints never had audio even once
  // Polly was configured.
  audioBase64?: string | null;
}

// Plays a hint's Polly audio on demand. Self-contained (own audio element +
// playing state) since this panel has no shared mute/auto-play state the
// way MentorPanel.jsx does — each hint bubble just gets its own toggle.
const HintAudioButton: React.FC<{ audioBase64: string }> = ({ audioBase64 }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(e => console.error('Audio play failed:', e));
    }
  };

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  return (
    <button
      onClick={toggle}
      aria-label={playing ? 'Stop audio' : 'Hear this hint'}
      aria-pressed={playing}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 mb-2 ${
        playing
          ? 'bg-indigo-700 text-white border-indigo-700'
          : 'bg-white dark:bg-transparent text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400'
      }`}
    >
      <Volume2 className={`w-3 h-3 ${playing ? 'animate-pulse' : ''}`} />
      {playing ? 'Playing…' : 'Hear this'}
    </button>
  );
};

const HintAndDiagnosticsPanel: React.FC<{
  expanded: boolean,
  onToggle: () => void,
  hints: DsaHintMessage[],
  loading: boolean,
  error: string | null,
  message: string,
  onMessageChange: (v: string) => void,
  onSend: () => void,
}> = ({ expanded, onToggle, hints, loading, error, message, onMessageChange, onSend }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (expanded) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [expanded, hints.length, loading, error]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline — matches the convention
    // most chat inputs use, so it doesn't need its own explanation.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={`border-t border-[var(--border)] bg-[var(--card-bg)] transition-all duration-300 flex flex-col ${expanded ? 'h-96' : 'h-12'}`}>
      <button
        onClick={onToggle}
        className="h-12 shrink-0 flex items-center justify-between px-6 hover:bg-[var(--surface-2)] transition-colors w-full"
      >
        <div className="flex items-center gap-2 font-medium text-[var(--text)]">
          <BrainCircuit className="w-5 h-5 text-indigo-500" />
          AI Diagnostics & Hints
        </div>
        {expanded ? <Minimize2 className="w-4 h-4 text-[var(--text-muted)]" /> : <Maximize2 className="w-4 h-4 text-[var(--text-muted)]" />}
      </button>

      {expanded && (
        <>
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 space-y-4">
            {hints.length === 0 && !loading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-1">AI Mentor</h4>
                  <p className="text-sm text-indigo-800/80 dark:text-indigo-400/80 leading-relaxed">
                    Struggling with this problem? Ask a specific question below, or keep working — a hint
                    will appear here if the AI mentor notices you're stuck.
                  </p>
                </div>
              </div>
            )}

            {hints.map((h, i) =>
              h.role === 'student' ? (
                <div key={i} className="flex justify-end">
                  <div className="bg-white dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-sm">
                    <p className="text-sm text-[var(--text)] leading-relaxed">{h.text}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-sm text-indigo-800/80 dark:text-indigo-400/80 leading-relaxed space-y-2">
                    {h.audioBase64 && <HintAudioButton audioBase64={h.audioBase64} />}
                    {renderLiteMarkdown(h.text)}
                  </div>
                </div>
              )
            )}

            {loading && (
              <p className="text-sm text-indigo-800/80 dark:text-indigo-400/80 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
              </p>
            )}
            {/* Previously a failed request just logged to the console and
                left this panel looking identical to "nothing to show yet"
                — no way to tell a real failure from normal idle state, or
                to know a retry might help. */}
            {!loading && error && (
              <div className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2.5">
                <span className="flex-1">{error}</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Custom message input — always available, not gated behind an
              auto-detected hint first. Mirrors LessonPlayer's MentorPanel
              chat input; sends via hint_level="custom" so the backend
              answers the actual question instead of a generic nudge. */}
          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--card-bg)] p-3 flex items-end gap-2">
            <textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI mentor anything about this problem..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none text-sm text-[var(--text)] placeholder-[var(--text-faint)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all leading-relaxed disabled:opacity-60"
              aria-label="Ask the AI mentor a question"
            />
            <button
              onClick={onSend}
              disabled={!message.trim() || loading}
              className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message to AI mentor"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function DsaProblemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // False for a lesson-authored DSA problem (no test cases / judge behind
  // it — see the fetch effect below) — Run/Submit are disabled in that
  // case rather than left clickable against an endpoint that will 404.
  const [isJudgeAvailable, setIsJudgeAvailable] = useState(true);
  // From the lesson fetch below (content.py's get_lesson() now attaches
  // it). Without this, every struggle-monitor call from this page left
  // StruggleEvent.course_id NULL — invisible to every instructor-dashboard
  // query that filters by course_id (Recent Activity, Total Struggles, AI
  // Interventions, Resolution Rate, At-Risk Students all do), which is why
  // DSA activity never showed up there even though the events themselves
  // existed (the lesson-hotspot table was unaffected — it joins through
  // lesson_id/problem_id, never course_id).
  const [courseId, setCourseId] = useState<number | null>(null);
  
  const [language, setLanguage] = useState(LANGUAGES[2].id); // python by default
  const [code, setCode] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  // Contribution State
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeInput, setContributeInput] = useState('');
  const [contributeExpected, setContributeExpected] = useState('');
  const [contributeExplanation, setContributeExplanation] = useState('');
  const [isContributing, setIsContributing] = useState(false);

  const handleContribute = async () => {
    if (!contributeInput || !contributeExpected) return;
    try {
      setIsContributing(true);
      await api.problems.contributeTestCase(problem.id, {
        input: contributeInput,
        expected: contributeExpected,
        explanation: contributeExplanation
      });
      setShowContributeModal(false);
      setContributeInput('');
      setContributeExpected('');
      setContributeExplanation('');
      alert('Test case submitted for review!');
    } catch (e) {
      console.error(e);
      alert('Failed to submit test case');
    } finally {
      setIsContributing(false);
    }
  };

  // Which sample case tab is selected (0-indexed)
  const [activeCase, setActiveCase] = useState(0);

  // 'testcase' = shows sample inputs; 'results' = shows run/submit output
  const [activeTab, setActiveTab] = useState<'testcase' | 'results'>('testcase');
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);

  // -- Gaze Integration --
  const { setFixationCallback, setInactivityCallback, isActive, gazeQuality, retryInit, requestTracking, attentionState } = useGaze();

  // Start gaze tracking as soon as this page opens rather than waiting for
  // a manual toggle — requestTracking() still respects consent (shows the
  // permission modal first-time, starts immediately if already granted).
  // See LessonPlayer.jsx / GazeProvider.jsx for why this lives per-page
  // rather than as a blanket effect in GazeProvider.
  useEffect(() => {
    requestTracking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [struggleEventId, setStruggleEventId] = useState<number | null>(null);
  const [dsaHints, setDsaHints] = useState<DsaHintMessage[]>([]);
  const [hintMessage, setHintMessage] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  // A failed hint request previously just logged to the console and left
  // the panel looking blank — "empty" and "broke silently" are
  // indistinguishable from the outside, and there was no way to tell them
  // apart or retry. See handleRequestHint's catch block.
  const [hintError, setHintError] = useState<string | null>(null);

  // aiHint/struggleEventId mirrored into refs so the fixation callback can
  // read current values without needing to be in the effect below.
  const aiHintRef = useRef(aiHint);
  const struggleEventIdRef = useRef(struggleEventId);
  useEffect(() => { aiHintRef.current = aiHint; }, [aiHint]);
  useEffect(() => { struggleEventIdRef.current = struggleEventId; }, [struggleEventId]);

  // problem/isJudgeAvailable mirrored the same way, for the same reason —
  // see the struggle-monitor call below: it needs the *real* problem
  // identifier (bank slug when linked, this lesson's own id otherwise),
  // not the fixation effect's stale initial-render values.
  const problemRef = useRef(problem);
  const isJudgeAvailableRef = useRef(isJudgeAvailable);
  const courseIdRef = useRef(courseId);
  useEffect(() => { problemRef.current = problem; }, [problem]);
  useEffect(() => { isJudgeAvailableRef.current = isJudgeAvailable; }, [isJudgeAvailable]);
  useEffect(() => { courseIdRef.current = courseId; }, [courseId]);

  // Fixation ("confusion") detection: setFixationCallback/setInactivityCallback
  // below are dead — GazeProvider.jsx's adapter stubs them out ("deprecated
  // in the new version") and nothing in useGazeTracker.js ever invokes a
  // registered callback. Registering one here did nothing on either
  // tracker mode; confusion detection structurally never fired at all.
  // The actual, working signal is attentionState reaching FIXATED (see
  // LessonPlayer.jsx's identical fix) — react to that directly instead.
  const isFixationHandledRef = useRef(false);
  useEffect(() => {
    if (attentionState !== AttentionState.FIXATED) {
      isFixationHandledRef.current = false;
      return;
    }
    if (isFixationHandledRef.current || aiHintRef.current || struggleEventIdRef.current || !id) return;
    isFixationHandledRef.current = true;

    (async () => {
      const user = getCurrentUser();
      if (!user) return;
      try {
        // problem_id must be the real problem-bank slug (e.g. "two-sum"),
        // not this page's URL id — the URL id is always a Lesson id (see
        // the fetch effect above), which never matches a bank slug. That
        // mismatch meant the backend's context lookup (get_problem) always
        // missed and silently returned its generic unknown-slug fallback —
        // Claude was then asked for a hint on a problem it was told
        // nothing real about, hence the generic, could-apply-to-anything
        // advice. Send problem_id only when actually bank-linked;
        // otherwise send lesson_id so the backend can pull this lesson's
        // own problem_statement/examples/constraints instead (see
        // mentor_service.py's generate_hint()).
        const targetIds = isJudgeAvailableRef.current && problemRef.current
          ? { problem_id: problemRef.current.id }
          : { lesson_id: Number(id) };
        const result = await api.struggles.monitor({
          student_id: user.id,
          course_id: courseIdRef.current,
          ...targetIds,
          context_type: 'dsa',
          fixation_duration_ms: 12000, // legacyGazeTracker.js's FIXATION_MS — the threshold that actually fired this
          client_event_id: `dsa-${id}-${Date.now()}`,
        });
        if (result?.detected && result?.event_id) {
          setStruggleEventId(result.event_id);
          setAiHint("It seems you're focusing hard on this problem. Need a hint?");
        }
      } catch (err) {
        console.error('[DSA Page] Struggle monitor call failed:', err);
      }
    })();
  }, [attentionState, id]);

  useEffect(() => {
    // NOT setIsActive(true) here — that duplicated the mount-time
    // requestTracking() effect above and, worse, its cleanup called
    // setIsActive(false) (→ gaze.stopTracking(), tearing down the camera)
    // on every unmount. Under React StrictMode (enabled in this app —
    // see main.jsx) every effect runs setup → cleanup → setup again on
    // initial mount, so this alone made the camera start, get torn down,
    // then try to restart within the same page load. A getUserMedia()
    // call that races the *previous* stream's tracks still releasing the
    // camera device is exactly the kind of thing that fails silently or
    // with a transient error on Windows — matching "it is not starting"
    // with no visible pill at all (isTracking never settled back to true).
    // requestTracking() alone (mirroring LessonPlayer.jsx's identical
    // single-effect pattern) is the only thing that should start tracking
    // here.
    //
    // Kept registered (harmlessly — see above, these are no-ops) rather
    // than removed outright, in case GazeProvider.jsx's adapter grows a
    // real implementation later.
    setFixationCallback(null);
    setInactivityCallback((durationMs: number, score: number) => {
      console.log(`[DSA Page] Inactivity detected: ${durationMs}ms, Score: ${score}`);
    });

    return () => {
      setFixationCallback(null);
      setInactivityCallback(null);
    };
    // Deliberately only [id]: setFixationCallback/setInactivityCallback
    // come from GazeProvider's gazeAdapter object, which is rebuilt (new
    // function identities) on every GazeProvider render — and GazeProvider
    // re-renders on every gaze tick (~30/s) while tracking is active,
    // since rawGaze/screenGaze/etc. live there. aiHint/struggleEventId
    // were also previously in this array purely because the fixation
    // callback's closure needed their current values, not because
    // re-registering the callback needed to happen when they changed —
    // refs (above) solve that without coupling this effect to
    // rapidly-changing state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // level='basic' (the auto/first-open path) sends no student-authored
  // text. level='custom' is a student-typed question (customMsg)  — echoed
  // into the chat immediately so it doesn't feel lost while the request is
  // in flight, matching MentorPanel.jsx's UserMessageCard pattern.
  const handleRequestHint = async (level: 'basic' | 'custom' = 'basic', customMsg: string | null = null) => {
    setAiHint(null);
    setDiagnosticsExpanded(true);
    setHintError(null);
    if (hintLoading || !id) return;
    if (level === 'custom') {
      if (!customMsg?.trim()) return;
      setDsaHints(prev => [...prev, { role: 'student', text: customMsg }]);
    } else if (dsaHints.length > 0) {
      return; // already have at least one hint — only the explicit chat input drives further requests
    }

    setHintLoading(true);
    try {
      let eventId = struggleEventId;
      if (!eventId) {
        // No fixation-detected event yet — manually trigger one (backend
        // always creates an event when manual_trigger is set), matching the
        // pattern LessonPlayer.jsx uses for its manual mentor button.
        const user = getCurrentUser();
        if (!user) {
          setHintError('You need to be signed in to ask the AI mentor a question.');
          return;
        }
        // Same fix as the fixation-triggered monitor call above: only send
        // problem_id when actually bank-linked (a real slug like
        // "two-sum"), otherwise lesson_id — this page's URL id is a Lesson
        // id and never matches a bank slug, so sending it as problem_id
        // silently produced a hint with zero real information about the
        // actual problem (see mentor_service.py's generate_hint()).
        const targetIds = isJudgeAvailable && problem
          ? { problem_id: problem.id }
          : { lesson_id: Number(id) };
        const monitorResult = await api.struggles.monitor({
          student_id: user.id,
          course_id: courseId,
          ...targetIds,
          context_type: 'dsa',
          manual_trigger: true,
          client_event_id: `dsa-${id}-${Date.now()}`,
        });
        eventId = monitorResult?.event_id ?? null;
        if (eventId) setStruggleEventId(eventId);
      }
      if (!eventId) {
        setHintError('Could not start a mentor session for this problem. Please try again.');
        return;
      }
      // dsaHints here still reflects state from before this turn's
      // setDsaHints call above (React state updates are async) — exactly
      // the prior turns the mentor needs to make sense of customMsg as a
      // reply rather than a standalone fragment.
      const history = dsaHints.map(h => ({ role: h.role, text: h.text }));
      const result = await api.struggles.getHint(eventId, level, customMsg, null, history);
      if (result?.hint_text) {
        setDsaHints(prev => [...prev, { role: 'mentor', text: result.hint_text, audioBase64: result.audio_base64 }]);
      } else {
        setHintError('The AI mentor didn\'t return a response. Please try again.');
      }
    } catch (err) {
      // Was silently swallowed here before — console.error only, nothing
      // shown in the UI. A failed request and "genuinely nothing to show
      // yet" rendered identically (an empty panel), so there was no way to
      // tell a real bug from normal idle state, or to retry.
      console.error('[DSA Page] hint request failed:', err);
      setHintError(
        (err as any)?.status === 429
          ? 'Too many requests right now — please wait a moment and try again.'
          : (err as any)?.message || 'Something went wrong getting a response from the AI mentor.'
      );
    } finally {
      setHintLoading(false);
    }
  };

  const handleSendHintMessage = () => {
    const msg = hintMessage.trim();
    if (!msg) return;
    setHintMessage('');
    handleRequestHint('custom', msg);
  };

  // Fetch Problem. `id` here is always a Lesson id (lessonPath() is the
  // only thing that ever links to /dsa/:id, and it always passes
  // lesson.id) — but api.problems.get() queries a completely separate,
  // hardcoded problem bank (app/services/problem_bank.py's PROBLEMS dict,
  // keyed by string slugs like "two-sum") that a lesson's numeric id was
  // never going to match.
  //
  // This used to try api.problems.get(id) first and fall back to lesson
  // data only in the catch block — but get_problem() *never throws*, even
  // for an unrecognized id: its own doc comment says unknown slugs get a
  // generic placeholder "so callers never have to special-case a 404".
  // That placeholder (title derived from the id, "Solve the problem as
  // described.", empty everything) was exactly what got shown for every
  // lesson-based DSA problem — the catch block was dead code, since the
  // call it wrapped was designed to never fail.
  //
  // Fetch the lesson first instead (id is always a lesson id in practice),
  // and only consult the problem bank when the lesson's own `problem_id`
  // field (a separate column from lesson.id — set only when an instructor
  // deliberately links a lesson to a real bank entry) says to.
  useEffect(() => {
    const loadProblem = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!id) return;

        const lesson = await api.lessons.get(id);
        setCourseId(lesson.course_id ?? null);

        if (lesson.problem_id) {
          const data = await api.problems.get(lesson.problem_id);
          setProblem(data);
          setCode(data.starter_code_by_language[language] || '');
          // Pre-fill custom input with first example so student can run immediately
          setCustomInput(data.examples?.[0]?.input ?? '');
          setIsJudgeAvailable(true);
          return;
        }

        // No structured examples/test_cases/starter_code on a Lesson row —
        // this is reference/study material (what to solve, how to think
        // about it, a reference solution to read), not something with
        // judged execution behind it. Fold the lesson's free-text DSA
        // fields into readable text instead of forcing them into shapes
        // (Example[], test_cases[]) that don't exist for this data, rather
        // than silently dropping any of it.
        //
        // Split into two groups, not one: `description` is what a student
        // needs to attempt the problem (statement/examples/constraints);
        // `solution` is the answer (approaches/reference code/complexity).
        // These used to all get joined into one `description` blob shown
        // immediately — which handed a student the solution before they'd
        // tried anything. `solution` is rendered separately, collapsed by
        // default (see SolutionSection).
        const descriptionSections: string[] = [];
        if (lesson.problem_statement) descriptionSections.push(lesson.problem_statement);
        if (lesson.examples) descriptionSections.push(`Examples:\n${lesson.examples}`);
        if (lesson.constraints) descriptionSections.push(`Constraints:\n${lesson.constraints}`);

        const solutionSections: string[] = [];
        if (lesson.approaches) solutionSections.push(`Approaches:\n${lesson.approaches}`);
        if (lesson.code_solutions) solutionSections.push(`Reference solution(s):\n${lesson.code_solutions}`);
        if (lesson.complexity_time || lesson.complexity_space) {
          solutionSections.push(
            `Complexity: ${lesson.complexity_time ? `time ${lesson.complexity_time}` : ''}${lesson.complexity_time && lesson.complexity_space ? ', ' : ''}${lesson.complexity_space ? `space ${lesson.complexity_space}` : ''}`
          );
        }

        setProblem({
          id: String(lesson.id),
          title: lesson.title,
          description: descriptionSections.join('\n\n') || 'No problem description was provided for this lesson.',
          solution: solutionSections.join('\n\n') || null,
          difficulty: (lesson.difficulty as Problem['difficulty']) || 'Medium',
          tags: [lesson.category, lesson.topic].filter(Boolean) as string[],
          examples: [],
          constraints: [],
          starter_code_by_language: {},
          test_cases: [],
        });
        setCode('');
        setIsJudgeAvailable(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load problem');
      } finally {
        setLoading(false);
      }
    };
    if (id) loadProblem();
  }, [id, language]);

  const handleRun = async () => {
    if (!problem || !isJudgeAvailable) return;
    try {
      setIsRunning(true);
      setActiveTab('results');     // auto-switch to Test Results
      setSubmitResult(null);       // clear old submit verdict
      setRunResult(null);
      setActiveCase(0);            // reset to first case
      const res = await api.problems.run(problem.id, code, language);
      setRunResult(res);
    } catch (err: any) {
      setRunResult({ status: 'ERROR', output: err.message, test_results: [] });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem || !isJudgeAvailable) return;
    try {
      setIsSubmitting(true);
      setActiveTab('results');     // auto-switch to Test Results
      setRunResult(null);          // clear run results
      setSubmitResult(null);
      const res = await api.problems.submit(problem.id, code, language);
      setSubmitResult(res);
    } catch (err: any) {
      setSubmitResult({ verdict: 'RUNTIME_ERROR', message: err.message, test_results: [] });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingState fullScreen message="Loading problem details..." />;
  
  if (error || !problem) {
    return (
      <ErrorState 
        fullScreen 
        title="Problem Not Found" 
        message={error || "We couldn't find the requested problem."}
        onRetry={() => navigate('/dashboard')} 
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] font-sans overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="h-14 shrink-0 bg-[var(--card-bg)] border-b border-[var(--border)] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400">
              DSA
            </span>
            <span className="font-semibold text-[var(--text)] hidden sm:block">
              {problem.title}
            </span>
          </div>
        </div>
        
        {isActive && (
           <GazeStatusPill isActive={isActive} quality={gazeQuality} onRetry={retryInit} className="mr-4 hidden sm:flex" />
        )}
      </header>

      {/* ── Main Layout (Split Pane) ── */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Statement */}
        <div className="w-1/2 flex flex-col min-w-[300px]">
          <ProblemStatement problem={problem} confidence={confidence} setConfidence={setConfidence} onSuggestTestCase={() => setShowContributeModal(true)} />
          
          {/* AI Hint Prompt triggered by Gaze */}
          {aiHint && (
            <div className="m-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-start gap-3 animate-fade-in shrink-0">
              <Lightbulb className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />
              <div>
                <h3 className="font-bold text-sm">AI Mentor Notice</h3>
                <p className="text-sm mt-1">{aiHint}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleRequestHint('basic')}
                    className="text-xs font-bold uppercase tracking-wider bg-indigo-200 hover:bg-indigo-300 text-indigo-900 px-3 py-1.5 rounded transition-colors"
                  >
                    Yes, give me a hint
                  </button>
                  <button 
                    onClick={() => setAiHint(null)}
                    className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 px-3 py-1.5 transition-colors"
                  >
                    No, I'm good
                  </button>
                </div>
              </div>
            </div>
          )}

          <HintAndDiagnosticsPanel
            expanded={diagnosticsExpanded}
            onToggle={() => {
              // Opening the panel for the first time (no hint yet) also
              // requests one, same as clicking "Yes, give me a hint".
              if (!diagnosticsExpanded && dsaHints.length === 0 && !hintLoading) {
                handleRequestHint('basic');
              } else {
                setDiagnosticsExpanded(!diagnosticsExpanded);
              }
            }}
            hints={dsaHints}
            loading={hintLoading}
            error={hintError}
            message={hintMessage}
            onMessageChange={setHintMessage}
            onSend={handleSendHintMessage}
          />
        </div>

        {/* Right Pane: Code + Console */}
        <div className="w-1/2 flex flex-col bg-[#1e1e1e] min-w-[300px]">
          
          {/* Editor Header */}
          <div className="h-12 shrink-0 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-4">
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setCode(problem.starter_code_by_language[e.target.value] || '');
              }}
              className="bg-[#3c3c3c] text-stone-200 border-none rounded px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {LANGUAGES.map(l => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
            
            <div className="flex gap-2">
              <button
                onClick={handleRun}
                disabled={isRunning || isSubmitting || !isJudgeAvailable}
                title={isJudgeAvailable ? undefined : 'This problem has no runnable test cases.'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-[#3c3c3c] text-stone-200 hover:bg-[#4d4d4d] disabled:opacity-50 transition-colors"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run Code
              </button>
              <button
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting || !isJudgeAvailable}
                title={isJudgeAvailable ? undefined : "This lesson has no automated test cases to submit against — see the reference solution in the diagnostics panel instead."}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-bold bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-[300px]">
            <MonacoEditor
              theme="vs-dark"
              language={LANGUAGES.find(l => l.id === language)?.monacoLang}
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                cursorSmoothCaretAnimation: 'on',
              }}
              loading={<div className="flex items-center justify-center h-full text-stone-500">Loading editor...</div>}
            />
          </div>

          {/* Console Panel — LeetCode Style */}
          <div className="h-72 shrink-0 bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col">

            {/* Tab bar */}
            <div className="h-10 flex items-center px-4 gap-4 bg-[#252526] border-b border-[#3c3c3c]">
              <button
                onClick={() => setActiveTab('testcase')}
                className={`text-sm font-medium pb-2 border-b-2 mt-2 transition-colors ${
                  activeTab === 'testcase' ? 'text-stone-200 border-teal-500' : 'text-stone-400 border-transparent hover:text-stone-300'
                }`}
              >
                Testcase
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`text-sm font-medium pb-2 border-b-2 mt-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'results' ? 'text-stone-200 border-teal-500' : 'text-stone-400 border-transparent hover:text-stone-300'
                }`}
              >
                Test Results
                {runResult && !isRunning && (
                  runResult.status === 'SUCCESS'
                    ? <span className="text-emerald-400 text-xs">✓</span>
                    : runResult.status === 'ERROR'
                    ? <span className="text-amber-400 text-xs">!</span>
                    : <span className="text-rose-400 text-xs">✗</span>
                )}
                {submitResult && !isSubmitting && (
                  submitResult.verdict === 'ACCEPTED'
                    ? <span className="text-emerald-400 text-xs">✓</span>
                    : <span className="text-rose-400 text-xs">✗</span>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-mono text-sm">

              {/* Loading */}
              {(isRunning || isSubmitting) && (
                <div className="flex items-center gap-2 text-stone-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isRunning ? 'Running sample test cases...' : 'Judging against all test cases...'}
                </div>
              )}

              {/* ── Testcase tab ── */}
              {activeTab === 'testcase' && !isRunning && !isSubmitting && (
                <div>
                  {problem.examples.length > 0 ? (
                    <>
                      {/* Case selector chips */}
                      <div className="flex items-center gap-2 mb-4">
                        {problem.examples.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveCase(idx)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              activeCase === idx
                                ? 'bg-[#3c3c3c] text-stone-200'
                                : 'text-stone-400 hover:bg-[#2d2d2d] hover:text-stone-300'
                            }`}
                          >
                            Case {idx + 1}
                          </button>
                        ))}
                      </div>

                      {/* Active case input / expected */}
                      {problem.examples[activeCase] && (
                        <div className="space-y-3 text-stone-300">
                          <div>
                            <p className="text-stone-500 text-xs mb-1">Input</p>
                            <div className="bg-[#2d2d2d] border border-[#3c3c3c] rounded p-3 text-stone-200">
                              {problem.examples[activeCase].input}
                            </div>
                          </div>
                          <div>
                            <p className="text-stone-500 text-xs mb-1">Expected Output</p>
                            <div className="bg-[#2d2d2d] border border-[#3c3c3c] rounded p-3 text-stone-200">
                              {problem.examples[activeCase].output}
                            </div>
                          </div>
                          {problem.examples[activeCase].explanation && (
                            <div>
                              <p className="text-stone-500 text-xs mb-1">Explanation</p>
                              <p className="text-stone-400 text-xs">{problem.examples[activeCase].explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-stone-500 italic text-sm">No sample test cases available for this problem.</p>
                  )}
                </div>
              )}

              {/* ── Test Results tab ── */}
              {activeTab === 'results' && !isRunning && !isSubmitting && (
                <div>

                  {/* Empty state */}
                  {!runResult && !submitResult && (
                    <p className="text-stone-500 italic text-sm">
                      Click <span className="text-stone-200 font-semibold">Run</span> to test against sample cases, or{' '}
                      <span className="text-teal-400 font-semibold">Submit</span> to judge against all test cases.
                    </p>
                  )}

                  {/* Run results — per-case actual vs expected */}
                  {runResult && !submitResult && (
                    <div>
                      {runResult.status === 'ERROR' ? (
                        <div>
                          <p className="text-rose-400 font-bold text-xs uppercase tracking-wider mb-2">Compilation / Runtime Error</p>
                          <pre className="bg-rose-500/10 border border-rose-500/30 rounded p-3 text-rose-300 whitespace-pre-wrap text-xs">
                            {runResult.output}
                          </pre>
                        </div>
                      ) : runResult.test_results.length > 0 ? (
                        <>
                          {/* Case result chips */}
                          <div className="flex items-center gap-2 mb-4">
                            {runResult.test_results.map((res, idx) => (
                              <button
                                key={idx}
                                onClick={() => setActiveCase(idx)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  activeCase === idx ? 'bg-[#3c3c3c] text-stone-200' : 'text-stone-400 hover:bg-[#2d2d2d]'
                                }`}
                              >
                                Case {idx + 1}
                                {res.passed
                                  ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  : <XCircle className="w-3 h-3 text-rose-400" />}
                              </button>
                            ))}
                          </div>

                          {/* Active case detail */}
                          {runResult.test_results[activeCase] && (
                            <div className="space-y-3">
                              {problem.examples[activeCase] && (
                                <div>
                                  <p className="text-stone-500 text-xs mb-1">Input</p>
                                  <div className="bg-[#2d2d2d] border border-[#3c3c3c] rounded p-3 text-stone-200 text-xs">
                                    {problem.examples[activeCase].input}
                                  </div>
                                </div>
                              )}
                              <div>
                                <p className={`text-xs mb-1 font-medium ${
                                  runResult.test_results[activeCase].passed ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  Output {runResult.test_results[activeCase].passed ? '\u2713' : '\u2717'}
                                </p>
                                <div className={`rounded p-3 border text-xs ${
                                  runResult.test_results[activeCase].passed
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                }`}>
                                  {runResult.test_results[activeCase].actual || '(empty)'}
                                </div>
                              </div>
                              <div>
                                <p className="text-stone-500 text-xs mb-1">Expected</p>
                                <div className="bg-[#2d2d2d] border border-[#3c3c3c] rounded p-3 text-stone-200 text-xs">
                                  {runResult.test_results[activeCase].expected}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-stone-500 italic text-sm">{runResult.output}</p>
                      )}
                    </div>
                  )}

                  {/* Submit result — formal verdict */}
                  {submitResult && (
                    <div>
                      <div className="mb-4">
                        <span className={`text-2xl font-bold ${
                          submitResult.verdict === 'ACCEPTED' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {submitResult.verdict === 'ACCEPTED' ? '\u2714 Accepted' : submitResult.verdict.replace(/_/g, ' ')}
                        </span>
                        {submitResult.message && (
                          <p className="text-stone-400 mt-1 text-sm">{submitResult.message}</p>
                        )}
                      </div>
                      {submitResult.test_results?.map((res, i) => (
                        <div key={i} className={`mb-3 p-3 rounded-lg border ${
                          res.passed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'
                        }`}>
                          <div className="flex items-center gap-2 mb-1 font-bold text-sm">
                            {res.passed
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              : <XCircle className="w-4 h-4 text-rose-500" />}
                            Test Case {i + 1}
                            {res.execution_time_ms > 0 && (
                              <span className="text-stone-500 font-normal text-xs ml-auto">{res.execution_time_ms}ms</span>
                            )}
                          </div>
                          {!res.passed && (
                            <div className="space-y-1 text-xs mt-2">
                              <div><span className="text-stone-500">Expected: </span><span className="text-stone-200">{res.expected}</span></div>
                              <div><span className="text-stone-500">Got: </span><span className="text-stone-200">{res.actual}</span></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

        </div>
      
      {/* Contribute Test Case Modal */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-[#3c3c3c] flex justify-between items-center bg-[#252526]">
              <h2 className="text-lg font-bold text-stone-200">Suggest Test Case</h2>
              <button onClick={() => setShowContributeModal(false)} className="text-stone-400 hover:text-stone-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1">Input</label>
                <textarea 
                  value={contributeInput}
                  onChange={e => setContributeInput(e.target.value)}
                  placeholder="e.g. [1, 2, 3]"
                  className="w-full bg-[#2d2d2d] border border-[#3c3c3c] rounded-lg p-3 text-stone-200 font-mono text-sm focus:ring-1 focus:ring-teal-500 outline-none resize-y min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1">Expected Output</label>
                <textarea 
                  value={contributeExpected}
                  onChange={e => setContributeExpected(e.target.value)}
                  placeholder="e.g. 6"
                  className="w-full bg-[#2d2d2d] border border-[#3c3c3c] rounded-lg p-3 text-stone-200 font-mono text-sm focus:ring-1 focus:ring-teal-500 outline-none resize-y min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1">Explanation (Optional)</label>
                <input 
                  type="text"
                  value={contributeExplanation}
                  onChange={e => setContributeExplanation(e.target.value)}
                  placeholder="Why is this a good edge case?"
                  className="w-full bg-[#2d2d2d] border border-[#3c3c3c] rounded-lg p-3 text-stone-200 text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#252526] border-t border-[#3c3c3c] flex justify-end gap-3">
              <button
                onClick={() => setShowContributeModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-stone-400 hover:text-stone-200 hover:bg-[#3c3c3c] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContribute}
                disabled={isContributing || !contributeInput || !contributeExpected}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isContributing && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

</main>
    </div>
  );
}
