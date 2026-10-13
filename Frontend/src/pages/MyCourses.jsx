import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, BookOpen, BrainCircuit, LineChart, Bell, User, Settings,
  Search, Menu, X, PlayCircle, Clock, CheckCircle2, ChevronRight,
  SlidersHorizontal, GraduationCap, Target, BookX, Video, Sun, Moon, Code2,
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import UserAvatar from '../components/UserAvatar';

const TABS = ['All Enrolled', 'Completed', 'Available Catalog'];
const SORT_OPTIONS = ['Progress', 'A–Z'];
const CATEGORY_OPTIONS = ['All', 'DSA', 'JEE', 'NEET', 'GATE', 'Other'];

const NAV_ITEMS = [
  { name: 'Dashboard',     icon: Home,         href: '/dashboard' },
  { name: 'My Courses',    icon: BookOpen,     href: '/courses',  active: true },
  { name: 'Progress',      icon: LineChart,    href: '/progress'  },
  { name: 'Notifications', icon: Bell,         href: '/notifications' },
];

function statusMeta(enrolled, progress) {
  if (progress === 100) return { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  if (enrolled) return { label: 'In Progress', cls: 'bg-teal-50 text-teal-700 border-teal-100' };
  return { label: 'Not Enrolled', cls: 'bg-stone-100 text-stone-500 border-stone-200' };
}

/* ──────────────────────────────────────────────
   SIDEBAR
   ────────────────────────────────────────────── */
import StudentSidebar from '../components/StudentSidebar';

/* ──────────────────────────────────────────────
   TOPBAR
   ────────────────────────────────────────────── */
function Topbar({ onMenuClick, user }) {
  const { theme, toggle } = useTheme();
  const initials = user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AS';
  return (
    <header className="sticky top-0 z-40 app-header px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button className="lg:hidden p-2 -ml-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }} onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>Course Catalog</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enrolled courses &amp; available syllabus</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggle} className="theme-toggle" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
        <a href="/notifications" className="relative p-2 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}>
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </a>
        <UserAvatar className="border-2 border-white shadow-sm ml-1" />
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────
   COURSE CARD
   ────────────────────────────────────────────── */
