import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, BarChart2, Settings,
  Bell, ChevronRight, AlertTriangle, TrendingUp, Brain,
  Download, RefreshCw, Activity, Clock, CheckCircle2,
  Lightbulb, FileText, Zap, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Edit3, Eye, EyeOff, X, Loader2, ChevronDown,
  ChevronUp, Play, Link as LinkIcon, GraduationCap, Save, Menu, Mail,
  HelpCircle, Check,
} from 'lucide-react';
import { api, getCurrentUser } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import { LoadingState, EmptyState } from '../components/UXStates';
import InstructorSidebar from '../components/InstructorSidebar';
import { getStruggleReasonText } from '../components/lesson/InterventionOverlay';

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Static mock data (overview tab) removed for production ───────────

// ── Small shared components ───────────────────────────────────────────────────
function Sparkline({ values, minVal, maxVal }) {
  const max = maxVal !== undefined ? maxVal : Math.max(...values);
  const min = minVal !== undefined ? minVal : Math.min(...values);
  const h = 48, w = 200;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#0d9488" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
function MetricCard({ label, value, delta, up, sub }) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col gap-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)]">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-[var(--text)] tabular-nums">{value}</span>
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
          {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {delta}
        </span>
      </div>
      <p className="text-[10px] text-[var(--text-faint)] font-medium">{sub}</p>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-page-enter" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden animate-modal-enter">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 id="modal-title" className="text-sm font-semibold text-[var(--text)]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Form field ────────────────────────────────────────────────────────────────
function Field({ label, id, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-[var(--text)]">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[var(--text-faint)]">{hint}</p>}
    </div>
  );
}
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-[var(--input-border)] text-sm text-[var(--input-text)] placeholder-[var(--text-faint)] bg-[var(--input-bg)] outline-none focus:ring-4 focus:ring-teal-600/10 focus:border-teal-600 transition-all";
const textareaCls = inputCls + " resize-none";

