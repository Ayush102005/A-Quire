import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Home, BookOpen, Video, BrainCircuit, LineChart, Bell, User, Settings,
  Search, Menu, X, PlayCircle, Clock, CheckCircle2,
  ChevronRight, AlertCircle, Sparkles, BookX, Target, Zap,
  RefreshCw, TrendingUp
} from "lucide-react";
import { api, getCurrentUser } from "../services/api";
import ThemeToggle from "../components/ThemeToggle";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ─── Layout ────────────────────────────────────────────────────────────────── */
function Sidebar({ navItems, isMobile, onNavigate }) {
  return (
    <div className={`flex flex-col h-screen min-h-screen sidebar-light ${isMobile ? "p-4" : "w-64 p-6 hidden lg:flex"}`}>
      {!isMobile && (
        <a href="/" className="inline-flex items-center gap-2 mb-10 pl-2">
          <div className="w-8 h-8 rounded bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">A</div>
          <span className="font-semibold text-xl tracking-tight text-stone-800">A-Quire</span>
        </a>
      )}
      <div className="space-y-1 flex-1">
        {navItems.map((item) => (
          <Link key={item.name} to={item.href} onClick={() => isMobile && onNavigate?.()} className={`sidebar-nav-item ${item.active ? "active" : ""}`}>
            <item.icon className="w-4 h-4 shrink-0" />
            {item.name}
          </Link>
        ))}
      </div>
      <div className="mt-auto space-y-0.5 pt-4 border-t border-[#1E2130]">
        <Link to="/settings" onClick={() => isMobile && onNavigate?.()} className="sidebar-nav-item"><User className="w-4 h-4 shrink-0" /> Profile</Link>
        <Link to="/settings" onClick={() => isMobile && onNavigate?.()} className="sidebar-nav-item"><Settings className="w-4 h-4 shrink-0" /> Settings</Link>
      </div>
    </div>
  );
}

