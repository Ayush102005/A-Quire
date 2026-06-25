import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, BrainCircuit, ChevronRight, CheckCircle2,
  XCircle, AlertCircle, Loader2, RotateCcw, Lightbulb, Target,
  ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

const CONFIDENCE_LEVELS = [
  { id: 1, label: 'Just guessing',  color: 'bg-red-400',   ring: 'ring-red-300',   text: 'text-red-600'   },
  { id: 2, label: 'Not sure',       color: 'bg-amber-400',  ring: 'ring-amber-300',  text: 'text-amber-600'  },
  { id: 3, label: 'Fairly sure',    color: 'bg-teal-400',   ring: 'ring-teal-300',   text: 'text-teal-600'   },
  { id: 4, label: 'Very confident', color: 'bg-emerald-500',ring: 'ring-emerald-300',text: 'text-emerald-600'},
];

function resultMeta(state) {
  if (state === 'correct')   return { icon: CheckCircle2, iconColor: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Correct!',             labelColor: 'text-emerald-700' };
  if (state === 'partial')   return { icon: AlertCircle,  iconColor: 'text-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Partially correct.',   labelColor: 'text-amber-700'   };
  return                            { icon: XCircle,      iconColor: 'text-red-400',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Not quite.',           labelColor: 'text-red-600'     };
}

function ProgressDots({ total, current, results }) {
  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={current} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => {
        const r = results[i];
        const isCurrent = i === current - 1;
        const dotColor = r === 'correct' ? 'bg-emerald-400' : r === 'incorrect' ? 'bg-amber-400' : isCurrent ? 'bg-teal-500 ring-2 ring-teal-200' : 'bg-stone-200';
        return <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${dotColor}`} aria-label={`Question ${i + 1}`} />;
      })}
    </div>
  );
}

function ConfidenceMeter({ value, onChange, disabled }) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2.5">How confident are you?</p>
      <div className="flex gap-2" role="radiogroup" aria-label="Confidence level">
        {CONFIDENCE_LEVELS.map(level => {
          const active = value === level.id;
          return (
            <button
              key={level.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => !disabled && onChange(level.id)}
              className={[
                'flex-1 flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
                active ? `border-transparent ring-2 ${level.ring} ${level.color.replace('bg-','bg-opacity-20 bg-')}` : 'border-stone-200 bg-white hover:border-stone-300',
              ].join(' ')}
            >
              <div className={`w-3 h-3 rounded-full ${level.color} ${active ? 'scale-125' : 'opacity-50'} transition-transform duration-150`} />
              <span className={`text-[10px] font-medium leading-tight text-center hidden sm:block ${active ? level.text : 'text-stone-400'}`}>{level.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExplanationPanel({ explanation, loading, showHint, hint }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="mt-4 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-3.5 focus-visible:outline-none bg-transparent border-0 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
            {loading ? <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5 text-teal-600" />}
          </div>
          <span className="text-sm font-semibold text-teal-800">
            AI Mentor Explanation
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-teal-500" /> : <ChevronDown className="w-4 h-4 text-teal-500" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          <p className="text-sm text-stone-700 leading-relaxed">{explanation}</p>
          {showHint && hint && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed"><span className="font-semibold">Memory tip: </span>{hint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompletionScreen({ total, correct, onRestart }) {
  const pct     = Math.round((correct / total) * 100);
  const grade   = pct === 100 ? 'Perfect!' : pct >= 70 ? 'Good work' : 'Keep going';
  const gradeColor = pct === 100 ? 'text-emerald-700' : pct >= 70 ? 'text-teal-700' : 'text-amber-700';

  return (
    <div className="flex flex-col items-center text-center gap-6 py-6">
      <div className="w-20 h-20 rounded-full bg-teal-50 border-4 border-teal-100 flex items-center justify-center">
        <Sparkles className="w-9 h-9 text-teal-600" />
      </div>
      <div>
        <p className={`text-3xl font-bold ${gradeColor} mb-1`}>{grade}</p>
        <p className="text-stone-500 text-sm">You got <span className="font-semibold text-stone-800">{correct} of {total}</span> questions correct</p>
      </div>
      <div className="w-full max-w-xs bg-stone-100 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-teal-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button onClick={onRestart} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm">
          <RotateCcw className="w-4 h-4" />Retry
        </button>
        <a href="/dashboard" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md text-center">
          Back to Dashboard <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

export default function SelfCheck() {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [qIdx, setQIdx]           = useState(0);
  const [selected, setSelected]   = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [submitState, setSubmitState] = useState('idle'); // idle | loading | result
  const [resultType, setResultType]   = useState(null);   // correct | incorrect
  const [results, setResults]         = useState({});
  const [accumulatedResponses, setAccumulatedResponses] = useState([]);
  const [done, setDone]               = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  useEffect(() => {
    async function loadQuiz() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const quizId = Number(queryParams.get('id')) || 1; // Default to seeded quiz 1
        
        const data = await api.quizzes.get(quizId);
        setQuiz(data);
        
        const mappedQuestions = data.questions.map(q => {
          let opts = [];
          try {
            opts = JSON.parse(q.options);
          } catch {
            opts = ["A", "B", "C", "D"];
          }
          return {
            id: q.id,
            text: q.question_text,
            options: opts.map((o, idx) => ({ id: String.fromCharCode(97 + idx), text: o })),
            correctValue: q.correct_answer,
            explanation: `According to standard thermodynamics, the correct response is: ${q.correct_answer}.`,
            hint: "Recall the key definitions of the Zeroth Law or Heat Capacity."
          };
        });

        setQuestions(mappedQuestions);
        setLoading(false);
      } catch (err) {
        setError(err.message || "Failed to load quiz.");
        setLoading(false);
      }
    }
    loadQuiz();
  }, []);

  const question = questions[qIdx];
  const isLastQ  = qIdx === questions.length - 1;

  async function handleSubmitAnswer() {
    if (!selected) return;
    setSubmitState('loading');
    
    const selectedOption = question.options.find(o => o.id === selected);
    const isCorrect = selectedOption.text.trim() === question.correctValue.trim();
    const type = isCorrect ? 'correct' : 'incorrect';
    
    // Track accumulated answers
    const newResponse = { questionId: question.id, answer: selectedOption.text };
    setAccumulatedResponses(prev => [...prev, newResponse]);
    setResults(r => ({ ...r, [qIdx]: type }));
    setResultType(type);
    setSubmitState('result');
  }

  async function handleNext() {
    if (isLastQ) {
      setLoading(true);
      try {
        // Submit all responses to backend database
        const submissionResult = await api.quizzes.submit(quiz.id, accumulatedResponses);
        setScoreResult(submissionResult);
        setDone(true);
      } catch (err) {
        console.error(err);
        setDone(true);
      } finally {
        setLoading(false);
      }
      return;
    }
    setQIdx(i => i + 1);
    setSelected(null);
    setConfidence(null);
    setSubmitState('idle');
    setResultType(null);
  }

  function handleRestart() {
    setQIdx(0); 
    setSelected(null); 
    setConfidence(null);
    setSubmitState('idle'); 
    setResultType(null); 
    setResults({}); 
    setAccumulatedResponses([]);
    setDone(false);
    setScoreResult(null);
  }

  if (loading && questions.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-teal-700 animate-spin" />
          <p className="text-stone-500 font-medium">Loading conceptual check...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white border border-stone-200 p-8 rounded-2xl shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-900 mb-2">Error Loading Quiz</h3>
          <p className="text-stone-500 mb-6">{error || "Requested quiz could not be found."}</p>
          <a href="/dashboard" className="px-5 py-2.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const submitted = submitState === 'result';
  const checkLoading = submitState === 'loading';
  const meta = resultType ? resultMeta(resultType) : null;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-stone-50/90 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors border-0 bg-transparent cursor-pointer">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
          <BookOpen className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-stone-700 font-semibold">{quiz.title}</span>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {done ? (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8 sm:p-10">
            <CompletionScreen 
              total={questions.length} 
              correct={scoreResult ? scoreResult.correct_answers : Object.values(results).filter(r => r === 'correct').length} 
              onRestart={handleRestart} 
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Progress header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Self-Check</p>
                <h1 className="text-lg font-semibold text-stone-900 leading-snug">{quiz.title}</h1>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-xs font-medium text-stone-500">Question {qIdx + 1} of {questions.length}</span>
                <ProgressDots total={questions.length} current={qIdx + 1} results={results} />
              </div>
            </div>

            {/* Question card */}
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

              {/* Question text */}
              <div className="px-6 sm:px-8 py-5 border-b border-stone-100 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-base font-semibold text-stone-900 leading-snug pt-0.5">
                  {question.text}
                </p>
              </div>

              {/* Answer options */}
              <div className="px-6 sm:px-8 py-5 space-y-2.5" role="radiogroup" aria-label="Answer choices">
                {question.options.map(opt => {
                  const isSelected = selected === opt.id;
                  const isCorrect = opt.text.trim() === question.correctValue.trim();
                  let optionStyle = 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50';

                  if (submitted) {
                    if (isCorrect)                      optionStyle = 'border-emerald-400 bg-emerald-50 text-emerald-900';
                    else if (isSelected && !isCorrect)  optionStyle = 'border-red-300 bg-red-50/50 text-red-800';
                    else                                optionStyle = 'border-stone-100 bg-stone-50 text-stone-400';
                  } else if (isSelected) {
                    optionStyle = 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-100';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={submitted || checkLoading}
                      onClick={() => !submitted && setSelected(opt.id)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 focus-visible:outline-none disabled:cursor-default ${optionStyle}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        submitted && isCorrect ? 'border-emerald-500 bg-emerald-500' :
                        submitted && isSelected && !isCorrect ? 'border-red-400 bg-red-400' :
                        isSelected ? 'border-teal-600 bg-teal-600' : 'border-stone-300'
                      }`}>
                        {submitted && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        {submitted && isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        {!submitted && isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-medium flex-1">{opt.text}</span>
                      {submitted && isCorrect && <span className="text-xs font-semibold text-emerald-600 shrink-0">Correct</span>}
                    </button>
                  );
                })}
              </div>

              {/* Result banner */}
              {submitted && meta && (
                <div className={`mx-6 sm:mx-8 mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border ${meta.bg} ${meta.border}`}>
                  <meta.icon className={`w-4 h-4 shrink-0 ${meta.iconColor}`} />
                  <p className={`text-sm font-semibold ${meta.labelColor}`}>{meta.label}</p>
                </div>
              )}

              {/* AI Explanation Panel */}
              {(submitted || checkLoading) && (
                <div className="px-6 sm:px-8 pb-5">
                  <ExplanationPanel
                    explanation={question.explanation}
                    loading={checkLoading}
                    showHint={resultType === 'incorrect'}
                    hint={question.hint}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="px-6 sm:px-8 py-5 border-t border-stone-100 bg-stone-50/50 space-y-5">
                {!submitted && (
                  <ConfidenceMeter value={confidence} onChange={setConfidence} disabled={submitted} />
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  {submitted && resultType === 'incorrect' && (
                    <button
                      onClick={() => { setSelected(null); setSubmitState('idle'); setResultType(null); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm focus-visible:outline-none"
                    >
                      <RotateCcw className="w-4 h-4" />Try Again
                    </button>
                  )}

                  {!submitted ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!selected || checkLoading}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm focus-visible:outline-none ${
                        selected && !checkLoading
                          ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                          : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {checkLoading ? 'Checking...' : 'Submit Answer'}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-all shadow-sm focus-visible:outline-none"
                    >
                      {isLastQ ? 'See Results' : 'Next Question'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