// ── Course card ───────────────────────────────────────────────────────────────
function CourseCard({ course, onEdit, onTogglePublish, onDelete, onExpand, expanded }) {
  const lessonCount = course.modules?.reduce((s, m) => s + m.lessons.length, 0) ?? 0;
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
          <GraduationCap className="w-4.5 h-4.5 text-teal-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--text)] truncate">{course.title}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              course.is_published ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]'
            }`}>
              {course.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">{course.modules?.length ?? 0} modules · {lessonCount} lessons</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onTogglePublish(course)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-teal-700 hover:bg-teal-50 transition-colors"
            title={course.is_published ? 'Unpublish' : 'Publish'}
          >
            {course.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onEdit(course)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(course)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onExpand(course.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors" title="Toggle modules">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {expanded && <ModuleList course={course} />}
    </div>
  );
}

// ── Module list (inside expanded course card) ─────────────────────────────────
function ModuleList({ course }) {
  const [modules, setModules] = useState(course.modules || []);
  
  useEffect(() => {
    setModules(course.modules || []);
  }, [course.modules]);

  const [showAddModule, setShowAddModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedModule, setExpandedModule] = useState(null);

  async function handleAddModule(e) {
    e.preventDefault();
    if (!moduleTitle.trim()) return;
    setSaving(true);
    try {
      const mod = await api.instructor.createModule(
        course.id,
        moduleTitle.trim(),
        '',
        modules.length + 1
      );
      setModules(prev => [...prev, mod]);
      setModuleTitle('');
      setShowAddModule(false);
    } catch (err) {
      alert('Failed to create module: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModule(modId) {
    if (!confirm('Delete this module and all its lessons?')) return;
    try {
      await api.instructor.deleteModule(modId);
      setModules(prev => prev.filter(m => m.id !== modId));
    } catch (err) {
      alert('Failed to delete module: ' + err.message);
    }
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 space-y-3">
      {modules.length === 0 && !showAddModule && (
        <EmptyState 
          title="No modules yet" 
          message="Add a module to start organizing your lessons." 
        />
      )}
      {modules.map(mod => (
        <div key={mod.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <BookOpen className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
            <span className="flex-1 text-xs font-semibold text-[var(--text)] truncate">{mod.title}</span>
            <span className="text-[10px] text-[var(--text-faint)]">{mod.lessons?.length ?? 0} lessons</span>
            <button
              onClick={() => handleDeleteModule(mod.id)}
              className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setExpandedModule(prev => prev === mod.id ? null : mod.id)}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              {expandedModule === mod.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          {expandedModule === mod.id && <LessonList module={mod} course={course} />}
        </div>
      ))}

      {showAddModule ? (
        <form onSubmit={handleAddModule} className="flex items-center gap-2">
          <input
            id={`new-module-${course.id}`}
            autoFocus
            type="text"
            value={moduleTitle}
            onChange={e => setModuleTitle(e.target.value)}
            placeholder="Module title…"
            className={inputCls + ' flex-1 text-xs py-2'}
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !moduleTitle.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 hover:bg-teal-800 transition-colors"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
          <button type="button" onClick={() => setShowAddModule(false)} className="p-2 rounded-lg text-[var(--text-faint)] hover:bg-[var(--surface-2)] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowAddModule(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50/50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Module
        </button>
      )}
    </div>
  );
}

// ── Lesson list (inside expanded module) ──────────────────────────────────────
function LessonList({ module, course }) {
  const [lessons, setLessons] = useState(module.lessons || []);

  useEffect(() => {
    setLessons(module.lessons || []);
  }, [module.lessons]);

  const [showForm, setShowForm] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState(null);
  const [lessonType, setLessonType] = useState('video'); // 'dsa' or 'video'
  const [form, setForm] = useState({
    title: '',
    video_url: '',
    description: '',
    // DSA specific fields
    category: '',
    difficulty: 'Easy',
    topic: '',
    problem_statement: '',
    examples: '',
    constraints: '',
    approaches: '',
    code_solutions: '',
    complexity_time: '',
    complexity_space: '',
    external_links: '',
    auto_fetch_transcript: true,
  });
  const [saving, setSaving] = useState(false);

  const uniqueCategories = [...new Set(lessons.filter(l => l.lesson_type === 'dsa' && l.category).map(l => l.category))];

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const lessonPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        lesson_type: lessonType,
      };

      if (lessonType === 'video') {
        lessonPayload.video_url = form.video_url.trim();
      } else if (lessonType === 'dsa') {
        lessonPayload.problem_id = form.problem_id || 'two-sum';
        lessonPayload.category = form.category.trim();
        lessonPayload.difficulty = form.difficulty;
        lessonPayload.topic = form.topic;
        lessonPayload.problem_statement = form.problem_statement;
        lessonPayload.examples = form.examples;
        lessonPayload.constraints = form.constraints;
        lessonPayload.approaches = form.approaches;
        lessonPayload.code_solutions = form.code_solutions;
        lessonPayload.complexity_time = form.complexity_time;
        lessonPayload.complexity_space = form.complexity_space;
        lessonPayload.external_links = form.external_links;
      }

      const lesson = await api.instructor.createLesson(
        module.id,
        lessonPayload.title,
        lessonPayload.video_url || '',
        lessonPayload.description,
        lessons.length + 1,
        0,
        lessonType,
        lessonType === 'dsa' ? lessonPayload : null
      );
      
      let finalLesson = lesson;
      if (lessonType === 'video' && form.video_url.trim() && form.auto_fetch_transcript) {
        try {
          finalLesson = await api.instructor.fetchTranscript(lesson.id);
        } catch (fetchErr) {
          console.error("Failed to auto-fetch transcript:", fetchErr);
          // Don't alert here so we still complete the creation flow successfully
        }
      }
      
      setLessons(prev => [...prev, finalLesson]);
      resetForm();
      setShowForm(false);
    } catch (err) {
      alert('Failed to create lesson: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm({
      title: '',
      video_url: '',
      description: '',
      category: '',
      difficulty: 'Medium',
      problem_id: KNOWN_PROBLEMS[0].id,
      topic: '',
      problem_statement: '',
      examples: '',
      constraints: '',
      approaches: '',
      code_solutions: '',
      complexity_time: '',
      complexity_space: '',
      external_links: '',
      auto_fetch_transcript: true,
    });
  }

  async function handleDelete(lessonId) {
    if (!confirm('Delete this lesson?')) return;
    try {
      await api.instructor.deleteLesson(lessonId);
      setLessons(prev => prev.filter(l => l.id !== lessonId));
    } catch (err) {
      alert('Failed to delete lesson: ' + err.message);
    }
  }

  async function handleFetchTranscript(lessonId) {
    try {
      setSaving(true);
      const updated = await api.instructor.fetchTranscript(lessonId);
      setLessons(prev => prev.map(l => l.id === lessonId ? updated : l));
      alert('Transcript fetched successfully.');
    } catch (err) {
      alert('Failed to fetch transcript: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-4 pl-12 space-y-2">
      {lessons.length === 0 && !showForm && (
        <EmptyState 
          title="No lessons" 
          message="This module is empty. Add a video or DSA problem." 
        />
      )}
      {lessons.map((l, i) => (
        <div key={l.id}>
          <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2">
            <span className="text-[10px] text-[var(--text-faint)] font-mono w-4 shrink-0">{i + 1}</span>
            <Play className="w-3 h-3 text-teal-500 shrink-0" />
            <span className="flex-1 text-xs font-medium text-[var(--text)] truncate">{l.title}</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-semibold">
              {l.lesson_type === 'dsa' ? 'DSA' : 'Video'}
            </span>
            {l.video_url && (
              <>
                <button title="Fetch Transcript" onClick={() => handleFetchTranscript(l.id)} className="text-[var(--text-muted)] hover:text-teal-600 transition-colors">
                  <FileText className="w-3 h-3" />
                </button>
                <a href={l.video_url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-teal-600 transition-colors">
                  <LinkIcon className="w-3 h-3" />
                </a>
              </>
            )}
            <button
              title="Add quiz questions for this lesson's chapter"
              onClick={() => setQuizLessonId(prev => prev === l.id ? null : l.id)}
              className={`transition-colors ${quizLessonId === l.id ? 'text-teal-600' : 'text-[var(--text-muted)] hover:text-teal-600'}`}
            >
              <HelpCircle className="w-3 h-3" />
            </button>
            <button onClick={() => handleDelete(l.id)} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          {quizLessonId === l.id && (
            <LessonQuizPanel module={module} course={course} onClose={() => setQuizLessonId(null)} />
          )}
        </div>
      ))}

      {showForm ? (
        <form onSubmit={handleAdd} className="space-y-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 max-h-96 overflow-y-auto">
          <div>
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Lesson Type</p>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="video"
                  checked={lessonType === 'video'}
                  onChange={e => {
                    setLessonType(e.target.value);
                  }}
                  disabled={saving}
                />
                <span className="text-xs text-[var(--text)]">Video Lesson</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="dsa"
                  checked={lessonType === 'dsa'}
                  onChange={e => {
                    setLessonType(e.target.value);
                  }}
                  disabled={saving}
                />
                <span className="text-xs text-[var(--text)]">DSA Problem</span>
              </label>
            </div>
          </div>

          <input
            autoFocus
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Lesson title (required)*"
            className={inputCls + ' text-xs py-2 font-semibold'}
            disabled={saving}
            required
          />

          {lessonType === 'video' ? (
            <>
              <input
                type="url"
                value={form.video_url}
                onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                placeholder="YouTube / video URL (optional)"
                className={inputCls + ' text-xs py-2'}
                disabled={saving}
              />
              <label className="flex items-center gap-2 cursor-pointer mt-1 mb-1">
                <input
                  type="checkbox"
                  checked={form.auto_fetch_transcript}
                  onChange={e => setForm(f => ({ ...f, auto_fetch_transcript: e.target.checked }))}
                  disabled={saving}
                  className="rounded border-[var(--border)] text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs text-[var(--text-muted)]">Auto-fetch YouTube transcript</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Notes / description (optional)"
                rows={2}
                className={textareaCls + ' text-xs py-2'}
                disabled={saving}
              />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    list={`cat-list-${module.id}`}
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className={inputCls + ' text-xs py-2 w-full'}
                    placeholder="Select or enter new category*"
                    disabled={saving}
                    required
                  />
                  <datalist id={`cat-list-${module.id}`}>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <select
                  value={form.difficulty}
                  onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                  className={inputCls + ' text-xs py-2'}
                  disabled={saving}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <input
                type="text"
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                placeholder="Topic (e.g., Binary Search Tree, Arrays)"
                className={inputCls + ' text-xs py-2'}
                disabled={saving}
              />


              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Problem Link*</p>
                <select
                  value={form.problem_id}
                  onChange={e => setForm(f => ({ ...f, problem_id: e.target.value }))}
                  className={inputCls + ' text-xs py-2 w-full'}
                  disabled={saving}
                >
                  <option value="two-sum">Two Sum</option>
                  <option value="reverse-linked-list">Reverse Linked List</option>
                  <option value="valid-parentheses">Valid Parentheses</option>
                  <option value="merge-two-sorted-lists">Merge Two Sorted Lists</option>
                </select>
                <p className="text-[9px] text-[var(--text-faint)] mt-1 mb-2">
                  When a problem is linked, students will be presented with a full coding environment instead of a reference lesson.
                </p>
              </div>

              <textarea
                value={form.problem_statement}
                onChange={e => setForm(f => ({ ...f, problem_statement: e.target.value }))}
                placeholder="Optional notes or additional context..."
                rows={2}
                className={textareaCls + ' text-xs py-2'}
                disabled={saving}
              />


              <input
                type="text"
                value={form.external_links}
                onChange={e => setForm(f => ({ ...f, external_links: e.target.value }))}
                placeholder="External links (LeetCode, TUF+, YouTube - comma separated URLs)"
                className={inputCls + ' text-xs py-2'}
                disabled={saving}
              />

              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Additional notes or hints (optional)"
                rows={1}
                className={textareaCls + ' text-xs py-2'}
                disabled={saving}
              />
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || !form.title.trim() || (lessonType === 'dsa' && (!form.category.trim() || !form.problem_statement.trim()))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 hover:bg-teal-800 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Lesson
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setLessonType('video');
                resetForm();
              }}
              className="px-3 py-1.5 rounded-lg text-[var(--text-muted)] text-xs hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-[9px] text-[var(--text-faint)] italic">* Required fields</p>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[10px] text-[var(--text-faint)] hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50/40 transition-all"
        >
          <Plus className="w-3 h-3" /> Add Lesson
        </button>
      )}
    </div>
  );
}

// ── Lesson quiz panel — authors an MCQ question tied to this lesson's chapter ──
// Questions are attached by TOPIC, not lesson_id directly (see app/models/
// assessment.py) — matching the module's title as the topic name means these
// questions surface in the "Chapter Quiz" launched from CourseDetail.jsx,
// which resolves its Topic the same way (see start_quiz_session in
// assessments.py). Manually-authored questions here sit in the same pool the
// adaptive engine draws from and can fall back to AI generation for —
// they're not a separate, disconnected quiz system.
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

// Known problem slugs from problem_bank.py. In a full implementation these
// would be fetched from GET /problems but for V1 we keep them client-side
// to avoid an extra round-trip on every panel open.
const KNOWN_PROBLEMS = [
  { id: 'two-sum',              label: 'Two Sum (Easy)' },
  { id: 'reverse-linked-list', label: 'Reverse Linked List (Easy)' },
];

function LessonQuizPanel({ module, course, onClose }) {
  // Question type: 'mcq' or 'coding' (DSA problem)
  const [qType, setQType]           = useState('mcq');
  // MCQ fields
  const [content, setContent]       = useState('');
  const [options, setOptions]       = useState({ A: '', B: '', C: '', D: '' });
  const [correctAnswer, setCorrectAnswer] = useState('A');
  // DSA fields
  const [problemSlug, setProblemSlug] = useState(KNOWN_PROBLEMS[0].id);
  const [dsaPrompt, setDsaPrompt]   = useState('');
  // Shared
  const [difficulty, setDifficulty] = useState('Medium');
  const [saving, setSaving]         = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const canSaveMcq  = content.trim() && OPTION_KEYS.every(k => options[k].trim());
  const canSaveDsa  = problemSlug.trim();
  const canSave     = qType === 'mcq' ? canSaveMcq : canSaveDsa;

  function resetForm() {
    setContent(''); setOptions({ A: '', B: '', C: '', D: '' }); setCorrectAnswer('A');
    setDsaPrompt(''); setProblemSlug(KNOWN_PROBLEMS[0].id);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const base = {
        exam:       course?.exam_category || 'Other',
        subject:    course?.title || module.title,
        topic:      module.title,
        difficulty,
        tags:       [],
        explanation: '',
      };

      if (qType === 'mcq') {
        await api.questions.create({
          ...base,
          type: 'mcq',
          content: content.trim(),
          options: OPTION_KEYS.map(k => ({ id: k, text: options[k].trim() })),
          correct_answer: correctAnswer,
        });
      } else {
        // DSA coding problem — linked by problem slug
        const problemLabel = KNOWN_PROBLEMS.find(p => p.id === problemSlug)?.label || problemSlug;
        await api.questions.create({
          ...base,
          type: 'coding',
          content: dsaPrompt.trim() || `Solve the DSA problem: ${problemLabel}`,
          problem_id: problemSlug,
          options: [],
          correct_answer: '',
        });
      }

      setAddedCount(c => c + 1);
      resetForm();
    } catch (err) {
      alert('Failed to add question: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className="mt-1.5 mb-2 space-y-2.5 bg-[var(--card-bg)] border border-teal-200 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider">
          Add question — {module.title}
        </p>
        <button type="button" onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text)] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {addedCount > 0 && (
        <p className="flex items-center gap-1 text-[10px] font-medium text-teal-700">
          <Check className="w-3 h-3" /> {addedCount} question{addedCount === 1 ? '' : 's'} added this session
        </p>
      )}

      {/* Question Type Toggle */}
      <div>
        <p className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Question Type</p>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`qtype-${module.id}`}
              value="mcq"
              checked={qType === 'mcq'}
              onChange={() => { setQType('mcq'); resetForm(); }}
              disabled={saving}
            />
            <span className="text-xs text-[var(--text)]">MCQ</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`qtype-${module.id}`}
              value="coding"
              checked={qType === 'coding'}
              onChange={() => { setQType('coding'); resetForm(); }}
              disabled={saving}
            />
            <span className="text-xs text-[var(--text)]">DSA Problem</span>
          </label>
        </div>
      </div>

      {/* MCQ fields */}
      {qType === 'mcq' && (
        <>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Question text*"
            rows={2}
            className={textareaCls + ' text-xs py-2'}
            disabled={saving}
          />
          <div className="space-y-1.5">
            {OPTION_KEYS.map(k => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${module.id}`}
                  checked={correctAnswer === k}
                  onChange={() => setCorrectAnswer(k)}
                  disabled={saving}
                  title="Mark as correct answer"
                />
                <span className="text-[10px] font-mono text-[var(--text-faint)] w-3 shrink-0">{k}</span>
                <input
                  type="text"
                  value={options[k]}
                  onChange={e => setOptions(o => ({ ...o, [k]: e.target.value }))}
                  placeholder={`Option ${k}*`}
                  className={inputCls + ' text-xs py-1.5 flex-1'}
                  disabled={saving}
                />
              </label>
            ))}
          </div>
          <p className="text-[9px] text-[var(--text-faint)]">Select the radio button next to the correct option.</p>
        </>
      )}

      {/* DSA Problem fields */}
      {qType === 'coding' && (
        <>
          <div>
            <p className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Problem*</p>
            <select
              value={problemSlug}
              onChange={e => setProblemSlug(e.target.value)}
              className={inputCls + ' text-xs py-1.5 w-full'}
              disabled={saving}
            >
              {KNOWN_PROBLEMS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <textarea
            value={dsaPrompt}
            onChange={e => setDsaPrompt(e.target.value)}
            placeholder="Optional prompt shown to the student (e.g. 'Solve using a hash map')"
            rows={2}
            className={textareaCls + ' text-xs py-2'}
            disabled={saving}
          />
          <p className="text-[9px] text-[var(--text-faint)]">
            Students will be taken to the interactive code editor for this problem.
          </p>
        </>
      )}

      {/* Footer row: difficulty + submit */}
      <div className="flex items-center gap-2">
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          className={inputCls + ' text-xs py-1.5 w-28'}
          disabled={saving}
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <button
          type="submit"
          disabled={saving || !canSave}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 hover:bg-teal-800 transition-colors"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add {qType === 'coding' ? 'DSA' : 'MCQ'} Question
        </button>
      </div>
    </form>
  );
}