function CourseCard({ course, onEnroll }) {
  const navigate = useNavigate();
  const { id, title, description, progress = 0, enrolled } = course;
  const meta = statusMeta(enrolled, progress);
  const isCompleted = progress === 100;

  return (
    <div className="premium-card rounded-2xl flex flex-col overflow-hidden group hover-lift">
      {/* Top accent bar */}
      <div className={`h-1 w-full ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : enrolled ? 'progress-bar-fill' : 'bg-stone-200'}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900 text-sm leading-snug group-hover:text-teal-700 transition-colors line-clamp-2">{title}</h3>
            <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3 shrink-0" /> {course.exam_category || 'General'}
            </p>
          </div>
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 ${meta.cls}`}>{meta.label}</span>
        </div>

        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{description || 'Course core syllabus lecture series.'}</p>

        {enrolled && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Syllabus progress</span>
              <span className={`font-bold ${isCompleted ? 'text-emerald-600' : 'text-stone-700'}`}>{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isCompleted ? 'progress-bar-fill-emerald' : 'progress-bar-fill'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center justify-between pt-3 border-t border-stone-100">
          <span className="text-[11px] text-stone-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {enrolled ? 'Enrolled' : 'Not Started'}
          </span>
          {enrolled ? (
            <button
              onClick={() => navigate(`/course?id=${id}`)}
              className="btn-primary text-xs px-3.5 py-2"
            >
              <PlayCircle className="w-3.5 h-3.5" /> View Syllabus
            </button>
          ) : (
            <button
              onClick={() => onEnroll(id)}
              className="btn-secondary text-xs px-3.5 py-2"
            >
              Enroll
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   SKELETON
   ────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="premium-card rounded-2xl overflow-hidden">
      <div className="h-1 w-full animate-shimmer" />
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="h-4 animate-shimmer rounded w-3/4" />
          <div className="h-3 animate-shimmer rounded w-1/2" />
        </div>
        <div className="h-1.5 animate-shimmer rounded-full" />
        <div className="flex justify-between pt-2 border-t border-stone-100">
          <div className="h-3 animate-shimmer rounded w-20" />
          <div className="h-7 animate-shimmer rounded-lg w-24" />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────── */
export default function MyCourses() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All Enrolled');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('Progress');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');

      // Fetch the public catalog and the user's enrollment data
      // independently — Promise.all([...]) would reject the whole thing
      // (and silently blank the entire page to "0 courses") if EITHER call
      // failed, even though the catalog fetch needs no auth and often
      // succeeds fine on its own (e.g. an expired session or a role check
      // on the enrollment endpoint shouldn't hide the catalog too).
      let all = [];
      try {
        all = await api.courses.list();
      } catch (err) {
        console.error('Failed to load course catalog:', err);
        setError(err.message || 'Failed to load the course catalog.');
        setLoading(false);
        return;
      }

      let enrolled = [];
      try {
        const u = await api.getMe();
        setUser(u);
        enrolled = await api.courses.listEnrolled();
      } catch (err) {
        console.error('Failed to load enrollment data:', err);
        setError('Could not load your enrollment status — showing the full catalog.');
        // The "All Enrolled" tab (the default) would show 0 results here
        // regardless of how many courses actually exist, since we don't
        // know which ones are enrolled — landing on it looks like an empty
        // page even though the catalog badge shows real courses. Show the
        // catalog we do have instead.
        setActiveTab('Available Catalog');
      }

      const enrolledIds = new Set(enrolled.map(c => c.id));
      const enrolledWithProgress = await Promise.all(
        enrolled.map(async (c) => {
          try {
            const prog = await api.progress.getCourseProgress(c.id);
            return { ...c, progress: Math.round(prog.completion_percent ?? 0), enrolled: true };
          } catch { return { ...c, progress: 0, enrolled: true }; }
        })
      );
      const availableCatalog = all.filter(c => !enrolledIds.has(c.id)).map(c => ({ ...c, progress: 0, enrolled: false }));
      setCourses([...enrolledWithProgress, ...availableCatalog]);
      if (enrolled.length === 0 && availableCatalog.length > 0) {
        setActiveTab('Available Catalog');
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleEnroll = async (courseId) => {
    try {
      await api.courses.enroll(courseId);
      window.location.reload();
    } catch (err) {
      alert('Failed to enroll: ' + err.message);
    }
  };

  const filtered = useMemo(() => {
    let data = [...courses];
    if (activeTab === 'All Enrolled') data = data.filter(c => c.enrolled);
    else if (activeTab === 'Completed') data = data.filter(c => c.enrolled && c.progress === 100);
    else if (activeTab === 'Available Catalog') data = data.filter(c => !c.enrolled);
    if (categoryFilter !== 'All') data = data.filter(c => c.exam_category === categoryFilter);
    if (query.trim()) data = data.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));
    if (sortBy === 'Progress') data.sort((a, b) => b.progress - a.progress);
    else data.sort((a, b) => a.title.localeCompare(b.title));
    return data;
  }, [courses, activeTab, query, sortBy, categoryFilter]);

  const counts = useMemo(() => {
    const enrolled = courses.filter(c => c.enrolled);
    return {
      'All Enrolled': enrolled.length,
      'Completed': enrolled.filter(c => c.progress === 100).length,
      'Available Catalog': courses.filter(c => !c.enrolled).length,
    };
  }, [courses]);

  return (
    <div className="page-shell font-sans text-stone-900">
      <StudentSidebar sidebarOpen={true} activeId="/courses" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="page-main">
        <Topbar onMenuClick={() => setMobileOpen(true)} user={user} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in-up">
              <div>
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Course Catalog</h1>
                <p className="text-sm text-stone-500 mt-1">
                  {counts['All Enrolled']} enrolled &nbsp;·&nbsp;
                  <span className="text-teal-700 font-semibold">{counts['Available Catalog']} available</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-medium">
                <span>{error}</span>
                <button
                  onClick={() => window.location.reload()}
                  className="shrink-0 text-xs font-semibold bg-white px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search courses or instructors…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all placeholder:text-stone-400 shadow-sm"
                />
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="appearance-none w-full sm:w-32 pl-3.5 pr-8 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all shadow-sm font-medium cursor-pointer"
                >
                  {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
                <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="appearance-none w-full sm:w-32 pl-3.5 pr-8 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all shadow-sm font-medium cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
                <Target className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-stone-100/80 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  {tab}
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-teal-100 text-teal-700' : 'bg-stone-200 text-stone-500'}`}>
                    {counts[tab]}
                  </span>
                </button>
              ))}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              activeTab === 'All Enrolled' && counts['Available Catalog'] > 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center premium-card rounded-2xl">
                  <BookOpen className="w-10 h-10 text-teal-600 mb-3" />
                  <h3 className="text-base font-semibold text-stone-900">You haven't enrolled in any courses yet</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mb-4">Explore our course catalog to find syllabus series, lectures, and practice problems.</p>
                  <button
                    onClick={() => setActiveTab('Available Catalog')}
                    className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2"
                  >
                    Browse Available Catalog ({counts['Available Catalog']}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center premium-card rounded-2xl">
                  <BookX className="w-10 h-10 text-stone-300 mb-3" />
                  <p className="text-stone-500 font-medium">No courses found matching criteria.</p>
                </div>
              )
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
                {filtered.map(course => (
                  <CourseCard key={course.id} course={course} onEnroll={handleEnroll} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
