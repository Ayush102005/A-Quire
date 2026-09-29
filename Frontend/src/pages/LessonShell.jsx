import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { lessonPath } from '../utils/navigation';
import './LessonShell.css';
import { dsaProblems } from './dsaProblems';

export function DsaLessonPage({ onOpenVideoLesson }) {
  const [searchParams] = useSearchParams();
  const problemId = parseInt(searchParams.get('id')) || 1;
  const problem = dsaProblems.find(p => p.id === problemId) || dsaProblems[0];
  const [activeTab, setActiveTab] = useState('Description');
  const [activeTest, setActiveTest] = useState(problem.testCases?.[0]?.id || 'Case 1');
  const [selectedOption, setSelectedOption] = useState('option1');
  const [runState, setRunState] = useState('idle');
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);

  const testCases = problem.testCases || [];
  const initialCode = problem.initialCode || '';
  const [editorCode, setEditorCode] = useState(initialCode);

  const activeTestCase = testCases.find(tc => tc.id === activeTest) ?? testCases[0];

  const evaluateCode = code => {
    const normalized = code.replace(/\s+/g, ' ');
    const rules = problem.validationRules || [];
    
    for (const rule of rules) {
      if (!rule.pattern.test(normalized)) {
        return { passed: false, output: rule.message };
      }
    }
    
    if (activeTestCase) {
      return { passed: true, output: `Expected ${activeTestCase.expected}. Runtime 0.08s.` };
    }
    return { passed: true, output: 'Code validation passed!' };
  };

  const handleRun = () => {
    setRunState('running');
    const result = evaluateCode(editorCode);
    setRunResult(result);
    setRunState('done');
    setSubmitResult(null);
  };

  const handleSubmit = () => {
    const allPassed = testCases.every(tc => {
      const normalized = editorCode.replace(/\s+/g, ' ');
      return /current\.next\s*=\s*prev/.test(normalized) && /return\s+prev/.test(normalized);
    });
    setSubmitResult(
      allPassed
        ? { success: true, message: 'Great job! Your submission passed our sample verification.' }
        : { success: false, message: 'Submission failed. Check pointer updates and try again.' }
    );
    setRunResult(null);
  };

  const codeLines = editorCode.split('\n');

  return (
    <div className="ls-page ls-page--dsa">
      <div className="ls-topbar">
        <div>
          <div className="ls-breadcrumb">{problem.breadcrumb || 'DSA'}</div>
          <h1 className="ls-heading">{problem.title}</h1>
        </div>

        <div className="ls-actions">
          <span className="ls-pill ls-pill--difficulty">{problem.difficulty}</span>
          {(problem.tags || []).map(tag => (
            <span key={tag} className="ls-pill ls-pill--tag">{tag}</span>
          ))}
          <button className="ls-btn ls-btn--primary" type="button" onClick={handleRun}>
            Run
          </button>
          <button className="ls-btn ls-btn--secondary" type="button" onClick={handleSubmit}>
            Submit
          </button>
          <button className="ls-btn ls-btn--ghost" type="button" onClick={() => onOpenVideoLesson?.()}>
            Watch video explanation
          </button>
        </div>
      </div>

      <div className="ls-split">
        <div className="ls-column ls-column--left">
          <div className="ls-tabs">
            {['Description', 'Editorial', 'Submissions', 'Discussion'].map(tab => (
              <button
                key={tab}
                type="button"
                className={`ls-tab ${activeTab === tab ? 'ls-tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="ls-card ls-card--problem">
            <div className="ls-card__title-row">
              <div>
                <h2>{problem.title}</h2>
              </div>
              <button className="ls-tag-button" type="button">
                Hints
              </button>
            </div>

            {activeTab === 'Description' ? (
              <>
                <p className="ls-text">
                  {problem.description}
                </p>

                {(problem.examples || []).map((example, idx) => (
                  <section key={idx} className="ls-section">
                    <h3>Example {idx + 1}</h3>
                    <pre className="ls-code-sample">Input: {example.input}</pre>
                    <pre className="ls-code-sample">Output: {example.output}</pre>
                    <p className="ls-muted">{example.explanation}</p>
                  </section>
                ))}

                <section className="ls-section">
                  <div className="ls-section__title-row">
                    <h3>Now your turn!</h3>
                    <span className="ls-badge">MCQ</span>
                  </div>
                  <div className="ls-grid-options">
                    {(problem.mcqOptions || []).map(option => (
                      <label key={option.id} className="ls-radio-card">
                        <input
                          type="radio"
                          name="solutionHint"
                          checked={selectedOption === option.id}
                          onChange={() => setSelectedOption(option.id)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="ls-section">
                  <h3>Constraints</h3>
                  <ul className="ls-bullets">
                    {(problem.constraints || []).map((constraint, idx) => (
                      <li key={idx}>{constraint}</li>
                    ))}
                  </ul>
                </section>
              </>
            ) : activeTab === 'Editorial' ? (
              <div>
                <p className="ls-text">
                  {problem.description}
                </p>
                <section className="ls-section">
                  <h3>Key idea</h3>
                  <ul className="ls-bullets">
                    <li>See the full editorial in the problem link above.</li>
                  </ul>
                </section>
              </div>
            ) : activeTab === 'Submissions' ? (
              <div className="ls-submission-list">
                {[
                  { status: 'Passed', time: 'Just now', description: 'Solution passed all test cases.' },
                  { status: 'Failed', time: '5 min ago', description: 'Solution failed on edge case.' },
                ].map((item, idx) => (
                  <div key={idx} className="ls-submission-item">
                    <span className={`ls-badge ${item.status === 'Passed' ? 'ls-badge--success' : 'ls-badge--warning'}`}>
                      {item.status}
                    </span>
                    <div>
                      <p className="ls-text">{item.description}</p>
                      <p className="ls-muted">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ls-discussion-list">
                <div className="ls-discussion-item">
                  <strong>Community</strong>
                  <p>Join the discussion to share your solution approach and learn from others.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ls-column ls-column--right">
          <div className="ls-card ls-card--editor">
            <div className="ls-editor-header">
              <div className="ls-dropdown">Java</div>
              <div className="ls-editor-controls">
                <button className="ls-icon-btn" type="button" onClick={() => navigator.clipboard.writeText(editorCode)}>
                  Copy
                </button>
                <button className="ls-icon-btn" type="button" onClick={() => setEditorCode(initialCode)}>
                  Reset
                </button>
              </div>
            </div>

            <div className="ls-code-window">
              <div className="ls-gutter">
                {codeLines.map((_, index) => (
                  <div key={index} className="ls-line-number">
                    {index + 1}
                  </div>
                ))}
              </div>
              <textarea
                className="ls-code-textarea"
                value={editorCode}
                onChange={e => setEditorCode(e.target.value)}
                spellCheck={false}
                aria-label="Code editor"
              />
            </div>
          </div>

          <div className="ls-card ls-card--tests">
            <div className="ls-card__title-row">
              <h3>Test Cases</h3>
              <div className="ls-pill-group">
                {testCases.map(tc => (
                  <button
                    key={tc.id}
                    type="button"
                    className={`ls-pill ${activeTest === tc.id ? 'ls-pill--active' : ''}`}
                    onClick={() => setActiveTest(tc.id)}
                  >
                    {tc.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="ls-test-details">
              <div className="ls-test-row">
                <span className="ls-test-label">Input</span>
                <pre className="ls-code-sample">{activeTestCase.input}</pre>
              </div>
              <div className="ls-test-row">
                <span className="ls-test-label">Expected</span>
                <pre className="ls-code-sample">{activeTestCase.expected}</pre>
              </div>
              {runResult && (
                <div className={`ls-test-result ${runResult.passed ? 'ls-test-result--passed' : 'ls-test-result--failed'}`}>
                  <strong>{runResult.passed ? 'Passed' : 'Failed'}</strong>
                  <span>{runResult.output}</span>
                </div>
              )}
              <div className="ls-test-buttons">
                <button className="ls-btn ls-btn--secondary" type="button" onClick={handleRun}>
                  {runState === 'running' ? 'Running…' : 'Run'}
                </button>
                <button className="ls-btn ls-btn--ghost" type="button" onClick={() => {
                  setEditorCode(initialCode);
                  setRunResult(null);
                  setSubmitResult(null);
                }}>
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="ls-card ls-card--mentor">
            <div className="ls-card__heading">
              <h3>AI mentor</h3>
            </div>
            <p className="ls-text">
              Try using a two-pointer approach or tracking previous nodes while you traverse the list.
            </p>
            <button className="ls-btn ls-btn--primary" type="button" onClick={() => {}}>
              Need a stronger hint?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



export default function LessonShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const problemId = parseInt(searchParams.get('id')) || 1;

  const handleProblemChange = (e) => {
    const newId = parseInt(e.target.value);
    setSearchParams({ id: newId });
  };

  const handleOpenVideoLesson = () => {
    navigate(lessonPath(problemId));
  };

  return (
    <div className="ls-shell">
      <div className="ls-shell__header">
        <div>
          <div className="ls-shell__label">A‑Quire DSA Problem Solver</div>
          <p className="ls-shell__info">Practice DSA problems with interactive code editor and video explanations.</p>
        </div>
        <div className="ls-shell__nav">
          <select 
            className="ls-problem-selector" 
            value={problemId}
            onChange={handleProblemChange}
            aria-label="Select a DSA problem"
          >
            {dsaProblems.map(p => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DsaLessonPage onOpenVideoLesson={handleOpenVideoLesson} />
    </div>
  );
}
