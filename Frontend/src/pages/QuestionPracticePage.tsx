import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Bookmark, Clock, 
  CheckCircle2, Lightbulb, Link as LinkIcon, BookOpen,
  XCircle, Loader2, Video
} from 'lucide-react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { useGaze } from '../contexts/GazeProvider';
import { AttentionState } from '../utils/gazeState';
import GazeStatusPill from '../components/GazeStatusPill';
import { api } from '../services/api';
import { LoadingState, ErrorState } from '../components/UXStates';
import ConfidenceSelector from '../components/ConfidenceSelector';
import { lessonPath } from '../utils/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RelatedLesson {
  id: string;
  title: string;
}

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  exam: string;
  subject: string;
  topic: string;
  type: 'mcq' | 'multiple_select' | 'numeric' | 'multi_part';
  difficulty: string;
  tags: string[];
  content: string;
  options?: QuestionOption[];
  related_lessons?: RelatedLesson[];
}

interface AnswerResponse {
  is_correct: boolean;
  feedback: string;
  correct_answer: string | string[];
}

// ─── API Client ───────────────────────────────────────────────────────────────

// ─── Math Renderer ────────────────────────────────────────────────────────────

const MathRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const blocks = text.split(/(\$\$[\s\S]*?\$\$)/g);
  
  return (
    <div className="math-content">
      {blocks.map((block, i) => {
        if (block.startsWith('$$') && block.endsWith('$$')) {
          return <BlockMath key={i} math={block.slice(2, -2)} />;
        }
        const inlines = block.split(/(\$[^$]+\$)/g);
        return (
          <span key={i}>
            {inlines.map((inline, j) => {
              if (inline.startsWith('$') && inline.endsWith('$')) {
                return <InlineMath key={j} math={inline.slice(1, -1)} />;
              }
              return inline.split('\n').map((line, k, arr) => (
                <React.Fragment key={k}>
                  {line}
                  {k < arr.length - 1 && <br />}
                </React.Fragment>
              ));
            })}
          </span>
        );
      })}
    </div>
  );
};

// ─── Input Components ─────────────────────────────────────────────────────────

interface InputProps {
  options?: QuestionOption[];
  selected: string[];
  onSelect: (val: string[]) => void;
  disabled: boolean;
  showCorrect: boolean;
  answerResult: AnswerResponse | null;
}

const McqOptions: React.FC<InputProps> = ({ options, selected, onSelect, disabled, showCorrect, answerResult }) => {
  if (!options) return null;
  const correctAnswers = answerResult ? (Array.isArray(answerResult.correct_answer) ? answerResult.correct_answer : [answerResult.correct_answer]) : [];
  
  return (
    <div className="space-y-3 mt-6">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        const isCorrect = correctAnswers.includes(opt.id);
        
        let stateClass = "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)]";
        if (isSelected) stateClass = "border-teal-500 bg-teal-500/10 text-teal-800 dark:text-teal-400";
        if (showCorrect) {
          if (isCorrect) stateClass = "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400";
          else if (isSelected && !isCorrect) stateClass = "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-400";
        }

        return (
          <button
            key={opt.id}
            disabled={disabled}
            onClick={() => onSelect([opt.id])}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${stateClass} ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'border-teal-500' : 'border-[var(--border)]'} ${showCorrect && isCorrect ? 'border-emerald-500 bg-emerald-500' : ''}`}>
              {isSelected && !showCorrect && <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />}
              {showCorrect && isCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <MathRenderer text={opt.text} />
            </div>
          </button>
        );
      })}
    </div>
  );
};

const MultipleSelectOptions: React.FC<InputProps> = ({ options, selected, onSelect, disabled, showCorrect, answerResult }) => {
  if (!options) return null;
  const correctAnswers = answerResult ? (Array.isArray(answerResult.correct_answer) ? answerResult.correct_answer : [answerResult.correct_answer]) : [];

  return (
    <div className="space-y-3 mt-6">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        const isCorrect = correctAnswers.includes(opt.id);
        
        let stateClass = "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)]";
        if (isSelected) stateClass = "border-teal-500 bg-teal-500/10 text-teal-800 dark:text-teal-400";
        if (showCorrect) {
          if (isCorrect) stateClass = "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400";
          else if (isSelected && !isCorrect) stateClass = "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-400";
        }

        return (
          <button
            key={opt.id}
            disabled={disabled}
            onClick={() => {
              if (isSelected) onSelect(selected.filter(id => id !== opt.id));
              else onSelect([...selected, opt.id]);
            }}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${stateClass} ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'border-teal-500 bg-teal-500' : 'border-[var(--border)]'} ${showCorrect && isCorrect ? 'border-emerald-500 bg-emerald-500' : ''}`}>
              {isSelected && !showCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
              {showCorrect && isCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <MathRenderer text={opt.text} />
            </div>
          </button>
        );
      })}
    </div>
  );
};



