import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BrainCircuit, ChevronRight, CheckCircle2,
  XCircle, AlertCircle, Loader2, Target,
  Sparkles, Send,
} from 'lucide-react';
import { api } from '../services/api';
import { renderLiteMarkdown } from '../utils/renderLiteMarkdown';
import { useGaze } from '../contexts/GazeProvider';
import GazeStatusPill from '../components/GazeStatusPill';
import ConfidenceSelector from '../components/ConfidenceSelector';

function resultMeta(state) {
  if (state === 'correct')   return { icon: CheckCircle2, iconColor: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Correct!',             labelColor: 'text-emerald-700' };
  return                     { icon: XCircle,      iconColor: 'text-red-400',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Not quite.',           labelColor: 'text-red-600'     };
}

export default function AdaptiveQuiz() {
  const navigate = useNavigate();
  
  // Quiz State
  const [session, setSession] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [marks, setMarks] = useState(0);
  const [topicName, setTopicName] = useState('Loading...');

  // Target marks is student-configurable (a setup screen picks it before the
  // session starts) rather than a hardcoded constant — defaults to the
  // `?target=` URL param if present (so instructor-created quiz links can
  // still preset it), else 5.
  const [started, setStarted] = useState(false);
  const [totalMarks, setTotalMarks] = useState(5);
  const [targetInput, setTargetInput] = useState(() => {
    const raw = Number(new URLSearchParams(window.location.search).get('target'));
    return raw > 0 ? raw : 5;
  });
  const TARGET_PRESETS = [5, 10, 20];

  // Current Question State
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  
  // Submission & Diagnostic State
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | result | diagnostic_loading | diagnostic_result
  const [resultType, setResultType] = useState(null); // correct | incorrect
  const [responseId, setResponseId] = useState(null);
  const [studentExplanation, setStudentExplanation] = useState("");
  const [diagnosticFeedback, setDiagnosticFeedback] = useState(null);

  // Completion State
  const [done, setDone] = useState(false);

  const { setFixationCallback, isActive, gazeQuality, retryInit, requestTracking } = useGaze();
  const [aiNotice, setAiNotice] = useState(null);

  // Start gaze tracking as soon as this page opens rather than waiting for
  // a manual toggle — requestTracking() still respects consent (shows the
  // permission modal first-time, starts immediately if already granted).
  // See LessonPlayer.jsx / GazeProvider.jsx for why this lives per-page
  // rather than as a blanket effect in GazeProvider.
  useEffect(() => {
    requestTracking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [confidence, setConfidence] = useState(null);

  useEffect(() => {
    // NOT setIsActive(true) here — that duplicated the mount-time
    // requestTracking() effect above and, worse, its cleanup called
    // setIsActive(false) (→ gaze.stopTracking(), tearing down the camera)
    // on every unmount. setFixationCallback/setIsActive are new function
    // identities on every GazeProvider render (which happens on every
    // gaze tick while tracking is active — ~30/s), so including them
    // here (plus aiNotice, rapidly-changing state) meant this effect's
    // teardown/setup ran on almost every tick instead of once per page —
    // repeatedly asking for camera permission. Same bug already found and
    // fixed on DsaProblemPage.tsx/QuestionPracticePage.tsx; this page
    // never got the same fix. requestTracking() alone (mirroring
    // LessonPlayer.jsx) is the only thing that should start tracking here.
    setFixationCallback((durationMs, score) => {
      if (score > 60 && !aiNotice) {
        setAiNotice("Take your time to read the full context. Adaptive difficulty will calibrate to your optimal speed.");
      }
    });
    return () => {
      setFixationCallback(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiNotice]);

  async function startQuiz() {
    setStarted(true);
    setTotalMarks(targetInput);
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(window.location.search);
      const topicIdRaw = queryParams.get('topic');
      const moduleIdRaw = queryParams.get('module');

      const moduleId = moduleIdRaw ? Number(moduleIdRaw) : null;
      const topicId = (!moduleId && topicIdRaw) ? Number(topicIdRaw) : (!moduleId ? 1 : null);

      const courseId = Number(queryParams.get('course')) || null;
      const lessonId = Number(queryParams.get('lesson')) || null;

      // 1. Start the session
      const sess = await api.assessments.start(topicId, courseId, lessonId, moduleId);
      setSession(sess);
      setTopicName(sess.topic_name || (topicId ? `Topic ${topicId}` : `Module ${moduleId}`));

      // 2. Fetch first question
      await fetchNextQuestion(sess.id);
    } catch (err) {
      setError(err.message || "Failed to start quiz.");
      setLoading(false);
    }
  }

  async function fetchNextQuestion(sessionId) {
    setLoading(true);
    setSubmitState('idle');
    setResultType(null);
    setSelected(null);
    setConfidence(null);
    setStudentExplanation("");
    setDiagnosticFeedback(null);

    try {
      const nextQ = await api.assessments.next(sessionId);
      console.log('[AdaptiveQuiz] /next response:', JSON.stringify(nextQ));
      if (nextQ.is_complete || !nextQ.question) {
        setDone(true);
      } else {
        // Parse options if it's a string, otherwise it should be an object
        let parsedOptions = nextQ.question.options;
        console.log('[AdaptiveQuiz] raw options:', parsedOptions, typeof parsedOptions);
        if (typeof parsedOptions === 'string') {
           parsedOptions = JSON.parse(parsedOptions);
        }
        
        setQuestion({
          ...nextQ.question,
          optionsObj: parsedOptions || {}
        });
        setQuestionCount(c => c + 1);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch question.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!selected) return;
    setSubmitState('submitting');
    
    try {
      const result = await api.assessments.submit(session.id, question.id, selected, confidence);
      setResponseId(result.response_id);
      
      if (result.is_correct) {
        setResultType('correct');
        setMarks(m => m + (result.marks_earned ?? 1));
        setSubmitState('result');
      } else {
        setResultType('incorrect');
        // marks_earned can be negative under GATE-style negative marking —
        // 0 for every other exam category (see AdaptiveEngine.compute_marks).
        setMarks(m => m + (result.marks_earned ?? 0));
        setSubmitState('result');
      }
      // If backend already says session is over, mark done immediately
      if (result.is_complete) {
        setDone(true);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit answer.");
      setSubmitState('idle');
    }
  }

  async function handleDiagnosticSubmit() {
    if (!studentExplanation.trim()) return;
    setSubmitState('diagnostic_loading');
    
    try {
      const result = await api.assessments.diagnostic(responseId, studentExplanation);
      setDiagnosticFeedback(result);
      setSubmitState('diagnostic_result');
    } catch (err) {
      console.error(err);
      alert("Failed to get feedback.");
      setSubmitState('result');
    }
  }

  async function handleNext() {
    // Check if the student has reached the target marks
    const newMarks = resultType === 'correct' ? marks : marks;
    if (newMarks >= totalMarks) {
      setDone(true);
    } else {
      await fetchNextQuestion(session.id);
    }
  }

  // Setup screen — student picks the session's target marks before it starts.
  if (!started) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border border-stone-200 rounded-2xl shadow-sm p-8">
          <div className="w-14 h-14 rounded-full bg-teal-50 border-4 border-teal-100 flex items-center justify-center mx-auto mb-5">
            <BrainCircuit className="w-7 h-7 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 text-center mb-1">Adaptive Assessment</h2>
          <p className="text-sm text-stone-500 text-center mb-6">Choose how many marks this session should run for.</p>

          <div className="flex gap-2 mb-3">
            {TARGET_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTargetInput(preset)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  targetInput === preset
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <label className="block mb-6">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Or enter a custom target</span>
            <input
              type="number"
              min={1}
              step={0.5}
              value={targetInput}
              onChange={(e) => setTargetInput(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1.5 w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </label>

          <button
            onClick={startQuiz}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-all shadow-sm"
          >
            Start Session <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (loading && !question) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-teal-700 animate-spin" />
          <p className="text-stone-500 font-medium">Initializing Adaptive Engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white border border-stone-200 p-8 rounded-2xl shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-900 mb-2">Error Loading Quiz</h3>
          <p className="text-stone-500 mb-6">{error}</p>
          <a href="/dashboard" className="px-5 py-2.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Completion Screen
  if (done) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl shadow-sm p-8">
          <div className="w-20 h-20 rounded-full bg-teal-50 border-4 border-teal-100 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-9 h-9 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Session Complete!</h2>
          <p className="text-stone-500 mb-8">The Adaptive Engine has successfully measured your ability.</p>
          
          <a href="/dashboard" className="flex items-center justify-center gap-2 py-3 w-full rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-all shadow-sm">
            Return to Dashboard <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const isChecking = submitState === 'submitting';
  const hasSubmitted = submitState !== 'idle' && submitState !== 'submitting';
  const meta = resultType ? resultMeta(resultType) : null;
  const isCorrect = resultType === 'correct';

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-stone-50/90 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors border-0 bg-transparent cursor-pointer">
          <ArrowLeft className="w-4 h-4" />Exit
        </button>
        <div className="flex-1" />
        {isActive && (
          <GazeStatusPill isActive={isActive} quality={gazeQuality} onRetry={retryInit} className="mr-2" />
        )}
        <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
          <BrainCircuit className="w-4 h-4 text-teal-600" />
          <span className="text-stone-700 font-semibold">AMATTA Engine Active</span>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col gap-6">
          {aiNotice && (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-start gap-3 animate-fade-in">
              <BrainCircuit className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />
              <div>
                <h3 className="font-bold text-sm">Adaptive Gaze Mentor</h3>
                <p className="text-sm mt-1">{aiNotice}</p>
                <button 
                  onClick={() => setAiNotice(null)}
                  className="mt-2 text-xs font-bold uppercase tracking-wider bg-indigo-200 hover:bg-indigo-300 text-indigo-900 px-3 py-1.5 rounded transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          )}

          {/* Progress Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Adaptive Assessment</p>
              <h1 className="text-lg font-semibold text-stone-900 leading-snug">Topic: {topicName}</h1>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-stone-500">
                Marks: {Math.min(Math.round(marks * 100) / 100, totalMarks)} / {totalMarks}
              </span>
            </div>
          </div>

          {/* Question card */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            
            {/* Question text */}
            <div className="px-6 sm:px-8 py-5 border-b border-stone-100 flex items-start gap-3 relative">
              {loading && (
                 <div className="absolute top-4 right-4"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div>
              )}
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                <Target className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1 pr-8">
                {typeof question.marks === 'number' && question.marks > 0 && (
                  <span className="inline-block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">
                    {question.marks} mark{question.marks === 1 ? '' : 's'}
                  </span>
                )}
                <p className="text-base font-semibold text-stone-900 leading-snug pt-0.5">
                  {question.content}
                </p>
              </div>
            </div>

            {/* Answer options */}
            <div className="px-6 sm:px-8 py-5 space-y-2.5">
              {question.optionsObj && Object.keys(question.optionsObj).length > 0 ? (
                Object.entries(question.optionsObj).map(([key, text]) => {
                const isSelected = selected === key;
                let optionStyle = 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 cursor-pointer';

                if (hasSubmitted) {
                  if (isSelected && isCorrect) optionStyle = 'border-emerald-400 bg-emerald-50 text-emerald-900';
                  else if (isSelected && !isCorrect) optionStyle = 'border-red-300 bg-red-50/50 text-red-800';
                  else optionStyle = 'border-stone-100 bg-stone-50 text-stone-400 opacity-60';
                } else if (isSelected) {
                  optionStyle = 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-100';
                }

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={hasSubmitted || isChecking}
                    onClick={() => !hasSubmitted && setSelected(key)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 focus-visible:outline-none disabled:cursor-default ${optionStyle}`}
                  >
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all font-bold text-xs ${
                      hasSubmitted && isSelected && isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                      hasSubmitted && isSelected && !isCorrect ? 'border-red-400 bg-red-400 text-white' :
                      isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-stone-300 text-stone-500'
                    }`}>
                      {key}
                    </div>
                    <span className="text-sm font-medium flex-1">{text}</span>
                  </button>
                );
              })
              ) : (
                <p className="text-sm text-stone-400 italic py-2">Loading options…</p>
              )}
            </div>

            {/* Result banner & Diagnostic Flow */}
            {hasSubmitted && meta && (
              <div className="px-6 sm:px-8 pb-5">
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${meta.bg} ${meta.border} mb-4`}>
                  <meta.icon className={`w-4 h-4 shrink-0 ${meta.iconColor}`} />
                  <p className={`text-sm font-semibold ${meta.labelColor}`}>{meta.label}</p>
                </div>

                {/* The Misconception Loop Trigger */}
                {!isCorrect && submitState === 'result' && (
                  <div className="mt-2 border border-amber-200 bg-amber-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4" /> Why did you choose this?
                    </h3>
                    <p className="text-xs text-amber-700 mb-3">
                      Explain your reasoning below so our AI mentor can help you find where you went wrong.
                    </p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={studentExplanation}
                        onChange={(e) => setStudentExplanation(e.target.value)}
                        placeholder="I thought the formula was..."
                        className="flex-1 text-sm px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        onKeyDown={(e) => { if(e.key === 'Enter') handleDiagnosticSubmit(); }}
                      />
                      <button 
                        onClick={handleDiagnosticSubmit}
                        disabled={!studentExplanation.trim()}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading Diagnostic */}
                {submitState === 'diagnostic_loading' && (
                  <div className="mt-2 border border-teal-200 bg-teal-50 rounded-xl p-4 flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                    <span className="text-sm font-medium text-teal-800">AI Mentor is analyzing your reasoning...</span>
                  </div>
                )}

                {/* Diagnostic Feedback */}
                {submitState === 'diagnostic_result' && diagnosticFeedback && (
                  <div className="mt-2 border border-teal-200 bg-gradient-to-br from-teal-50 to-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-800">{diagnosticFeedback.error_type}</span>
                    </div>
                    <div className="text-sm text-stone-700 leading-relaxed space-y-2">
                      {renderLiteMarkdown(diagnosticFeedback.feedback_message)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-6 sm:px-8 py-5 border-t border-stone-100 bg-stone-50/50 flex flex-col gap-4">
              {!hasSubmitted && (
                <ConfidenceSelector 
                  value={confidence} 
                  onChange={setConfidence} 
                  disabled={hasSubmitted || isChecking} 
                />
              )}
              <div className="flex justify-end">
                {!hasSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selected || isChecking}
                    className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm focus-visible:outline-none ${
                      selected && !isChecking
                        ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                  {isChecking ? 'Checking...' : 'Submit Answer'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!isCorrect && submitState === 'result'} // Force them to answer the diagnostic loop first, wait, maybe optional?
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm focus-visible:outline-none ${
                    (!isCorrect && submitState === 'result') 
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed' // Force diagnostic loop
                    : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                  }`}
                >
                  {marks >= totalMarks ? 'Complete Session' : 'Next Question'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              </div>
            </div>
            
            {/* Note to skip diagnostic for testing if forced */}
            {!isCorrect && submitState === 'result' && (
              <div className="px-8 pb-3 text-right">
                <button 
                  onClick={() => setSubmitState('diagnostic_result')} // Bypass hack for demo
                  className="text-[10px] text-stone-400 hover:text-stone-600 underline"
                >
                  Skip explanation (not recommended)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
