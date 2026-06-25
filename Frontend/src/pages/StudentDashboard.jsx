import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, BookOpen, BrainCircuit, LineChart, Bell, User, Settings,
  Search, Menu, X, PlayCircle, Clock, CheckCircle2,
  ChevronRight, AlertCircle, Sparkles, Calendar, BookX, Target, Zap,
  Sun, Moon
} from 'lucide-react';
import { api, getAccessToken, connectNotifications } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

/* ──────────────────────────────────────────────
   SIDEBAR (Dark premium)
   ────────────────────────────────────────────── */
function Sidebar({ navItems, isMobile }) {
  const navigate = useNavigate();
  return (
    <div className={`flex flex-col h-full sidebar-dark ${isMobile ? 'p-4' : 'w-64 p-5 hidden lg:flex'}`}>
      {!isMobile && (
        <a href="/" className="inline-flex items-center gap-2.5 mb-10 px-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center font-bold text-base shadow-lg shadow-teal-900/40">
            A
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">A-Quire</span>
        </a>
      )}

      <div className="space-y-0.5 flex-1">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2 mt-1">Navigation</p>
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => navigate(item.route)}
            className={`sidebar-nav-item ${item.active ? 'active' : ''}`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.name}
            {item.badge && (
              <span className="ml-auto text-[10px] font-bold bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto space-y-0.5 pt-4 border-t border-[#1E2130]">
        <button
          onClick={() => navigate('/settings')}
          className="sidebar-nav-item"
        >
          <User className="w-4 h-4 shrink-0" /> Profile
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="sidebar-nav-item"
        >
          <Settings className="w-4 h-4 shrink-0" /> Settings
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   HEADER
   ────────────────────────────────────────────── */
function Header({ onOpenMobileMenu, user }) {
  const { theme, toggle } = useTheme();
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AS';
  return (
    <header className="sticky top-0 z-40 app-header px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden p-2 -ml-2 text-stone-600 hover:bg-stone-200/60 rounded-lg transition-colors"
          onClick={() => onOpenMobileMenu(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            Welcome back, <span className="gradient-text">{user?.full_name || 'Student'}</span>
          </h1>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>AI learning tracking active</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-faint)' }} />
          <input
            type="text"
            placeholder="Search courses, mentors..."
            className="app-input w-60 pl-9 pr-4 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 border-l pl-3" style={{ borderColor: 'var(--border)' }}>
          {/* Theme toggle */}
          <button onClick={toggle} className="theme-toggle" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark'
              ? <Sun className="w-4 h-4 text-amber-400" />
              : <Moon className="w-4 h-4" />}
          </button>
          <a href="/notifications" className="relative p-2 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}>
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          </a>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center border-2 border-white shadow-sm ml-1">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────
   MAIN DASHBOARD
   ────────────────────────────────────────────── */
export default function StudentDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewState, setViewState] = useState('loading');
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [continueItem, setContinueItem] = useState(null);
  const [struggles, setStruggles] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const navItems = [
    { name: 'Dashboard', icon: Home, active: true, route: '/dashboard' },
    { name: 'My Courses', icon: BookOpen, active: false, route: '/courses' },
    { name: 'AI Mentor', icon: BrainCircuit, active: false, route: '/struggle-analytics' },
    { name: 'Progress', icon: LineChart, active: false, route: '/progress' },
    { name: 'Notifications', icon: Bell, active: false, route: '/notifications', badge: null },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const u = await api.getMe();
        setUser(u);

        const enrolled = await api.courses.listEnrolled();
        const enrolledWithProgress = await Promise.all(
          enrolled.map(async (c) => {
            try {
              const prog = await api.progress.getCourseProgress(c.id);
              return { ...c, progress: Math.round(prog.average_completion) };
            } catch {
              return { ...c, progress: 0 };
            }
          })
        );
        setCourses(enrolledWithProgress);

        const cont = await api.progress.continueLearning();
        const nextItem = cont.in_progress[0] || cont.not_started[0];
        setContinueItem(nextItem);

        const st = await api.struggles.list();
        setStruggles(st);

        const notifs = await api.notifications.list();
        setNotifications(notifs);

        setViewState(enrolledWithProgress.length === 0 ? 'empty' : 'full');
      } catch (err) {
        console.error('Dashboard error:', err);
        setViewState('error');
      }
    }
    loadData();

    const token = getAccessToken();
    let ws = null;
    if (token) {
      ws = connectNotifications(token, (message) => {
        if (message.type === 'notification') {
          setNotifications(prev => [message.data, ...prev]);
        }
      });
    }
    return () => { if (ws) ws.close(); };
  }, []);

  /* ── Skeleton Loading ── */
  const renderLoading = () => (
    <div className="space-y-6">
      <div className="h-52 animate-shimmer rounded-2xl w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 animate-shimmer rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-8 animate-shimmer rounded w-1/4" />
          <div className="h-32 animate-shimmer rounded-xl" />
          <div className="h-32 animate-shimmer rounded-xl" />
        </div>
        <div className="space-y-4">
          <div className="h-8 animate-shimmer rounded w-1/2" />
          <div className="h-64 animate-shimmer rounded-xl" />
        </div>
      </div>
    </div>
  );

  /* ── Error ── */
  const renderError = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center premium-card">
      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-stone-900 mb-2">Unable to load dashboard</h3>
      <p className="text-stone-500 max-w-sm mb-6 text-sm">We encountered an error fetching your data. Please check your connection.</p>
      <button onClick={() => window.location.reload()} className="btn-secondary">
        Try Again
      </button>
    </div>
  );

  /* ── Empty State ── */
  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center p-16 text-center premium-card border-dashed">
      <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-6">
        <BookOpen className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-semibold text-stone-900 mb-2">No active courses yet</h3>
      <p className="text-stone-500 max-w-md mb-8 text-sm leading-relaxed">
        You haven't enrolled in any courses for the current semester. Explore the catalog to start learning.
      </p>
      <a href="/courses" className="btn-primary">
        Browse Catalog <ChevronRight className="w-4 h-4" />
      </a>
    </div>
  );

  /* ── Full Dashboard ── */
  const renderFull = () => {
    const nextCourseTitle = continueItem ? continueItem.course_title : (courses[0]?.title || 'Physics 301');
    const nextLessonTitle = continueItem ? continueItem.lesson_title : 'Course Introduction';
    const nextLessonId = continueItem ? continueItem.lesson_id : 1;
    const progressPercent = continueItem ? Math.round(continueItem.completion_percent) : 0;

    return (
      <div className="space-y-6 animate-fade-in-up">

        {/* ── 1. Continue Learning Hero ── */}
        <section className="relative overflow-hidden rounded-2xl hero-gradient p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-teal-900/20">
          {/* Decorative orb */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex-1 relative z-10 w-full">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Up Next
              </span>
              <span className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Ready to resume
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight">
              {nextCourseTitle}
            </h2>
            <p className="text-slate-400 mb-6 font-medium text-sm">{nextLessonTitle}</p>

            <div className="max-w-sm space-y-2 mb-8 md:mb-0">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Lesson Progress</span>
                <span className="text-teal-400">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full progress-bar-fill rounded-full shadow-sm shadow-teal-500/50"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 relative z-10 shrink-0">
            <a
              href={`/lesson?id=${nextLessonId}`}
              className="px-5 py-3 bg-white/10 backdrop-blur border border-white/20 text-white font-medium rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <BrainCircuit className="w-4 h-4 text-teal-300" /> AI Mentor
            </a>
            <a
              href={`/lesson?id=${nextLessonId}`}
              className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-teal-500/30"
            >
              <PlayCircle className="w-4 h-4" /> Resume Lesson
            </a>
          </div>
        </section>

        {/* ── 2. Stats Strip ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
          {[
            { label: 'Study Streak', value: '5 Days', icon: Zap, badgeClass: 'stat-badge-amber' },
            { label: 'Hours This Week', value: '10.5h', icon: Clock, badgeClass: 'stat-badge-teal' },
            { label: 'AI Interventions', value: String(struggles.length), icon: BrainCircuit, badgeClass: 'stat-badge-indigo' },
            { label: 'Notifications', value: String(notifications.length), icon: Bell, badgeClass: 'stat-badge-emerald' },
          ].map((stat, i) => (
            <div key={i} className="premium-card rounded-xl p-4 flex items-center gap-4 animate-fade-in-up hover-lift">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.badgeClass}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className="text-xl font-bold text-stone-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Main Column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Active Courses */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-gradient-to-b from-teal-400 to-teal-600 inline-block" />
                  Active Courses
                </h3>
                <a href="/courses" className="text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors flex items-center gap-1">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <a
                    href={`/course?id=${course.id}`}
                    key={course.id}
                    className="premium-card rounded-xl p-5 group block hover-lift"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-stone-900 group-hover:text-teal-700 transition-colors text-sm line-clamp-2 leading-snug">{course.title}</h4>
                        <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Physics Department
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ml-2 ${course.progress === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-teal-50 text-teal-700 border border-teal-100'}`}>
                        {course.progress === 100 ? 'Done' : 'Active'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500 font-medium">Progress</span>
                        <span className="font-bold text-stone-700">{course.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${course.progress === 100 ? 'progress-bar-fill-emerald' : 'progress-bar-fill'}`}
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>

            {/* AI Interventions Table */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600 inline-block" />
                  Recent Interventions
                  <BrainCircuit className="w-4 h-4 text-indigo-500" />
                </h3>
              </div>
              <div className="premium-card rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-stone-50/80 border-b border-stone-100 text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                  <div className="col-span-5">Lesson Context</div>
                  <div className="col-span-4">Struggle Score</div>
                  <div className="col-span-3 text-right">Status</div>
                </div>
                {struggles.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-sm font-medium">
                    <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                    No struggle events recorded yet.
                  </div>
                ) : (
                  struggles.slice(0, 4).map((s) => (
                    <div key={s.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-stone-50 items-center hover:bg-stone-50/60 transition-colors last:border-0">
                      <div className="col-span-5 font-medium text-stone-800 text-sm truncate">Lesson {s.lesson_id}</div>
                      <div className="col-span-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                              style={{ width: `${(s.struggle_score * 100).toFixed(0)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-stone-600 w-8">{(s.struggle_score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="col-span-3 flex justify-end">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.mentor_hint ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                          {s.mentor_hint ? <CheckCircle2 className="w-3 h-3" /> : <BookX className="w-3 h-3" />}
                          {s.mentor_hint ? 'Resolved' : 'Hint Ready'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* ── Right Rail ── */}
          <div className="space-y-5">

            {/* Priority Revision */}
            <section className="rounded-2xl p-5 text-white relative overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #0F1117 0%, #0D2D2A 100%)' }}>
              <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                <Sparkles className="w-28 h-28 -mt-6 -mr-6" />
              </div>
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">Priority Revision</h3>
              </div>
              <p className="text-slate-400 text-xs mb-5 leading-relaxed relative z-10">
                Based on your learning patterns, your AI mentor suggests reviewing these concepts.
              </p>

              <div className="space-y-2.5 relative z-10">
                {struggles.slice(0, 2).map((s, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors">
                    <div>
                      <h4 className="font-semibold text-sm text-white">Lesson {s.lesson_id}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Score: {s.struggle_score.toFixed(2)}</p>
                    </div>
                    <a href={`/lesson?id=${s.lesson_id}`} className="text-xs bg-teal-500 hover:bg-teal-400 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow">
                      Review
                    </a>
                  </div>
                ))}
                {struggles.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-2">All concepts currently clear!</p>
                )}
              </div>
            </section>

            {/* Upcoming Tasks */}
            <section className="premium-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-900 text-sm">Upcoming Tasks</h3>
                <Calendar className="w-4 h-4 text-stone-400" />
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-12 pt-0.5 text-center shrink-0">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">TODAY</div>
                    <div className="text-lg font-bold gradient-text">25</div>
                  </div>
                  <div className="flex-1 bg-teal-50/60 border border-teal-100 rounded-xl p-3">
                    <h4 className="font-semibold text-sm text-stone-900 mb-0.5">Physics Midterm Quiz 2</h4>
                    <p className="text-xs text-stone-500 mb-2">Seeded Assessment</p>
                    <a href="/quiz?id=1" className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
                      Start Quiz <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* AI Insights */}
            <section className="premium-card rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <BrainCircuit className="w-20 h-20 text-teal-700" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900 mb-2 flex items-center gap-2 relative z-10">
                <BrainCircuit className="w-4 h-4 text-teal-600" /> AI Insights
              </h3>
              <p className="text-xs text-stone-500 mb-4 leading-relaxed relative z-10">
                Your mentor is tracking playback patterns for personalized interventions.
              </p>
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 p-3.5 rounded-xl relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">Active Mentoring</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Any concept struggle will automatically trigger a custom Socratic hint.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen app-bg font-sans flex">
      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-72 shadow-2xl animate-slide-in-left"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#1E2130] sidebar-dark">
              <a href="/" className="inline-flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center font-bold shadow-lg">A</div>
                <span className="font-semibold text-lg text-white">A-Quire</span>
              </a>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar navItems={navItems} isMobile={true} />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <Sidebar navItems={navItems} isMobile={false} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header onOpenMobileMenu={setMobileMenuOpen} user={user} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {viewState === 'loading' && renderLoading()}
            {viewState === 'error' && renderError()}
            {viewState === 'empty' && renderEmpty()}
            {viewState === 'full' && renderFull()}
          </div>
        </main>
      </div>
    </div>
  );
}