// ── Courses Tab ───────────────────────────────────────────────────────────────
function CoursesTab() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', exam_category: 'Other' });
  const [saving, setSaving] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.instructor.myCourses();
      setCourses(data);
    } catch (err) {
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const course = await api.instructor.createCourse(form.title.trim(), form.description.trim(), form.exam_category);
      setCourses(prev => [course, ...prev]);
      setShowCreateModal(false);
      setForm({ title: '', description: '', exam_category: 'Other' });
    } catch (err) {
      alert('Failed to create course: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!form.title.trim() || !editCourse) return;
    setSaving(true);
    try {
      const updated = await api.instructor.updateCourse(editCourse.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        exam_category: form.exam_category,
      });
      setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
      setShowEditModal(false);
      setEditCourse(null);
    } catch (err) {
      alert('Failed to update course: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(course) {
    try {
      const updated = course.is_published
        ? await api.instructor.unpublishCourse(course.id)
        : await api.instructor.publishCourse(course.id);
      setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      alert('Failed to toggle publish: ' + err.message);
    }
  }

  async function handleDelete(course) {
    if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    try {
      await api.instructor.deleteCourse(course.id);
      setCourses(prev => prev.filter(c => c.id !== course.id));
    } catch (err) {
      alert('Failed to delete course: ' + err.message);
    }
  }

  function openEdit(course) {
    setEditCourse(course);
    setForm({ title: course.title, description: course.description || '', exam_category: course.exam_category || 'Other' });
    setShowEditModal(true);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)]">My Courses</h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">
            {courses.length} course{courses.length !== 1 ? 's' : ''} · click a course to manage modules and lessons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCourses}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button
            id="create-course-btn"
            onClick={() => { setForm({ title: '', description: '', exam_category: 'Other' }); setShowCreateModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> New Course
          </button>
        </div>
      </div>

      {/* States */}
      {loading && <LoadingState message="Loading courses..." />}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error}
          <button onClick={loadCourses} className="ml-3 text-xs font-semibold underline">Retry</button>
        </div>
      )}
      {!loading && !error && courses.length === 0 && (
        <EmptyState 
          title="No courses yet"
          message="Create your first course to get started."
          action={
            <button
              onClick={() => { setForm({ title: '', description: '', exam_category: 'Other' }); setShowCreateModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Course
            </button>
          }
        />
      )}
      {!loading && !error && courses.map(course => (
        <CourseCard
          key={course.id}
          course={course}
          onEdit={openEdit}
          onTogglePublish={handleTogglePublish}
          onDelete={handleDelete}
          onExpand={id => setExpandedCourse(prev => prev === id ? null : id)}
          expanded={expandedCourse === course.id}
        />
      ))}

      {/* Create modal */}
      {showCreateModal && (
        <Modal title="Create New Course" onClose={() => setShowCreateModal(false)}>
          <form id="create-course-form" onSubmit={handleCreate} className="space-y-4">
            <Field label="Course Title *" id="course-title">
              <input
                id="course-title"
                autoFocus
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Arrays — Complete Guide"
                className={inputCls}
                required
                maxLength={255}
              />
            </Field>
            <Field label="Exam Category" id="course-category">
              <select
                id="course-category"
                value={form.exam_category}
                onChange={e => setForm(f => ({ ...f, exam_category: e.target.value }))}
                className={inputCls}
              >
                <option value="DSA">DSA</option>
                <option value="JEE">JEE</option>
                <option value="NEET">NEET</option>
                <option value="GATE">GATE</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Description" id="course-desc" hint="Optional — helps students find and understand your course.">
              <textarea
                id="course-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What will students learn?"
                rows={3}
                className={textareaCls}
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <button
                id="confirm-create-course-btn"
                type="submit"
                disabled={saving || !form.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold disabled:opacity-50 hover:bg-teal-800 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Course
              </button>
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 rounded-xl text-[var(--text-muted)] text-sm hover:bg-[var(--surface-2)] transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {showEditModal && editCourse && (
        <Modal title={`Edit: ${editCourse.title}`} onClose={() => { setShowEditModal(false); setEditCourse(null); }}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Course Title *" id="edit-course-title">
              <input
                id="edit-course-title"
                autoFocus
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={inputCls}
                required
                maxLength={255}
              />
            </Field>
            <Field label="Exam Category" id="edit-course-category">
              <select
                id="edit-course-category"
                value={form.exam_category}
                onChange={e => setForm(f => ({ ...f, exam_category: e.target.value }))}
                className={inputCls}
              >
                <option value="DSA">DSA</option>
                <option value="JEE">JEE</option>
                <option value="NEET">NEET</option>
                <option value="GATE">GATE</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Description" id="edit-course-desc">
              <textarea
                id="edit-course-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className={textareaCls}
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !form.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold disabled:opacity-50 hover:bg-teal-800 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
              <button type="button" onClick={() => { setShowEditModal(false); setEditCourse(null); }} className="px-4 py-2.5 rounded-xl text-[var(--text-muted)] text-sm hover:bg-[var(--surface-2)] transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Lesson Timeline Modal ─────────────────────────────────────────────────────
function LessonTimelineModal({ lessonId, lessonName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.instructor.getLessonTimeline(lessonId)
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load timeline.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lessonId]);

  return (
    <Modal title={`Struggle Timeline: ${lessonName}`} onClose={onClose}>
      <div className="space-y-4">
        {loading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>}
        {!loading && error && <p className="text-sm text-red-500">{error}</p>}
        {!loading && !error && data && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider">Total Struggles</span>
              <span className="text-sm font-bold text-[var(--text)]">{data.total_struggles}</span>
            </div>
            
            {data.timeline.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No struggle events recorded for this lesson yet.</p>
            ) : (
              <div className="pt-2">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Struggles over video duration</p>
                <div className="relative h-32 flex items-end gap-1 pb-6">
                  {data.timeline.map((bucket, i) => {
                    const maxCount = Math.max(...data.timeline.map(b => b.count));
                    const heightPct = Math.max(5, (bucket.count / maxCount) * 100);
                    const mins = Math.floor(bucket.timestamp_s / 60);
                    const secs = bucket.timestamp_s % 60;
                    const timeLabel = `${mins}:${secs.toString().padStart(2, '0')}`;
                    return (
                      <div key={bucket.timestamp_s} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div 
                          className="w-full bg-teal-500 hover:bg-teal-600 rounded-t-sm transition-all" 
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="absolute -bottom-5 text-[8px] text-[var(--text-faint)] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {timeLabel}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute -top-7 bg-black/80 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {timeLabel} - {bucket.count} struggle{bucket.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Overview Tab (original content) ──────────────────────────────────────────
function OverviewTab({ setActiveTab }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timelineLesson, setTimelineLesson] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, less, stud] = await Promise.all([
        api.instructor.getSummary(),
        api.instructor.getLessons(),
        api.instructor.getStudents(),
      ]);
      setSummary(sum);
      setLessons(less || []);
      setStudents(stud || []);
    } catch (err) {
      // Previously silently swallowed here — a failed request rendered
      // identically to "genuinely no data yet" with no way to tell the two
      // apart from the UI. Surface it instead.
      console.error("Failed to load overview data", err);
      setError(err.message || 'Failed to load overview data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metrics = summary ? [
    { label: 'Total Struggles', value: summary.total_struggles, delta: '--', up: true, sub: 'Platform-wide' },
    { label: 'AI Interventions', value: summary.interventions, delta: '--', up: true, sub: 'total hints' },
    { label: 'Resolution Rate', value: `${summary.resolution_rate_pct}%`, delta: '--', up: true, sub: 'of interventions' },
    { label: 'At-Risk Students', value: summary.at_risk_students, delta: '--', up: false, sub: 'needs attention' },
  ] : [];

  const hotspots = lessons.slice(0, 5).map(l => ({
     id: l.id, lesson: l.name, module: l.module, struggles: l.struggles, rate: l.rate
  }));

  const stList = students.slice(0, 5).map((s, i) => ({
     id: s.id || i, name: s.name, avatar: s.name[0], lastActive: 'recently', lesson: 'active', struggles: s.struggles, status: s.risk
  }));

  // Derived from the real 12-week engagement_trend array — there is no
  // separate "engagement_stats" from the backend (there was previously a
  // hardcoded 80%/74%/65% fallback here that always won, since that field
  // never actually existed on any response).
  const engagementTrend = summary?.engagement_trend || [];
  const engagementStats = engagementTrend.length
    ? {
        peak: `${Math.round(Math.max(...engagementTrend))}%`,
        current: `${Math.round(engagementTrend[engagementTrend.length - 1])}%`,
        // Was `engagementTrend.reduce(...) / engagementTrend.length` here —
        // dividing by all 12 weekly buckets unconditionally, including any
        // with zero recorded activity. Once a week's data collapses to a
        // single bucket average, "0.0" is indistinguishable between "no
        // one did anything this week" and "students genuinely engaged at
        // 0%" — so one real 100% week diluted across 11 silent ones read
        // as "8% avg", which looks like almost no one is engaged rather
        // than the true story. engagement_trend_avg is computed
        // server-side (see get_instructor_summary()) from the same raw
        // weekly buckets, but only over the weeks that actually had data.
        avg: summary?.engagement_trend_avg != null
          ? `${Math.round(summary.engagement_trend_avg)}%`
          : '--',
      }
    : { peak: '--', current: '--', avg: '--' };

  const STATUS_BADGE = {
    high: 'bg-red-50 text-red-700 border-red-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    low: 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]',
  };

  // Builds a CSV from whatever this page already has loaded (no extra
  // request — the same summary/lessons/students already rendered above)
  // and triggers a real browser download. "Export Class Report" previously
  // had no handler at all, so clicking it did nothing.
  function handleExportReport() {
    const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['A-Quire Class Overview Report'],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Total Struggles', summary?.total_struggles ?? ''],
      ['AI Interventions', summary?.interventions ?? ''],
      ['Resolution Rate (%)', summary?.resolution_rate_pct ?? ''],
      ['At-Risk Students', summary?.at_risk_students ?? ''],
      [],
      ['Lesson', 'Module', 'Students Struggled', 'Struggle Rate (%)'],
      ...lessons.map(l => [l.name, l.module, l.struggles, l.rate]),
      [],
      ['Student', 'Struggles', 'Risk Level'],
      ...students.map(s => [s.name, s.struggles, s.risk]),
    ];
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingState message="Loading overview..." />;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error}
          <button onClick={load} className="ml-3 text-xs font-semibold underline">Retry</button>
        </div>
      )}

      <section aria-label="Key metrics" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </section>

      <section aria-label="Struggle hotspots and hint effectiveness" className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Lessons with Highest Struggle Rate
              </h2>
              <p className="text-xs text-[var(--text-faint)] mt-0.5">Ranked by % of students who triggered an AI intervention</p>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Struggle hotspots">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                  {['Lesson', 'Module', 'Students', 'Struggle Rate', ''].map(h => (
                    <th key={h} className="text-left px-5 py-2.5 text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {hotspots.map((row, i) => (
                  <tr key={row.lesson} className="hover:bg-[var(--surface)] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center shrink-0 ${i === 0 ? 'bg-red-50 text-red-600' : i < 3 ? 'bg-amber-50 text-amber-600' : 'bg-[var(--surface)] text-[var(--text-muted)]'}`}>{i + 1}</span>
                        <span className="font-medium text-[var(--text)] text-xs truncate max-w-[140px]">{row.lesson}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{row.module}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-[var(--text)] tabular-nums">{row.struggles}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[var(--surface)] rounded-full overflow-hidden hidden sm:block">
                          <div className={`h-full rounded-full ${row.rate > 60 ? 'bg-red-400' : row.rate > 40 ? 'bg-amber-400' : 'bg-teal-400'}`} style={{ width: `${row.rate}%` }} />
                        </div>
                        <span className={`text-xs font-bold tabular-nums ${row.rate > 60 ? 'text-red-600' : row.rate > 40 ? 'text-amber-600' : 'text-[var(--text-muted)]'}`}>{row.rate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button 
                        onClick={() => setTimelineLesson(row)}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1 justify-end ml-auto"
                      >
                        <BarChart2 className="w-3.5 h-3.5" /> Timeline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {timelineLesson && (
          <LessonTimelineModal 
            lessonId={timelineLesson.id} 
            lessonName={timelineLesson.lesson} 
            onClose={() => setTimelineLesson(null)} 
          />
        )}

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-teal-600" /> AI Hint Effectiveness
            </h2>
            <p className="text-xs text-[var(--text-faint)] mt-0.5">Last 30 days · All lessons</p>
          </div>
          <div className="px-5 py-4 space-y-3.5">
            {[
              { label: 'Hints Delivered', value: summary?.interventions || 0, pct: 100, color: 'bg-[var(--border)]' },
              { label: 'Led to Understood', value: Math.round((summary?.interventions || 0) * ((summary?.resolution_rate_pct || 0) / 100)), pct: summary?.resolution_rate_pct || 0, color: 'bg-teal-500' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--text-muted)] font-medium">{s.label}</span>
                  <span className="text-xs font-bold text-[var(--text)] tabular-nums">{s.value}</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--surface)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-faint)] leading-relaxed">
                <span className="font-semibold text-emerald-700">{summary?.resolution_rate_pct || 0}%</span> of AI hints led to a confirmed understanding.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Students needing support and engagement trends" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--text-muted)]" /> Students Needing Support
            </h2>
            <button
              onClick={() => setActiveTab && setActiveTab('students')}
              className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
            >
              All students <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {stList.map(s => (
              // Was a plain, unclickable div — this list is the first
              // thing an instructor sees for "who needs help," and
              // clicking a name did nothing at all. The Students tab (with
              // the full per-student drawer — courses, progress, struggle
              // history) is the real destination; this page doesn't carry
              // per-student drawer state of its own to jump straight to
              // one student's detail.
              <button
                key={s.id}
                onClick={() => setActiveTab && setActiveTab('students')}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface)] transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-inset"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--surface)] text-[var(--text-muted)] text-xs font-bold flex items-center justify-center shrink-0">{s.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)] truncate">{s.name}</p>
                  <p className="text-xs text-[var(--text-faint)] truncate">{s.lesson} · {s.lastActive}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">{s.struggles} struggles</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[s.status]}`}>{s.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" /> Course Engagement Trend
            </h2>
            <p className="text-xs text-[var(--text-faint)] mt-0.5">Daily avg. engagement % over 12 weeks</p>
          </div>
          <div className="flex-1 px-5 pt-4 pb-3 flex flex-col justify-between">
            <div className="flex gap-2 items-end">
              <div className="flex flex-col justify-between h-12 text-right shrink-0">
                <span className="text-[10px] text-[var(--text-faint)] font-mono">100</span>
                <span className="text-[10px] text-[var(--text-faint)] font-mono">0</span>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="h-px bg-[var(--border)] w-full" />
                  <div className="h-px bg-[var(--border)] w-full" />
                </div>
                <Sparkline values={engagementTrend.length ? engagementTrend : Array(12).fill(0)} minVal={0} maxVal={100} />
              </div>
            </div>
            <div className="flex justify-between mt-1 pl-8">
              {/* Was a hardcoded ['W1','W3','W5','W7','W9','W11'] — with 6
                  labels spread edge-to-edge (justify-between) across a
                  12-point chart, the *last* label naturally lands at the
                  12th/rightmost column (the current week — where the real
                  data actually is), but it was still labeled "W11", off by
                  one from where it visually sits, and the true 12th week
                  had no label of its own at all. "Now" for the current
                  week removes the ambiguity entirely instead of requiring
                  the reader to count columns against an index. */}
              {['11w ago','9w ago','7w ago','5w ago','3w ago','Now'].map(w => (
                <span key={w} className="text-[9px] text-[var(--text-faint)] font-mono">{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[var(--border)]">
              {[
                ['Peak', engagementStats.peak, 'text-teal-700'],
                ['Current', engagementStats.current, 'text-[var(--text)]'],
                ['Avg', engagementStats.avg, 'text-[var(--text-muted)]']
              ].map(([l, v, c]) => (
                <div key={l} className="text-center">
                  <p className={`text-base font-bold tabular-nums ${c}`}>{v}</p>
                  <p className="text-[10px] text-[var(--text-faint)] font-medium mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Recent activity and quick actions" className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--text-faint)]" /> Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {summary?.recent_activity?.length > 0 ? summary.recent_activity.map((act, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--surface)] transition-colors">
                <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 text-emerald-600`} />
                <p className="flex-1 text-xs text-[var(--text)] leading-relaxed">{act.message}</p>
                <span className="text-[10px] text-[var(--text-faint)] font-medium shrink-0 tabular-nums whitespace-nowrap">{act.time}</span>
              </div>
            )) : (
              <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--surface)] transition-colors">
                <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 text-emerald-600`} />
                <p className="flex-1 text-xs text-[var(--text)] leading-relaxed">No new activity recently.</p>
                <span className="text-[10px] text-[var(--text-faint)] font-medium shrink-0 tabular-nums whitespace-nowrap">Just now</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--text-faint)]" /> Quick Actions
            </h2>
          </div>
          <div className="p-4 space-y-2 flex-1">
            {[
              // Was a purely decorative entry — no href, no tab, no
              // onClick of its own, so the generic dispatch below did
              // nothing at all when clicked. `action: 'export'` now routes
              // to a real handler (see handleExportReport below) that
              // downloads a CSV built from this page's already-loaded
              // summary/lessons/students data. Labeled "PDF" before, which
              // it never was and still isn't — a real PDF export would be
              // a separate, larger feature (server-side rendering); CSV is
              // what's actually deliverable from data already on this page.
              { icon: FileText, label: 'Export Class Report', desc: 'CSV · current data', action: 'export' },
              {
                icon: AlertTriangle, label: 'Review Struggling Students',
                // Was hardcoded to "5 students flagged" regardless of
                // reality — this lesson's actual at-risk count, from the
                // same summary the metric card above already displays.
                desc: `${summary?.at_risk_students ?? 0} student${summary?.at_risk_students === 1 ? '' : 's'} flagged`,
                tab: 'students',
              },
              { icon: BookOpen, label: 'Update Course Content', desc: 'Manage in Courses tab', tab: 'courses' },
              { icon: Brain, label: 'Tune AI Sensitivity', desc: 'Intervention threshold', href: '/settings' },
              { icon: BarChart2, label: 'View Full Analytics', desc: 'All metrics & charts', href: '/analytics' },
            ].map(({ icon: Icon, label, desc, tab, href, action }) => (
              <button
                key={label}
                // 'settings' and 'analytics' are real pages (see
                // InstructorSidebar.jsx), not tabs rendered by this
                // component (only overview/courses/students are) — routing
                // them through setActiveTab(tab) silently landed back on
                // Overview because the tab whitelist below only recognizes
                // those three. Route them with navigate() instead, same as
                // the sidebar does.
                onClick={() => {
                  if (action === 'export') return handleExportReport();
                  if (href) return navigate(href);
                  if (tab && setActiveTab) return setActiveTab(tab);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--surface)] transition-all text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--surface)] group-hover:bg-teal-50 flex items-center justify-center shrink-0 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-teal-700 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text)] truncate">{label}</p>
                  <p className="text-[10px] text-[var(--text-faint)] truncate">{desc}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-faint)] group-hover:text-[var(--text-muted)] shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Operation Modal ────────────────────────────────────────────────────────────
// ── Operation Modal ────────────────────────────────────────────────────────────
function OperationModal({ isOpen, onClose, type, student }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  if (!isOpen || !student) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    let contentVal = e.target.elements.content ? e.target.elements.content.value : null;
    let meetingLink = null;

    if (type === 'meeting') {
      const topic = e.target.elements.topic.value;
      const randomRoom = 'aquire-' + Math.random().toString(36).substring(2, 10);
      meetingLink = `/meeting/${randomRoom}`;
      contentVal = `Topic: ${topic}\nLink: ${meetingLink}`;
    }

    try {
      await api.analytics.performStudentOperation(student.id, type, contentVal);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (meetingLink) {
          navigate(meetingLink);
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      alert("Failed to perform operation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const content = {
    message: { title: `Message ${student.name}`, btn: 'Send Message', icon: Mail, fields: <textarea name="content" required className="w-full h-32 p-3 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm" placeholder="Type your message here..." /> },
    hint: { title: `Assign Hint to ${student.name}`, btn: 'Send Hint', icon: Lightbulb, fields: <textarea name="content" required className="w-full h-32 p-3 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm" placeholder="Type a custom manual hint..." /> },
    meeting: { title: `Request Meeting with ${student.name}`, btn: 'Send Invite', icon: Activity, fields: <input type="text" name="topic" required className="w-full p-3 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="Meeting topic (e.g., Progress Review)" /> },
    remove: { title: `Remove ${student.name}?`, btn: 'Confirm Remove', btnClass: 'bg-red-600 hover:bg-red-700', icon: Trash2, fields: <p className="text-sm text-[var(--text-muted)]">Are you sure you want to remove this student from the course? This action cannot be undone.</p> }
  }[type];

  if (!content) return null;
  const Icon = content.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-page-enter" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--card-bg)] rounded-xl shadow-2xl p-6 animate-drawer-enter mx-4">
        {success ? (
          <div className="py-8 flex flex-col items-center text-center animate-in zoom-in duration-300">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text)]">Success!</h3>
            <p className="text-sm text-[var(--text-muted)]">Operation completed successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-[var(--text)]">
                <Icon className="w-5 h-5" />
                <h3 className="font-bold">{content.title}</h3>
              </div>
              <button type="button" onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text)]"><X className="w-5 h-5"/></button>
            </div>
            <div className="mb-6">
              {content.fields}
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface)] rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 ${content.btnClass || 'bg-teal-600 hover:bg-teal-700'}`}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {content.btn}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Student Drawer ────────────────────────────────────────────────────────────
// Short label per event_type — same source as InterventionOverlay.jsx's
// getStruggleReasonText (a full sentence fragment meant for student-facing
// copy), just condensed for a dense list row here.
const EVENT_TYPE_LABELS = {
  gaze_fixation_spike: 'Sustained fixation',
  gaze_off_screen: 'Looking away',
  rewatch_spike: 'Repeated rewinds',
  pause_frequent: 'Repeated pauses',
  idle_without_progress: 'Idle / no progress',
  low_quiz_score: 'Low quiz score',
  repeated_failed_attempts: 'Repeated failed attempts',
  dsa_stuck: 'Stuck on problem',
  question_confusion: 'Question confusion',
  general_confusion: 'General confusion',
};

function StudentDrawer({ student, onClose, onOperation }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Previously this drawer only ever showed the same three numbers already
  // visible in the table row it was opened from (struggle count, resolved
  // count, risk badge) — no course progress, no struggle history, nothing
  // about *what* actually happened. Fetches the real detail endpoint every
  // time a different student is opened.
  useEffect(() => {
    if (!student) { setDetail(null); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    api.instructor.getStudentDetail(student.id)
      .then(d => { if (!cancelled) setDetail(d); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load student details.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [student]);

  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-page-enter" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-[var(--card-bg)] shadow-2xl flex flex-col overflow-y-auto animate-drawer-enter">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] sticky top-0 bg-[var(--card-bg)] z-10">
          <h2 className="text-base font-semibold text-[var(--text)]">Student Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-faint)] hover:bg-[var(--surface)] hover:text-[var(--text)]">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="px-6 py-6 space-y-6 flex-1">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-100 border-2 border-teal-200 flex items-center justify-center text-xl font-bold text-teal-800 shrink-0">
              {student.name?.[0] || 'S'}
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--text)]">{student.name}</p>
              {(detail?.email || student.email) && (
                <p className="text-xs text-[var(--text-faint)] mt-0.5">{detail?.email || student.email}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  student.risk === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                  student.risk === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>{student.risk} Risk</span>
              </div>
            </div>
          </div>
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5 text-[var(--text-faint)]"/><p className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wider">Struggles</p></div>
              <p className="text-sm font-semibold text-[var(--text)]">{student.struggles} total events</p>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--text-faint)]"/><p className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wider">Resolved</p></div>
              <p className="text-sm font-semibold text-[var(--text)]">{student.resolved} interventions</p>
            </div>
          </div>

          {loading && (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
          )}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">{error}</div>
          )}

          {!loading && detail && (
            <>
              {/* Course progress */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider">Course Progress</p>
                {detail.courses.length === 0 ? (
                  <p className="text-xs text-[var(--text-faint)]">Not enrolled in any of your courses.</p>
                ) : detail.courses.map(c => (
                  <div key={c.course_id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-[var(--text)]">{c.course_title}</p>
                      <p className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">{c.lessons_completed}/{c.lessons_total} lessons</p>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${c.completion_pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Struggle / hint history */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider">
                  Struggle History {detail.recent_struggles.length > 0 && `(${detail.recent_struggles.length})`}
                </p>
                {detail.recent_struggles.length === 0 ? (
                  <p className="text-xs text-[var(--text-faint)]">No struggle events yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {detail.recent_struggles.map(s => (
                      <div key={s.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-[var(--text)] truncate">{s.title}</p>
                          <span className="text-[10px] text-[var(--text-faint)] shrink-0 tabular-nums">{timeAgo(s.created_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-[10px] text-[var(--text-faint)]" title={getStruggleReasonText(s.event_type) || ''}>
                            {EVENT_TYPE_LABELS[s.event_type] || s.event_type}
                          </p>
                          {s.hint_text
                            ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Hint given</span>
                            : <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">No hint yet</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider mb-3">Operations</p>
            <button onClick={() => onOperation('message')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] transition-colors focus-visible:ring-2 focus-visible:ring-teal-400">
              <Mail className="w-4 h-4 text-[var(--text-faint)]"/> Send Direct Message
            </button>
            <button onClick={() => onOperation('hint')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] transition-colors focus-visible:ring-2 focus-visible:ring-teal-400">
              <Lightbulb className="w-4 h-4 text-[var(--text-faint)]"/> Assign Manual Hint
            </button>
            <button onClick={() => onOperation('meeting')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] transition-colors focus-visible:ring-2 focus-visible:ring-teal-400">
              <Activity className="w-4 h-4 text-[var(--text-faint)]"/> Request 1-on-1 Meeting
            </button>
            <button onClick={() => onOperation('remove')} className="w-full flex items-center gap-3 px-4 py-3 mt-4 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-red-400">
              <Trash2 className="w-4 h-4 text-red-400"/> Remove from Course
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Students Tab ──────────────────────────────────────────────────────────────
function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // { type, student }

  const handleOperation = (type, student) => {
    setActiveModal({ type, student });
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await api.instructor.getStudents();
        setStudents(data || []);
      } catch (err) {
        console.error("Failed to load students", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-xl font-bold text-[var(--text)]">Enrolled Students</h2>
        <p className="text-sm text-[var(--text-muted)]">Monitor student progress and AI interventions</p>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)]">No students enrolled yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--text-muted)]">Student Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--text-muted)]">Struggle Events</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--text-muted)]">Interventions Resolved</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--text-muted)] text-right">Risk Level</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--text-muted)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {students.map((s) => (
                  // Previously only the tiny Eye icon opened details — the
                  // rest of the row did nothing when clicked, which reads
                  // as broken on a row that's otherwise the obvious click
                  // target. Whole row now opens the drawer; the action
                  // buttons stop the click from bubbling so they still do
                  // their own thing instead of also opening it.
                  <tr
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className="hover:bg-[var(--surface)] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {s.name?.[0] || 'S'}
                        </div>
                        <div className="font-medium text-[var(--text)] text-sm">{s.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)] font-medium">
                      {s.struggles}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                      {s.resolved} <span className="text-[var(--text-faint)] text-xs font-normal">/ {s.struggles}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        s.risk === 'high' ? 'bg-red-100 text-red-700' :
                        s.risk === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {s.risk}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOperation('message', s); }}
                          className="p-1.5 text-[var(--text-faint)] hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                          title="Message Student"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedStudent(s); }}
                          className="p-1.5 text-[var(--text-faint)] hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <StudentDrawer 
        student={selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
        onOperation={(type) => handleOperation(type, selectedStudent)} 
      />
      <OperationModal 
        isOpen={!!activeModal} 
        type={activeModal?.type} 
        student={activeModal?.student} 
        onClose={() => setActiveModal(null)} 
      />
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function InstructorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const queryParams = new URLSearchParams(location.search);
  const activeTabFromUrl = queryParams.get('tab');
  const activeTab = activeTabFromUrl && ['overview', 'courses', 'students'].includes(activeTabFromUrl) ? activeTabFromUrl : 'overview';

  const setActiveTab = (tab) => {
    navigate(`/instructor?tab=${tab}`);
  };

  const user = getCurrentUser() || { full_name: 'Instructor', role: 'instructor' };
  const initials = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'I';

  const pageTitle = {
    overview:  'Class Overview',
    courses:   'Course Management',
    students:  'Students',
  }[activeTab];

  const pageSubtitle = {
    overview:  'Platform wide performance metrics',
    courses:   'Create and manage your courses, modules and lessons',
    students:  'Student activity and support',
  }[activeTab];

  return (
    <div className="page-shell">

      {/* Sidebar */}
      <InstructorSidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        activeId={activeTab}
      />



      {/* Main */}
      <div className="page-main">
        <header className="h-14 app-header flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="hidden lg:block p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
              aria-label="Toggle sidebar"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-[var(--text)]">{pageTitle}</h1>
              <p className="text-[10px] text-[var(--text-muted)] font-medium">{pageSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview'  && <OverviewTab setActiveTab={setActiveTab} />}
          {activeTab === 'courses'   && <CoursesTab />}
          {activeTab === 'students'  && <StudentsTab />}
        </main>
      </div>
    </div>
  );
}
