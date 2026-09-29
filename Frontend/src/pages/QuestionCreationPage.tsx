import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Trash2, CheckCircle2, 
  XCircle, AlertCircle, Save, ExternalLink,
  BookOpen, Hash, Tag, Type, BarChart, FileEdit, HelpCircle, Layers, FileText
} from 'lucide-react';
import { api } from '../services/api';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// ─── Math Renderer ────────────────────────────────────────────────────────────

const MathRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const blocks = text.split(/(\$\$[\s\S]*?\$\$)/g);
  
  return (
    <div className="math-content font-sans">
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

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAM_OPTIONS = ['JEE', 'NEET', 'GATE', 'CAT', '10th', '12th', 'Other'];
const SUBJECT_OPTIONS = ['Physics', 'Chemistry', 'Maths', 'Biology', 'DSA', 'Engineering', 'Other'];
const TYPE_OPTIONS = [
  { value: 'mcq', label: 'Single Choice (MCQ)' },
  { value: 'multiple_select', label: 'Multiple Select' },
  { value: 'numeric', label: 'Numeric Answer' }
];
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuestionCreationPage() {
  const navigate = useNavigate();

  // Form State
  const [exam, setExam] = useState(EXAM_OPTIONS[0]);
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0]);
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('mcq');
  const [difficulty, setDifficulty] = useState('Medium');
  const [tags, setTags] = useState('');
  
  const [content, setContent] = useState('');
  const [options, setOptions] = useState([{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [explanation, setExplanation] = useState('');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const handleAddOption = () => {
    const nextId = String.fromCharCode(options.length + 65); // A, B, C, D, E...
    setOptions([...options, { id: nextId, text: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    setOptions(options.filter(opt => opt.id !== id));
    setCorrectAnswers(correctAnswers.filter(ans => ans !== id));
  };

  const toggleCorrectAnswer = (id: string) => {
    if (type === 'mcq') {
      setCorrectAnswers([id]);
    } else {
      if (correctAnswers.includes(id)) {
        setCorrectAnswers(correctAnswers.filter(ans => ans !== id));
      } else {
        setCorrectAnswers([...correctAnswers, id]);
      }
    }
  };

  const validate = () => {
    if (!topic.trim()) return 'Topic is required.';
    if (!content.trim()) return 'Question text is required.';
    if (type === 'mcq' || type === 'multiple_select') {
      if (options.some(opt => !opt.text.trim())) return 'All options must have text.';
      if (correctAnswers.length === 0) return 'Please select at least one correct answer.';
    } else if (type === 'numeric') {
      if (correctAnswers.length === 0 || !correctAnswers[0].trim()) return 'Please provide the correct numeric answer.';
    }
    if (!explanation.trim()) return 'Explanation is required.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const payload = {
        exam,
        subject,
        topic: topic.trim(),
        difficulty,
        type,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        content: content.trim(),
        options: type === 'numeric' ? [] : options,
        correct_answer: type === 'mcq' ? correctAnswers[0] : correctAnswers,
        explanation: explanation.trim()
      };

      const res = await api.questions.create(payload);
      const newId = res.id ? String(res.id) : null;
      setCreatedId(newId);
      setSuccess(res.message || `Question created successfully! (ID: ${newId})`);
      
      // Reset form but keep exam/subject/topic for faster bulk creation
      setContent('');
      if (type !== 'numeric') {
        setOptions([{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }]);
      }
      setCorrectAnswers([]);
      setExplanation('');
      setTags('');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)] pb-24">
      
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 bg-[var(--header-bg)] border-b border-[var(--border)] backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg leading-tight">Question Creator</h1>
            <p className="text-xs text-[var(--text-muted)]">Mentor Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2 px-5 py-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Question'}
            {!isSubmitting && <Save className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 flex flex-col xl:flex-row gap-8">
        
        {/* ── EDITOR COLUMN ── */}
        <div className="flex-1 space-y-6">
          
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">Validation Error</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
              <div className="flex-1">
                <h3 className="font-bold text-sm">Question Saved</h3>
                <p className="text-sm mt-1">{success}</p>
                {createdId && (
                  <div className="flex items-center gap-3 mt-2">
                    <a
                      href={`/question/${createdId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-emerald-200 hover:bg-emerald-300 text-emerald-900 px-3 py-1.5 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> View Question #{createdId}
                    </a>
                    <button
                      onClick={() => { setSuccess(''); setCreatedId(null); }}
                      className="text-xs text-emerald-600 hover:text-emerald-800 underline"
                    >
                      Create another
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Meta Information */}
          <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" /> Meta Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold mb-2">Exam Target</label>
                <select value={exam} onChange={e => setExam(e.target.value)} className="app-input">
                  {EXAM_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="app-input">
                  {SUBJECT_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Topic</label>
                <input 
                  type="text" 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)} 
                  placeholder="e.g. Thermodynamics, Graph Theory..." 
                  className="app-input" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="app-input">
                  {DIFFICULTY_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Question Content */}
          <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-indigo-500" /> Question Content
              </h2>
              <select value={type} onChange={e => {
                setType(e.target.value);
                setCorrectAnswers([]);
              }} className="app-input w-auto text-sm py-1.5 px-3">
                {TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--text-muted)] flex justify-between">
                  Question Text
                  <span className="text-xs font-normal">Supports LaTeX ($..$ or $$..$$)</span>
                </label>
                <textarea 
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={5}
                  placeholder="Type your question here..."
                  className="app-input resize-y font-mono text-sm leading-relaxed"
                />
              </div>

              {/* Options Editor (MCQ / MSQ) */}
              {(type === 'mcq' || type === 'multiple_select') && (
                <div className="mt-6">
                  <label className="block text-sm font-semibold mb-3 text-[var(--text-muted)]">Options &amp; Correct Answer(s)</label>
                  <div className="space-y-3">
                    {options.map((opt, idx) => (
                      <div key={opt.id} className="flex gap-3 items-start">
                        <button
                          onClick={() => toggleCorrectAnswer(opt.id)}
                          title="Mark as correct answer"
                          className={`mt-1 shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${
                            correctAnswers.includes(opt.id) 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-400'
                          }`}
                        >
                          {correctAnswers.includes(opt.id) ? <CheckCircle2 className="w-5 h-5" /> : opt.id}
                        </button>
                        <textarea
                          value={opt.text}
                          onChange={e => handleOptionChange(opt.id, e.target.value)}
                          rows={2}
                          placeholder={`Option ${opt.id} text (LaTeX supported)...`}
                          className="app-input font-mono text-sm resize-none"
                        />
                        {options.length > 2 && (
                          <button onClick={() => handleRemoveOption(opt.id)} className="mt-1 p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {options.length < 6 && (
                    <button onClick={handleAddOption} className="mt-4 flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 bg-teal-50 px-4 py-2 rounded-lg transition-colors">
                      <Plus className="w-4 h-4" /> Add Option
                    </button>
                  )}
                </div>
              )}

              {/* Numeric Input */}
              {type === 'numeric' && (
                <div className="mt-6">
                  <label className="block text-sm font-semibold mb-3 text-[var(--text-muted)]">Correct Numeric Answer</label>
                  <input
                    type="number"
                    step="any"
                    value={correctAnswers[0] || ''}
                    onChange={e => setCorrectAnswers([e.target.value])}
                    placeholder="e.g. 42.5"
                    className="app-input max-w-xs font-mono"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Explanation & Tags */}
          <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" /> Explanation &amp; Solution
              </h2>
              <textarea 
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                rows={4}
                placeholder="Explain the step-by-step solution..."
                className="app-input font-mono text-sm leading-relaxed"
              />
            </div>
            
            <div className="pt-4 border-t border-[var(--border)]">
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--text-muted)]" /> Tags (Comma separated)
              </label>
              <input 
                type="text" 
                value={tags} 
                onChange={e => setTags(e.target.value)} 
                placeholder="e.g. calculus, limits, l-hopital" 
                className="app-input" 
              />
            </div>
          </section>

        </div>

        {/* ── LIVE PREVIEW COLUMN ── */}
        <div className="w-full xl:w-[450px] shrink-0 xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2 text-stone-500 uppercase tracking-wider text-xs">
              <ExternalLink className="w-4 h-4" /> Live Student Preview
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-xl shadow-teal-900/5 relative">
            
            {/* Header tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-xs font-bold rounded uppercase">
                {exam}
              </span>
              <span className="px-2 py-1 bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 text-xs font-bold rounded uppercase">
                {subject} {topic && `• ${topic}`}
              </span>
              <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
              }`}>
                {difficulty}
              </span>
            </div>

            {/* Question Text */}
            <div className="prose dark:prose-invert max-w-none text-base leading-loose mb-8 overflow-hidden">
              {content ? (
                <MathRenderer text={content} />
              ) : (
                <div className="text-stone-400 italic">Question content will appear here...</div>
              )}
            </div>

            {/* Options Preview */}
            {(type === 'mcq' || type === 'multiple_select') && (
              <div className="space-y-3">
                {options.map((opt) => (
                  <div key={opt.id} className="w-full text-left p-4 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-stone-400">
                      {opt.id}
                    </div>
                    <div className="flex-1 overflow-x-auto no-scrollbar">
                      {opt.text ? <MathRenderer text={opt.text} /> : <span className="text-stone-300 italic">Option text...</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Numeric Preview */}
            {type === 'numeric' && (
              <div className="mt-4">
                <input type="text" disabled placeholder="Enter numeric value..." className="w-full max-w-xs p-4 text-lg rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] opacity-50 cursor-not-allowed" />
              </div>
            )}
            
            {/* Explanation Preview (always visible in preview mode) */}
            {explanation && (
              <div className="mt-8 p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
                <h4 className="text-emerald-800 dark:text-emerald-400 font-bold mb-3 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5" /> Solution &amp; Explanation
                </h4>
                <div className="text-emerald-900 dark:text-emerald-200 text-sm leading-relaxed prose prose-emerald dark:prose-invert max-w-none">
                  <MathRenderer text={explanation} />
                </div>
              </div>
            )}
            
          </div>
        </div>

      </main>
    </div>
  );
}
