import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, BookOpen, BarChart2, Settings,
  Bell, ChevronRight, AlertTriangle, TrendingUp, Brain,
  Download, RefreshCw, Activity, Clock, CheckCircle2,
  Lightbulb, FileText, Zap, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Edit3, Eye, EyeOff, X, Loader2, ChevronDown,
  ChevronUp, Play, Link as LinkIcon, GraduationCap, Save,
} from 'lucide-react';
import { api } from '../services/api';

// ── Static mock data (overview tab) ──────────────────────────────────────────
const METRICS = [
  { label: 'Active Students', value: '142', delta: '+12', up: true, sub: 'of 150 enrolled' },
  { label: 'Avg. Engagement', value: '74%', delta: '+3%', up: true, sub: 'vs last week' },
  { label: 'Struggle Rate', value: '28%', delta: '+5%', up: false, sub: 'needs attention' },
  { label: 'AI Interventions', value: '317', delta: '-22', up: true, sub: 'today' },
];
const HOTSPOTS = [
  { lesson: "Boltzmann's Formula", module: 'Module 2', struggles: 48, rate: 72 },
  { lesson: 'Clausius Inequality', module: 'Module 2', struggles: 31, rate: 58 },
  { lesson: 'Carnot Efficiency', module: 'Module 3', struggles: 27, rate: 41 },
  { lesson: 'Entropy of Mixing', module: 'Module 3', struggles: 19, rate: 34 },
  { lesson: 'Heat Capacity Ratio', module: 'Module 1', struggles: 14, rate: 22 },
];
const STUDENTS = [
  { name: 'Riya Sharma', avatar: 'RS', lastActive: '2h ago', lesson: "Boltzmann's Formula", struggles: 7, status: 'critical' },
  { name: 'Aarav Mehta', avatar: 'AM', lastActive: '4h ago', lesson: 'Clausius Inequality', struggles: 5, status: 'warning' },
  { name: 'Priya Nair', avatar: 'PN', lastActive: '1d ago', lesson: 'Carnot Efficiency', struggles: 4, status: 'warning' },
  { name: 'Karan Verma', avatar: 'KV', lastActive: '5h ago', lesson: 'Entropy of Mixing', struggles: 4, status: 'warning' },
  { name: 'Sneha Iyer', avatar: 'SI', lastActive: '3h ago', lesson: 'Heat Capacity Ratio', struggles: 3, status: 'mild' },
];
const HINT_STATS = [
  { label: 'Hints Delivered', value: 841, pct: 100, color: 'bg-stone-200' },
  { label: 'Led to Understood', value: 612, pct: 73, color: 'bg-teal-500' },
  { label: 'Student Responded', value: 489, pct: 58, color: 'bg-indigo-400' },
  { label: 'Needed 2nd Hint', value: 229, pct: 27, color: 'bg-amber-400' },
  { label: 'Replayed Section', value: 143, pct: 17, color: 'bg-stone-400' },
];
const ACTIVITY = [
  { icon: AlertTriangle, color: 'text-amber-500', msg: "Riya Sharma struggled 3x on Boltzmann's Formula", time: '18 min ago' },
  { icon: CheckCircle2, color: 'text-emerald-600', msg: '14 students completed Module 2 Assessment', time: '1h ago' },
  { icon: Brain, color: 'text-teal-600', msg: 'AI intervened 12 times during Clausius Inequality', time: '2h ago' },
  { icon: TrendingUp, color: 'text-indigo-500', msg: 'Engagement up 8% this week vs last week', time: '5h ago' },
  { icon: CheckCircle2, color: 'text-emerald-600', msg: 'Aarav Mehta resumed lesson after mentor session', time: '6h ago' },
];
const SPARKLINE = [42, 55, 48, 67, 59, 72, 68, 74, 71, 80, 74, 78];
const STATUS_BADGE = {
  critical: 'bg-red-50 text-red-700 border-red-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  mild: 'bg-stone-100 text-stone-600 border-stone-200',
};

// ── Small shared components ───────────────────────────────────────────────────
function Sparkline({ values }) {
  const max = Math.max(...values), min = Math.min(...values);
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
    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex flex-col gap-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-stone-900 tabular-nums">{value}</span>
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
          {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {delta}
        </span>
      </div>
      <p className="text-[10px] text-stone-400 font-medium">{sub}</p>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 id="modal-title" className="text-sm font-semibold text-stone-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors" aria-label="Close">
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
      <label htmlFor={id} className="text-xs font-semibold text-stone-700">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-stone-400">{hint}</p>}
    </div>
  );
}
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-400 bg-white outline-none focus:ring-4 focus:ring-teal-600/10 focus:border-teal-600 transition-all";
const textareaCls = inputCls + " resize-none";

