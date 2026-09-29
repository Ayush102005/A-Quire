import React, { createContext, useState, useContext } from 'react';

/**
 * @typedef {Object} QuestionOption
 * @property {number|string} id
 * @property {string} text
 */

/**
 * @typedef {Object} Question
 * @property {number} id
 * @property {string} content
 * @property {Record<string, string>} options
 * @property {number} difficulty
 * @property {string} topic
 */

/**
 * @typedef {Object} Hint
 * @property {number} question_id
 * @property {string} message
 * @property {'concept' | 'step' | 'check-calculation' | 'generic'} [level]
 */

/**
 * @typedef {Object} SessionState
 * @property {Question|null} currentQuestion
 * @property {Hint|null} currentHint
 * @property {'idle' | 'active' | 'complete'} sessionStatus
 */

const SessionContext = createContext(null);

export const SessionProvider = ({ children }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentHint, setCurrentHint] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('idle');

  const value = {
    state: {
      currentQuestion,
      currentHint,
      sessionStatus,
    },
    setQuestion: (q) => setCurrentQuestion(q),
    setHint: (h) => setCurrentHint(h),
    setStatus: (s) => setSessionStatus(s),
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
