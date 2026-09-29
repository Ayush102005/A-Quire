import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { useNotificationsWS } from '../hooks/useNotificationsWS';
import HintBanner from '../components/HintBanner';
import { api } from '../services/api';
import { useGaze } from '../contexts/GazeProvider';
import GazeStatusPill from '../components/GazeStatusPill';

const AssessmentPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { state, setQuestion, setStatus } = useSession();
  const { currentQuestion, sessionStatus } = state;
  const [selectedOption, setSelectedOption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { isActive, gazeQuality, retryInit, requestTracking } = useGaze();

  // Start gaze tracking as soon as this page opens rather than waiting for
  // a manual toggle — requestTracking() still respects consent (shows the
  // permission modal first-time, starts immediately if already granted).
  // See LessonPlayer.jsx / GazeProvider.jsx for why this lives per-page
  // rather than as a blanket effect in GazeProvider.
  //
  // There used to be a second effect here calling setIsActive(true)/(false)
  // — setIsActive is a new function identity on every GazeProvider render
  // (which happens on every gaze tick while tracking is active, ~30/s), so
  // that effect's cleanup/setup ran on almost every tick instead of once
  // per page, repeatedly tearing down and re-requesting the camera (asking
  // for permission over and over). Same bug already found and fixed on
  // DsaProblemPage.tsx/QuestionPracticePage.tsx/AdaptiveQuiz.jsx; this page
  // never got the same fix. requestTracking() alone is the only thing that
  // should start tracking here.
  useEffect(() => {
    requestTracking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1. Connect to WebSocket
  const token = localStorage.getItem('access_token');
  useNotificationsWS(token);

  // 2. Fetch first question on mount if not active
  useEffect(() => {
    const fetchInitialQuestion = async () => {
      try {
        if (!sessionId) return;
        setStatus('idle');
        const res = await api.get(`/assessments/${sessionId}/next`);
        setQuestion(res.data);
        setStatus('active');
      } catch (err) {
        console.error('Failed to fetch initial question:', err);
        if (err.response?.status === 400 || err.response?.status === 404) {
          setStatus('complete');
        } else {
          setError('Failed to load assessment.');
        }
      }
    };

    if (!currentQuestion && sessionStatus === 'idle') {
      fetchInitialQuestion();
    }
  }, [sessionId, currentQuestion, sessionStatus, setQuestion, setStatus]);

  // 3. Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOption) {
      setError('Please select an option');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      await api.post('/assessments/submit', {
        session_id: parseInt(sessionId, 10),
        question_id: currentQuestion.id,
        selected_option: selectedOption
      });
      // Do not manually change question. Wait for WS 'next_question' or 'hint'.
      setSelectedOption('');
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Render
  if (sessionStatus === 'complete') {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6">
        <div className="bg-stone-900 border border-teal-800 p-8 rounded-xl max-w-md w-full text-center shadow-lg shadow-teal-900/20">
          <h2 className="text-2xl font-bold text-teal-400 mb-4">Session Complete!</h2>
          <p className="text-stone-300 mb-6">
            You've completed this adaptive session. Your ability has been updated.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Adaptive Assessment</h1>
            <p className="text-stone-400">Answer the question below to continue.</p>
          </div>
          {isActive && (
            <GazeStatusPill isActive={isActive} quality={gazeQuality} onRetry={retryInit} />
          )}
        </header>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <HintBanner />

        {currentQuestion ? (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 md:p-8 shadow-xl">
            <h3 className="text-xl text-stone-100 mb-6 font-medium leading-relaxed">
              {currentQuestion.content}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                {Object.entries(currentQuestion.options || {}).map(([key, text]) => (
                  <label
                    key={key}
                    className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all duration-200
                      ${selectedOption === key 
                        ? 'bg-teal-900/30 border-teal-500 ring-1 ring-teal-500' 
                        : 'bg-stone-950 border-stone-800 hover:border-teal-700/50 hover:bg-stone-800'
                      }`}
                  >
                    <input
                      type="radio"
                      name="answerOption"
                      value={key}
                      checked={selectedOption === key}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      className="w-4 h-4 text-teal-500 bg-stone-900 border-stone-700 focus:ring-teal-600 focus:ring-offset-stone-900"
                    />
                    <span className="ml-3 text-stone-200 font-medium">
                      <span className="text-teal-500 mr-2">{key}.</span> 
                      {text}
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedOption}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-stone-800 disabled:text-stone-500 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : 'Submit Answer'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex justify-center items-center h-48">
            <div className="animate-pulse flex space-x-2">
              <div className="h-3 w-3 bg-teal-600 rounded-full"></div>
              <div className="h-3 w-3 bg-teal-600 rounded-full animation-delay-200"></div>
              <div className="h-3 w-3 bg-teal-600 rounded-full animation-delay-400"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentPage;