// ── Course card ───────────────────────────────────────────────────────────────
function CourseCard({ course, onEdit, onTogglePublish, onDelete, onExpand, expanded }) {
  const lessonCount = course.modules?.reduce((s, m) => s + m.lessons.length, 0) ?? 0;
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
          <GraduationCap className="w-4.5 h-4.5 text-teal-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-stone-900 truncate">{course.title}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              course.is_published ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-stone-100 text-stone-500 border-stone-200'
            }`}>
              {course.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">{course.modules?.length ?? 0} modules · {lessonCount} lessons</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onTogglePublish(course)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
            title={course.is_published ? 'Unpublish' : 'Publish'}
          >
            {course.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onEdit(course)} className="p-1.5 rounded-lg text-stone-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(course)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onExpand(course.id)} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors" title="Toggle modules">
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
    <div className="border-t border-stone-100 bg-stone-50/50 px-5 py-4 space-y-3">
      {modules.length === 0 && !showAddModule && (
        <p className="text-xs text-stone-400 text-center py-2">No modules yet — add one below.</p>
      )}
      {modules.map(mod => (
        <div key={mod.id} className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <BookOpen className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="flex-1 text-xs font-semibold text-stone-800 truncate">{mod.title}</span>
            <span className="text-[10px] text-stone-400">{mod.lessons?.length ?? 0} lessons</span>
            <button
              onClick={() => handleDeleteModule(mod.id)}
              className="p-1 rounded text-stone-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setExpandedModule(prev => prev === mod.id ? null : mod.id)}
              className="p-1 rounded text-stone-300 hover:text-stone-600 transition-colors"
            >
              {expandedModule === mod.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          {expandedModule === mod.id && <LessonList module={mod} />}
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
          <button type="button" onClick={() => setShowAddModule(false)} className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowAddModule(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-stone-300 text-xs text-stone-500 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50/50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Module
        </button>
      )}
    </div>
  );
}

// ── Lesson list (inside expanded module) ──────────────────────────────────────
function LessonList({ module }) {
  const [lessons, setLessons] = useState(module.lessons || []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', video_url: '', description: '' });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const lesson = await api.instructor.createLesson(
        module.id,
        form.title.trim(),
        form.video_url.trim(),
        form.description.trim(),
        lessons.length + 1,
        0
      );
      setLessons(prev => [...prev, lesson]);
      setForm({ title: '', video_url: '', description: '' });
      setShowForm(false);
    } catch (err) {
      alert('Failed to create lesson: ' + err.message);
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="border-t border-stone-100 bg-stone-50 px-4 py-3 space-y-2">
      {lessons.length === 0 && !showForm && (
        <p className="text-[10px] text-stone-400 text-center py-1">No lessons yet.</p>
      )}
      {lessons.map((l, i) => (
        <div key={l.id} className="flex items-center gap-2 bg-white border border-stone-100 rounded-lg px-3 py-2">
          <span className="text-[10px] text-stone-400 font-mono w-4 shrink-0">{i + 1}</span>
          <Play className="w-3 h-3 text-teal-500 shrink-0" />
          <span className="flex-1 text-xs font-medium text-stone-700 truncate">{l.title}</span>
          {l.video_url && (
            <a href={l.video_url} target="_blank" rel="noopener noreferrer" className="text-stone-300 hover:text-teal-600 transition-colors">
              <LinkIcon className="w-3 h-3" />
            </a>
          )}
          <button onClick={() => handleDelete(l.id)} className="text-stone-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      {showForm ? (
        <form onSubmit={handleAdd} className="space-y-2 bg-white border border-stone-200 rounded-lg p-3">
          <input
            autoFocus
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Lesson title…"
            className={inputCls + ' text-xs py-2'}
            disabled={saving}
          />
          <input
            type="url"
            value={form.video_url}
            onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
            placeholder="YouTube / video URL (optional)"
            className={inputCls + ' text-xs py-2'}
            disabled={saving}
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Notes / description (optional)"
            rows={2}
            className={textareaCls + ' text-xs py-2'}
            disabled={saving}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 hover:bg-teal-800 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Lesson
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-stone-500 text-xs hover:bg-stone-100 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-stone-200 text-[10px] text-stone-400 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50/40 transition-all"
        >
          <Plus className="w-3 h-3" /> Add Lesson
        </button>
      )}
    </div>
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
  const [form, setForm] = useState({ title: '', description: '' });
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
      const course = await api.instructor.createCourse(form.title.trim(), form.description.trim());
      setCourses(prev => [course, ...prev]);
      setShowCreateModal(false);
      setForm({ title: '', description: '' });
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
    setForm({ title: course.title, description: course.description || '' });
    setShowEditModal(true);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-stone-900">My Courses</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {courses.length} course{courses.length !== 1 ? 's' : ''} · click a course to manage modules and lessons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCourses}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button
            id="create-course-btn"
            onClick={() => { setForm({ title: '', description: '' }); setShowCreateModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> New Course
          </button>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      )}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error}
          <button onClick={loadCourses} className="ml-3 text-xs font-semibold underline">Retry</button>
        </div>
      )}
      {!loading && !error && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-stone-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-700">No courses yet</p>
            <p className="text-xs text-stone-400 mt-1">Create your first course to get started.</p>
          </div>
          <button
            onClick={() => { setForm({ title: '', description: '' }); setShowCreateModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Course
          </button>
        </div>
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
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 rounded-xl text-stone-600 text-sm hover:bg-stone-100 transition-colors">
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
              <button type="button" onClick={() => { setShowEditModal(false); setEditCourse(null); }} className="px-4 py-2.5 rounded-xl text-stone-600 text-sm hover:bg-stone-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Overview Tab (original content) ──────────────────────────────────────────
function OverviewTab() {
  return (
    <div className="space-y-6">
      <section aria-label="Key metrics" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {METRICS.map(m => <MetricCard key={m.label} {...m} />)}
      </section>

      <section aria-label="Struggle hotspots and hint effectiveness" className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div>
              <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Lessons with Highest Struggle Rate
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">Ranked by % of students who triggered an AI intervention</p>
            </div>
            <button className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Struggle hotspots">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  {['Lesson', 'Module', 'Students', 'Struggle Rate'].map(h => (
                    <th key={h} className="text-left px-5 py-2.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {HOTSPOTS.map((row, i) => (
                  <tr key={row.lesson} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center shrink-0 ${i === 0 ? 'bg-red-50 text-red-600' : i < 3 ? 'bg-amber-50 text-amber-600' : 'bg-stone-100 text-stone-500'}`}>{i + 1}</span>
                        <span className="font-medium text-stone-800 text-xs truncate max-w-[140px]">{row.lesson}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{row.module}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-stone-700 tabular-nums">{row.struggles}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden hidden sm:block">
                          <div className={`h-full rounded-full ${row.rate > 60 ? 'bg-red-400' : row.rate > 40 ? 'bg-amber-400' : 'bg-teal-400'}`} style={{ width: `${row.rate}%` }} />
                        </div>
                        <span className={`text-xs font-bold tabular-nums ${row.rate > 60 ? 'text-red-600' : row.rate > 40 ? 'text-amber-600' : 'text-stone-600'}`}>{row.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-teal-600" /> AI Hint Effectiveness
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">Last 30 days · All lessons</p>
          </div>
          <div className="px-5 py-4 space-y-3.5">
            {HINT_STATS.map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-stone-600 font-medium">{s.label}</span>
                  <span className="text-xs font-bold text-stone-800 tabular-nums">{s.value}</span>
                </div>
                <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-stone-100">
              <p className="text-xs text-stone-400 leading-relaxed">
                <span className="font-semibold text-emerald-700">73%</span> of AI hints led to a confirmed understanding.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Students needing support and engagement trends" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-stone-500" /> Students Needing Support
            </h2>
            <button className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1">
              All students <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {STUDENTS.map(s => (
              <div key={s.name} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 text-xs font-bold flex items-center justify-center shrink-0">{s.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{s.name}</p>
                  <p className="text-xs text-stone-400 truncate">{s.lesson} · {s.lastActive}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-stone-500 tabular-nums">{s.struggles} struggles</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[s.status]}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" /> Course Engagement Trend
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">Daily avg. engagement % over 12 weeks</p>
          </div>
          <div className="flex-1 px-5 pt-4 pb-3 flex flex-col justify-between">
            <div className="flex gap-2 items-end">
              <div className="flex flex-col justify-between h-12 text-right shrink-0">
                <span className="text-[10px] text-stone-300 font-mono">100</span>
                <span className="text-[10px] text-stone-300 font-mono">0</span>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="h-px bg-stone-100 w-full" />
                  <div className="h-px bg-stone-100 w-full" />
                </div>
                <Sparkline values={SPARKLINE} />
              </div>
            </div>
            <div className="flex justify-between mt-1 pl-8">
              {['W1','W3','W5','W7','W9','W11'].map(w => (
                <span key={w} className="text-[9px] text-stone-300 font-mono">{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-stone-100">
              {[['Peak', '80%', 'text-teal-700'], ['Current', '74%', 'text-stone-800'], ['Avg', '65%', 'text-stone-500']].map(([l, v, c]) => (
                <div key={l} className="text-center">
                  <p className={`text-base font-bold tabular-nums ${c}`}>{v}</p>
                  <p className="text-[10px] text-stone-400 font-medium mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Recent activity and quick actions" className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-400" /> Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-stone-50">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors">
                <a.icon className={`w-4 h-4 mt-0.5 shrink-0 ${a.color}`} />
                <p className="flex-1 text-xs text-stone-700 leading-relaxed">{a.msg}</p>
                <span className="text-[10px] text-stone-400 font-medium shrink-0 tabular-nums whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-stone-400" /> Quick Actions
            </h2>
          </div>
          <div className="p-4 space-y-2 flex-1">
            {[
              { icon: FileText, label: 'Export Class Report', desc: 'PDF · last 30 days' },
              { icon: AlertTriangle, label: 'Review Struggling Students', desc: '5 students flagged' },
              { icon: BookOpen, label: 'Update Course Content', desc: 'Manage in Courses tab' },
              { icon: Brain, label: 'Tune AI Sensitivity', desc: 'Intervention threshold' },
              { icon: BarChart2, label: 'View Full Analytics', desc: 'All metrics & charts' },
            ].map(({ icon: Icon, label, desc }) => (
              <button
                key={label}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-all text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                <div className="w-7 h-7 rounded-lg bg-stone-100 group-hover:bg-teal-50 flex items-center justify-center shrink-0 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-stone-500 group-hover:text-teal-700 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-700 truncate">{label}</p>
                  <p className="text-[10px] text-stone-400 truncate">{desc}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'courses',  icon: BookOpen,        label: 'Courses'  },
  { id: 'students', icon: Users,           label: 'Students' },
  { id: 'analytics',icon: BarChart2,       label: 'Analytics'},
  { id: 'settings', icon: Settings,        label: 'Settings' },
];

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function InstructorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const pageTitle = {
    overview:  'Class Overview',
    courses:   'Course Management',
    students:  'Students',
    analytics: 'Analytics',
    settings:  'Settings',
  }[activeTab];

  const pageSubtitle = {
    overview:  'Physics 301 · Thermodynamics · Spring 2026',
    courses:   'Create and manage your courses, modules and lessons',
    students:  'Student activity and support',
    analytics: 'Detailed performance metrics',
    settings:  'Platform and notification settings',
  }[activeTab];

  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-900 overflow-hidden">

      {/* Sidebar */}
      <aside className={`shrink-0 flex flex-col bg-white border-r border-stone-200 transition-all duration-300 ${sidebarOpen ? 'w-52' : 'w-16'}`}>
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-stone-100 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shrink-0">A</div>
          {sidebarOpen && <span className="font-bold text-sm tracking-tight text-stone-800">A-Quire</span>}
        </div>
        <nav className="flex-1 py-4 px-2 space-y-0.5" aria-label="Instructor navigation">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                activeTab === id ? 'bg-teal-50 text-teal-800 border border-teal-100' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
              }`}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${activeTab === id ? 'text-teal-700' : ''}`} />
              {sidebarOpen && label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-stone-100 shrink-0">
          <div className={`flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-stone-50 cursor-pointer ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">AD</div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-800 truncate">Dr. Alan Davis</p>
                <p className="text-[10px] text-stone-400 truncate">Instructor</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white border-b border-stone-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              aria-label="Toggle sidebar"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-stone-900">{pageTitle}</h1>
              <p className="text-[10px] text-stone-400 font-medium">{pageSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview'  && <OverviewTab />}
          {activeTab === 'courses'   && <CoursesTab />}
          {activeTab === 'students'  && <div className="text-sm text-stone-400 text-center py-16">Students view — coming in Phase 5</div>}
          {activeTab === 'analytics' && <div className="text-sm text-stone-400 text-center py-16">Analytics — coming in Phase 5</div>}
          {activeTab === 'settings'  && <div className="text-sm text-stone-400 text-center py-16">Settings — coming in Phase 6</div>}
        </main>
      </div>
    </div>
  );
}