const NumericInput: React.FC<InputProps> = ({ selected, onSelect, disabled, showCorrect, answerResult }) => {
  const isCorrect = answerResult?.is_correct;
  
  return (
    <div className="mt-6">
      <div className="max-w-xs relative">
        <input
          type="number"
          step="any"
          disabled={disabled}
          value={selected[0] || ''}
          onChange={(e) => onSelect([e.target.value])}
          placeholder="Enter numeric value..."
          className={`w-full p-4 text-lg rounded-xl border-2 focus:outline-none bg-[var(--surface)] text-[var(--text)]
            ${disabled ? 'cursor-not-allowed opacity-80' : ''}
            ${showCorrect && isCorrect ? 'border-emerald-500 text-emerald-700' : ''}
            ${showCorrect && !isCorrect ? 'border-rose-500 text-rose-700' : 'border-[var(--border)] focus:border-teal-500'}
          `}
        />
      </div>
      {showCorrect && !isCorrect && answerResult?.correct_answer && (
        <p className="mt-3 text-emerald-600 font-medium">Correct answer: {answerResult.correct_answer}</p>
      )}
    </div>
  );
};

// ─── Side Panel ───────────────────────────────────────────────────────────────

const SidePanel: React.FC<{ question: Question }> = ({ question }) => (
  <div className="w-full lg:w-80 shrink-0 space-y-6">
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
      <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-500" /> Key Concepts
      </h3>
      <div className="flex flex-wrap gap-2">
        {question.tags.map(tag => (
          <span key={tag} className="px-3 py-1.5 bg-[var(--surface-2)] text-[var(--text-muted)] text-xs font-medium rounded-lg border border-[var(--border)]">
            {tag}
          </span>
        ))}
      </div>
    </div>

    {question.related_lessons && question.related_lessons.length > 0 && (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-600" /> Related Lessons
        </h3>
        <div className="space-y-3">
          {question.related_lessons.map(lesson => (
            <Link key={lesson.id} to={lessonPath(lesson.id)} className="group flex items-start gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-teal-500/50 hover:bg-teal-500/5 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)] group-hover:text-teal-600 transition-colors line-clamp-2">
                  {lesson.title}
                </p>
                <p className="text-xs text-[var(--text-faint)] mt-1 flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" /> Go to lesson
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function QuestionPracticePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selected, setSelected] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  
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

  // aiHint/answerResult mirrored into refs so the fixation callback can
  // read current values without needing to be in the effect below.
  const aiHintRef = useRef(aiHint);
  const answerResultRef = useRef(answerResult);
  useEffect(() => { aiHintRef.current = aiHint; }, [aiHint]);
  useEffect(() => { answerResultRef.current = answerResult; }, [answerResult]);

  // Fixation ("confusion") detection: setFixationCallback/setInactivityCallback
  // below are dead — GazeProvider.jsx's adapter stubs them out ("deprecated
  // in the new version") and nothing in useGazeTracker.js ever invokes a
  // registered callback. Registering one here did nothing on either
  // tracker mode; confusion detection structurally never fired at all.
  // The actual, working signal is attentionState reaching FIXATED (see
  // LessonPlayer.jsx / DsaProblemPage.tsx's identical fix) — react to that
  // directly instead.
  const isFixationHandledRef = useRef(false);
  useEffect(() => {
    if (attentionState !== AttentionState.FIXATED) {
      isFixationHandledRef.current = false;
      return;
    }
    if (isFixationHandledRef.current || aiHintRef.current || answerResultRef.current) return;
    isFixationHandledRef.current = true;
    setAiHint("It seems you're focusing hard! Need a hint on how to approach this problem?");
  }, [attentionState]);

  useEffect(() => {
    // NOT setIsActive(true) here — that duplicated the mount-time
    // requestTracking() effect above and, worse, its cleanup called
    // setIsActive(false) (→ gaze.stopTracking(), tearing down the camera)
    // on every unmount. Under React StrictMode (enabled in this app — see
    // main.jsx) every effect runs setup → cleanup → setup again on initial
    // mount, so this alone made the camera start, get torn down, then try
    // to restart within the same page load — a getUserMedia() call racing
    // the previous stream's tracks still releasing the camera device,
    // which fails silently or with a transient error on Windows. See the
    // identical fix (and its full rationale) in DsaProblemPage.tsx.
    // requestTracking() alone (mirroring LessonPlayer.jsx) is the only
    // thing that should start tracking here.
    //
    // Kept registered (harmlessly — see above, these are no-ops) rather
    // than removed outright, in case GazeProvider.jsx's adapter grows a
    // real implementation later.
    setFixationCallback(null);
    setInactivityCallback((durationMs: number, score: number) => {
      console.log(`[PracticePage] Inactivity detected: ${durationMs}ms, Score: ${score}`);
    });

    return () => {
      setFixationCallback(null);
      setInactivityCallback(null);
    };
    // Deliberately only [id]: setFixationCallback/setInactivityCallback are
    // new function identities on every GazeProvider render (which happens
    // on every gaze tick while tracking is active), so including them here
    // meant this effect's teardown/setup ran on almost every tick instead
    // of once per question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && !answerResult) {
      interval = setInterval(() => setTimeSpent(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, answerResult]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Fetch question
  useEffect(() => {
    const loadQuestion = async () => {
      try {
        setLoading(true);
        setError(null);
        setAnswerResult(null);
        setSelected([]);
        setTimeSpent(0);
        setTimerActive(true);

        const data = await api.questions.get(id);
        setQuestion(data as Question);
      } catch (err: any) {
        setError(err.message || 'Failed to load question');
      } finally {
        setLoading(false);
      }
    };
    if (id) loadQuestion();
  }, [id]);

  const handleSubmit = async () => {
    if (selected.length === 0 || !question) return;
    try {
      setIsSubmitting(true);
      setTimerActive(false);
      
      const res = await api.questions.answer(question.id, {
        answer: selected.length === 1 ? selected[0] : selected,
        time_spent_seconds: timeSpent,
        confidence: confidence || 2
      });
      setAnswerResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
      setTimerActive(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingState fullScreen message="Loading question..." />;
  
  if (error || !question) {
    return (
      <ErrorState 
        fullScreen 
        title="Something went wrong" 
        message={error || 'Question not found.'}
        onRetry={() => navigate(-1)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans">
      {/* ── Top Bar ── */}
      <header className="h-16 shrink-0 bg-[var(--card-bg)] border-b border-[var(--border)] flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)]">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="hidden sm:block">
            <h1 className="font-semibold text-[var(--text)] flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                {question.exam}
              </span>
              {question.subject} &bull; {question.topic}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {isActive && (
             <GazeStatusPill isActive={isActive} quality={gazeQuality} onRetry={retryInit} className="hidden sm:flex" />
          )}
          <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono font-medium">
            <Clock className="w-4 h-4" />
            <span className={timeSpent > 120 ? 'text-amber-500' : ''}>{formatTime(timeSpent)}</span>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
          
          {/* Left: Question Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  Question ID: {question.id}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  question.difficulty === 'Hard' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                  question.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                  'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                }`}>
                  {question.difficulty}
                </span>
              </div>

              <div className="prose prose-stone dark:prose-invert max-w-none text-lg text-[var(--text)]">
                <MathRenderer text={question.content} />
              </div>

              {/* AI Hint Prompt triggered by Gaze */}
              {aiHint && (
                <div className="mt-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-start gap-3 animate-fade-in">
                  <Lightbulb className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />
                  <div>
                    <h3 className="font-bold text-sm">AI Mentor Notice</h3>
                    <p className="text-sm mt-1">{aiHint}</p>
                    <button 
                      onClick={() => setAiHint("Here is a helpful tip based on your current question type...")}
                      className="mt-2 text-xs font-bold uppercase tracking-wider bg-indigo-200 hover:bg-indigo-300 text-indigo-900 px-3 py-1.5 rounded transition-colors"
                    >
                      Yes, give me a hint
                    </button>
                    <button 
                      onClick={() => setAiHint(null)}
                      className="mt-2 ml-2 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 px-3 py-1.5 transition-colors"
                    >
                      No, I'm good
                    </button>
                  </div>
                </div>
              )}

              {/* Options Render */}
              {question.type === 'mcq' && (
                <McqOptions 
                  options={question.options} 
                  selected={selected} 
                  onSelect={setSelected}
                  disabled={!!answerResult || isSubmitting}
                  showCorrect={!!answerResult}
                  answerResult={answerResult}
                />
              )}
              {question.type === 'multiple_select' && (
                <MultipleSelectOptions 
                  options={question.options} 
                  selected={selected} 
                  onSelect={setSelected}
                  disabled={!!answerResult || isSubmitting}
                  showCorrect={!!answerResult}
                  answerResult={answerResult}
                />
              )}
              {question.type === 'numeric' && (
                <NumericInput 
                  selected={selected} 
                  onSelect={setSelected}
                  disabled={!!answerResult || isSubmitting}
                  showCorrect={!!answerResult}
                  answerResult={answerResult}
                />
              )}

              {!answerResult && (
                <ConfidenceSelector 
                  value={confidence} 
                  onChange={setConfidence} 
                  disabled={isSubmitting} 
                />
              )}
            </div>

            {/* Explanation / Solution */}
            {answerResult && answerResult.feedback && (
              <div className={`mt-6 border rounded-2xl p-6 sm:p-8 ${answerResult.is_correct ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'}`}>
                <h3 className={`font-semibold mb-4 flex items-center gap-2 ${answerResult.is_correct ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                  {answerResult.is_correct ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  {answerResult.is_correct ? 'Correct!' : 'Incorrect'}
                </h3>
                <div className="prose prose-stone dark:prose-invert max-w-none">
                  <MathRenderer text={answerResult.feedback} />
                </div>
              </div>
            )}
          </div>

          {/* Right: Meta Panel */}
          <SidePanel question={question} />

        </div>
      </main>

      {/* ── Bottom Bar ── */}
      <footer className="shrink-0 bg-[var(--card-bg)] border-t border-[var(--border)] p-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors flex items-center gap-2">
              <Bookmark className="w-4 h-4" /> Review Later
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {!answerResult ? (
              <>
                <button 
                  onClick={() => setSelected([])}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={selected.length === 0 || !confidence || isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save & Submit
                </button>
              </>
            ) : (
              <button className="px-6 py-2.5 rounded-xl text-sm font-bold bg-stone-900 text-white dark:bg-white dark:text-stone-900 hover:opacity-90 transition-all shadow-sm flex items-center gap-2">
                Next Question <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