function Header({ user, onOpenMobileMenu, unreadCount = 0 }) {
  // Gracefully handle the case where full_name was stored as the email address
  const rawName = user?.full_name || "";
  const displayName = rawName.includes("@")
    ? rawName.split("@")[0]               // take local part of email
        .replace(/[._\-+]/g, " ")         // dots/underscores/hyphens → spaces
        .replace(/\b\w/g, c => c.toUpperCase()) // title-case each word
        .trim()
    : rawName;
  const firstName = displayName.split(" ")[0] || "Student";
  const initials = displayName.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";
  const today = new Date();
  return (
    <header className="app-header px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 -ml-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] rounded-lg" onClick={() => onOpenMobileMenu(true)}>
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold text-[var(--text)]">Welcome back, {firstName}</h1>
          <p className="text-xs text-[var(--text-muted)] font-medium">{today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" />
          <input type="text" placeholder="Search courses, mentors..." className="app-input w-64 pl-9 pr-4 py-1.5 text-sm" />
        </div>
        <div className="flex items-center gap-2 border-l border-[var(--border)] pl-3 sm:pl-5">
          <ThemeToggle />
          <Link to="/notifications" className="relative p-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] rounded-full transition-colors">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-500 border border-white" aria-label={`${unreadCount} unread`} />
            )}
          </Link>
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center border border-teal-200 ml-1">
            <span className="text-sm font-bold text-teal-800">{initials}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Skeleton({ h = "h-24" }) {
  return <div className={`${h} bg-stone-200 rounded-xl animate-pulse`} />;
}

/* ─── Dashboard ─────────────────────────────────────────────────────────────── */
export default function StudentDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = getCurrentUser();

  const [continueLesson, setContinueLesson] = useState(null);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState(null);
  const [struggles, setStruggles] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loadingHero, setLoadingHero] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStruggles, setLoadingStruggles] = useState(true);

  const navItems = [
    { name: "Dashboard", icon: Home, active: true, href: "/dashboard" },
    { name: "My Courses", icon: BookOpen, active: false, href: "/courses" },
    { name: "Live Lessons", icon: Video, active: false, href: "/lesson" },
    { name: "AI Mentor", icon: BrainCircuit, active: false, href: "/progress" },
    { name: "Progress", icon: LineChart, active: false, href: "/progress" },
    { name: "Notifications", icon: Bell, active: false, href: "/notifications" },
  ];

  const fetchAll = useCallback(async () => {
    // Hero — get most recent in-progress lesson
    setLoadingHero(true);
    api.progress.continueLearning(5)
      .then(items => setContinueLesson(items?.[0] ?? null))
      .catch(() => setContinueLesson(null))
      .finally(() => setLoadingHero(false));

    // Unread notifications badge
    api.notifications.list()
      .then(notifs => setUnreadCount(notifs.filter(n => !n.is_read).length))
      .catch(() => {});

    // Stats
    setLoadingStats(true);
    api.analytics.studentSummary()
      .then(s => setStats(s))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));

    // Courses with progress
    setLoadingCourses(true);
    api.analytics.studentProgress()
      .then(p => setCourses(p ?? []))
      .catch(() => setCourses([]))
      .finally(() => setLoadingCourses(false));

    // Struggles
    setLoadingStruggles(true);
    api.struggles.list()
      .then(e => setStruggles((e ?? []).slice(0, 5)))
      .catch(() => setStruggles([]))
      .finally(() => setLoadingStruggles(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* Hero */
  function renderHero() {
    if (loadingHero) return <Skeleton h="h-44" />;
    if (!continueLesson) {
      const firstCourse = courses?.[0];
      return (
        <section className="bg-[var(--card-bg)] rounded-2xl p-8 flex flex-col items-center justify-center gap-4 border border-[var(--border)] shadow-sm text-center min-h-[11rem]">
          <BookOpen className="w-10 h-10 text-stone-300" />
          <div>
            <p className="text-lg font-semibold text-stone-800">Nothing in progress yet</p>
            <p className="text-sm text-stone-500 mt-1">
              {firstCourse
                ? `You are enrolled in ${stats?.enrolled_courses ?? courses.length} course${(stats?.enrolled_courses ?? courses.length) === 1 ? "" : "s"}. Start a lesson to see your current activity here.`
                : "Enroll in a course and start a lesson to see it here."
              }
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/courses" className="px-5 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors inline-flex items-center gap-2">
              Browse Courses <ChevronRight className="w-4 h-4" />
            </Link>
            {firstCourse && (
              <Link to={`/course?id=${firstCourse.course_id}`} className="px-5 py-2 bg-[var(--card-bg)] text-teal-700 border border-teal-200 text-sm font-medium rounded-lg hover:bg-teal-50 transition-colors inline-flex items-center gap-2">
                Continue {firstCourse.course_title} <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </section>
      );
    }
    const cl = continueLesson;
    return (
      <section className="bg-[var(--card-bg)] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 border border-[var(--border)] shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-600 rounded-l-2xl" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-teal-50 to-transparent opacity-50 pointer-events-none rounded-tr-2xl" />
        <div className="flex-1 relative z-10 w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded">Up Next</span>
            {cl.updated_at && <span className="text-sm font-medium text-stone-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Last active {timeAgo(cl.updated_at)}</span>}
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-stone-900 mb-1 leading-tight">{cl.lesson_title}</h2>
          <p className="text-stone-600 mb-6 font-medium">{cl.course_title}</p>
          <div className="max-w-md space-y-2 mb-8 md:mb-0">
            <div className="flex justify-between text-sm font-medium text-stone-700">
              <span>Lesson Progress</span><span>{Math.round(cl.completion_percent ?? 0)}%</span>
            </div>
            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${cl.completion_percent ?? 0}%` }} />
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 relative z-10 shrink-0">
          <button className="px-6 py-3 bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text)] font-medium rounded-xl hover:bg-[var(--surface)] transition-colors shadow-sm flex items-center justify-center gap-2">
            <BrainCircuit className="w-5 h-5 text-teal-700" /> Consult AI Mentor
          </button>
          <Link to={cl.lesson_id ? `/lesson?id=${cl.lesson_id}` : "/courses"} className="px-6 py-3 bg-teal-700 text-white font-medium rounded-xl hover:bg-teal-800 transition-colors shadow-sm flex items-center justify-center gap-2">
            <PlayCircle className="w-5 h-5" /> Resume Lesson
          </Link>
        </div>
      </section>
    );
  }

  /* Stats */
  function renderStats() {
    const defs = [
      { label: "Enrolled Courses", key: "enrolled_courses", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
      { label: "Avg. Completion", key: "avg_completion_percent", suffix: "%", icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
      { label: "Lessons Completed", key: "completed_lessons", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
      { label: "AI Interventions", key: "hints_received", icon: BrainCircuit, color: "text-indigo-600", bg: "bg-indigo-50" },
    ];
    return (
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {defs.map((s, i) => (
          <div key={i} className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border)] shadow-sm flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.bg} ${s.color} flex items-center justify-center shrink-0`}><s.icon className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-medium text-stone-500 mb-0.5">{s.label}</p>
              {loadingStats ? <div className="h-7 w-12 bg-stone-200 rounded animate-pulse mt-1" /> : <p className="text-xl font-semibold text-stone-900">{stats?.[s.key] ?? "—"}{s.suffix ?? ""}</p>}
            </div>
          </div>
        ))}
      </section>
    );
  }

  /* Courses */
  function renderCourses() {
    if (loadingCourses) return <div className="grid sm:grid-cols-2 gap-4"><Skeleton h="h-32" /><Skeleton h="h-32" /></div>;
    if (!courses?.length) return (
      <div className="flex flex-col items-center justify-center p-10 text-center bg-[var(--card-bg)] border border-dashed border-[var(--border)] rounded-xl">
        <BookOpen className="w-8 h-8 text-stone-300 mb-3" />
        <p className="text-sm font-medium text-stone-600">No active courses yet</p>
        <Link to="/courses" className="text-sm text-teal-700 font-medium hover:underline mt-3">Browse courses →</Link>
      </div>
    );
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {courses.map((c, i) => (
          <Link
            key={c.course_id ?? i}
            to={`/course?id=${c.course_id}`}
            className="bg-[var(--card-bg)] p-5 rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow group"
          >
            <h4 className="font-semibold text-stone-900 group-hover:text-teal-800 transition-colors line-clamp-1 mb-1">
              {c.course_title}
              {c.exam_category && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200 align-text-bottom">
                  {c.exam_category}
                </span>
              )}
            </h4>
            <p className="text-xs text-stone-400 mb-4">{c.completed_lessons ?? 0} / {c.total_lessons ?? "?"} lessons completed</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${c.completion_percent ?? 0}%` }} />
              </div>
              <span className="text-xs font-semibold w-8 text-right text-stone-600">{Math.round(c.completion_percent ?? 0)}%</span>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  /* Struggles */
  function renderStruggles() {
    if (loadingStruggles) return <Skeleton h="h-24" />;
    if (!struggles?.length) return (
      <div className="flex items-center gap-3 p-4 bg-stone-50 border border-stone-100 rounded-xl text-sm text-stone-500">
        <BrainCircuit className="w-5 h-5 text-stone-300 shrink-0" />
        No AI interventions yet — they appear here when you get stuck during a lesson.
      </div>
    );
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden text-sm">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--text-muted)]">
          <div className="col-span-5">Lesson</div>
          <div className="col-span-4">Score / Detail</div>
          <div className="col-span-3 text-right">Status</div>
        </div>
        {struggles.map((e, i) => (
          <div key={e.id ?? i} className={`grid grid-cols-12 gap-4 p-4 items-center ${i < struggles.length - 1 ? "border-b border-stone-100" : ""}`}>
            <div className="col-span-5 font-medium text-stone-900 truncate">Lesson #{e.lesson_id}</div>
            <div className="col-span-4 text-stone-600 truncate">Score: {e.struggle_score?.toFixed(2) ?? "—"}</div>
            <div className="col-span-3 flex justify-end">
              {e.hint_text
                ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> Hint Given</span>
                : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"><BookX className="w-3 h-3" /> Pending</span>
              }
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="page-shell font-sans">
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-72 bg-[var(--card-bg)] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <a href="/" className="inline-flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-teal-700 text-white flex items-center justify-center font-bold text-lg">A</div>
                <span className="font-semibold text-xl tracking-tight text-[var(--text)]">A-Quire</span>
              </a>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <Sidebar navItems={navItems} isMobile={true} onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}
      <Sidebar navItems={navItems} isMobile={false} />
      <div className="page-main">
        <Header user={user} onOpenMobileMenu={setMobileMenuOpen} unreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="page-content max-w-7xl">
            <div className="mb-4 flex justify-end">
              <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
            <div className="space-y-8">
              {renderHero()}
              {renderStats()}
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* AMATTA Banner */}
                  <section className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-2xl p-6 text-white shadow-md flex items-center justify-between relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                        <Target className="w-5 h-5 text-teal-300" /> AMATTA Assessment
                      </h3>
                      <p className="text-teal-100 text-sm">Test your Kinematics knowledge with our new AI adaptive engine.</p>
                    </div>
                    <Link to="/adaptive-quiz?topic=1" className="relative z-10 px-5 py-2.5 bg-[var(--card-bg)] text-teal-800 font-bold rounded-xl shadow hover:bg-teal-50 transition-colors flex shrink-0">
                      Start Quiz
                    </Link>
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><Sparkles className="w-48 h-48 -mr-10 -mt-10" /></div>
                  </section>
                  
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-stone-900">Active Courses</h3>
                      <Link to="/courses" className="text-sm font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
                    </div>
                    {renderCourses()}
                  </section>
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-teal-700" /> Recent Interventions</h3>
                      <Link to="/progress" className="text-sm font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1">View Progress <ChevronRight className="w-4 h-4" /></Link>
                    </div>
                    {renderStruggles()}
                  </section>
                </div>
                <div className="space-y-6">
                  {/* Live Meeting Join Card */}
                  <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Video className="w-5 h-5 text-teal-700" />
                      <h3 className="font-semibold text-stone-900">Live Meeting</h3>
                    </div>
                    <p className="text-stone-500 text-sm mb-4">Enter a room ID to join a live session with your instructor.</p>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const roomId = e.target.roomId.value.trim();
                        if (roomId) window.location.href = `/meeting/${roomId}`;
                      }}
                      className="flex gap-2"
                    >
                      <input 
                        name="roomId" 
                        type="text" 
                        placeholder="Room ID..." 
                        className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        required 
                      />
                      <button type="submit" className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors">
                        Join
                      </button>
                    </form>
                  </section>

                  <section className="bg-stone-800 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><Sparkles className="w-32 h-32 -mt-8 -mr-8" /></div>
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      <h3 className="text-lg font-semibold">Priority Revision</h3>
                    </div>
                    <p className="text-stone-300 text-sm mb-4 leading-relaxed">Concepts to revisit based on your struggle events.</p>
                    {loadingStruggles ? <Skeleton h="h-20" /> : struggles?.length ? (
                      <div className="space-y-3 relative z-10">
                        {struggles.slice(0, 3).map((e, i) => (
                          <div key={i} className="bg-stone-700/50 border border-stone-600 p-3 rounded-lg flex justify-between items-center hover:bg-stone-700 transition-colors">
                            <div>
                              <h4 className="font-medium text-sm">Lesson #{e.lesson_id}</h4>
                              <p className="text-xs text-stone-400 mt-0.5">Score: {e.struggle_score?.toFixed(1) ?? "—"}</p>
                            </div>
                            <Link to={`/lesson?id=${e.lesson_id}`} className="text-xs bg-[var(--card-bg)] text-[var(--text)] font-medium px-3 py-1.5 rounded hover:bg-teal-50 transition-colors shadow-sm">Review</Link>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-stone-400 text-sm relative z-10">No struggle events recorded yet.</p>}
                  </section>
                  <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-stone-900">Progress Overview</h3>
                      <TrendingUp className="w-4 h-4 text-stone-400" />
                    </div>
                    {loadingStats || loadingCourses ? (
                      <div className="space-y-3"><Skeleton h="h-6" /><Skeleton h="h-6" /><Skeleton h="h-6" /></div>
                    ) : (
                      <div className="space-y-4">
                        {[
                          { label: "Avg. Completion", value: `${stats?.avg_completion_percent ?? 0}%`, pct: stats?.avg_completion_percent ?? 0, color: "bg-teal-500" },
                          { label: "Lessons Done", value: `${stats?.completed_lessons ?? 0}`, pct: Math.min(100, ((stats?.completed_lessons ?? 0) / Math.max(1, courses?.reduce((a, c) => a + (c.total_lessons || 0), 0) || 1)) * 100), color: "bg-emerald-500" },
                          { label: "AI Hints Used", value: `${stats?.hints_received ?? 0}`, pct: Math.min(100, ((stats?.hints_received ?? 0) / Math.max(1, stats?.struggle_events ?? 1)) * 100), color: "bg-indigo-500" },
                        ].map((item, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-sm mb-1"><span className="text-stone-600">{item.label}</span><span className="font-semibold text-stone-900">{item.value}</span></div>
                            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden"><div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} /></div>
                          </div>
                        ))}
                        <Link to="/progress" className="block text-center text-xs font-medium text-teal-700 hover:text-teal-800 pt-2 border-t border-stone-100 mt-2">Full Analytics →</Link>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
