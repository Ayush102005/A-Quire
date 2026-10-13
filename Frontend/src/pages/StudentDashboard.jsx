import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Home, BookOpen, Video, BrainCircuit, LineChart, Bell, User, Settings,
  Search, Menu, X, PlayCircle, Clock, CheckCircle2,
  ChevronRight, AlertCircle, Sparkles, BookX, Target, Zap,
  RefreshCw, TrendingUp, Code2, Send,
} from "lucide-react";
import { api, getCurrentUser, getAccessToken, connectNotifications } from "../services/api";
import ThemeToggle from "../components/ThemeToggle";
import UserAvatar from "../components/UserAvatar";
import { EmptyState } from "../components/UXStates";
import { lessonPath } from "../utils/navigation";

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
import StudentSidebar from "../components/StudentSidebar";

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
          <UserAvatar className="ml-1" />
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

  // AI Mentor Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your AI Mentor. I noticed you are currently reviewing lessons. How can I help you today?' }
  ]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setChatInput('');
    
    // Add user message to UI immediately
    const updatedHistory = [...chatMessages, { role: 'user', text: userMessage }];
    setChatMessages(updatedHistory);
    
    try {
      const response = await api.mentor.chat(userMessage, chatMessages);
      setChatMessages(prev => [...prev, { role: 'assistant', text: response.reply }]);
    } catch (err) {
      console.error("Mentor chat failed", err);
      setChatMessages(prev => [...prev, { role: 'assistant', text: "I'm sorry, I couldn't connect to the server right now. Please try again later." }]);
    }
  };

  const [continueLesson, setContinueLesson] = useState(null);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState(null);
  const [catalogCourses, setCatalogCourses] = useState([]);
  const [struggles, setStruggles] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loadingHero, setLoadingHero] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStruggles, setLoadingStruggles] = useState(true);

  const navItems = [
    { name: "Dashboard",     icon: Home,         active: true,  href: "/dashboard" },
    { name: "My Courses",    icon: BookOpen,     active: false, href: "/courses"   },
    { name: "Progress",      icon: LineChart,    active: false, href: "/progress"  },
    { name: "Notifications", icon: Bell,         active: false, href: "/notifications" },
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

    // Available courses catalog (fallback for unenrolled students)
    api.courses.list()
      .then(c => setCatalogCourses(c ?? []))
      .catch(() => setCatalogCourses([]));

    // Struggles
    setLoadingStruggles(true);
    api.struggles.list()
      .then(e => {
        const list = e ?? [];
        const unique = [];
        const seen = new Set();
        for (const item of list) {
          const key = item.title || item.lesson_id;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }
        setStruggles(unique.slice(0, 5));
      })
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
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-teal-400/20 dark:bg-teal-900/30 blur-3xl pointer-events-none rounded-full" />
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
          <button 
            onClick={() => setIsChatOpen(true)}
            className="px-6 py-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-medium rounded-xl hover:bg-[var(--surface-2)] transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <BrainCircuit className="w-5 h-5 text-teal-700" /> Consult AI Mentor
          </button>
          <Link to={cl.lesson_id ? lessonPath(cl.lesson_id, cl.course_id, cl.lesson_type) : "/courses"} className="px-6 py-3 bg-teal-700 text-white font-medium rounded-xl hover:bg-teal-800 transition-colors shadow-sm flex items-center justify-center gap-2">
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
    if (!courses?.length) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-800">Available Courses</p>
              <p className="text-xs text-stone-500">You are not enrolled in any courses yet. Choose a course to begin learning:</p>
            </div>
            <Link to="/courses" className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
              Browse All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {catalogCourses?.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {catalogCourses.slice(0, 4).map(c => (
                <div key={c.id} className="bg-[var(--card-bg)] p-5 rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-semibold text-stone-900 text-sm line-clamp-1">{c.title}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                        {c.exam_category || "General"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2 mb-4">{c.description || "Comprehensive syllabus and lesson series."}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <span className="text-[11px] text-stone-400">By {c.instructor_name || "Instructor"}</span>
                    <button
                      onClick={async () => {
                        try {
                          await api.courses.enroll(c.id);
                          fetchAll();
                        } catch (e) {
                          alert(e.message);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-medium hover:bg-teal-800 transition-colors"
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              title="No courses enrolled"
              message="You haven't enrolled in any courses yet. Browse catalog to get started."
              action={<Link to="/courses" className="px-5 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors inline-block font-medium">Browse Courses</Link>}
            />
          )}
        </div>
      );
    }
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

    // Build a flat lesson_id → title map from enrolled courses data
    const lessonTitleMap = {};
    (courses ?? []).forEach(c => {
      if (c.lessons) {
        c.lessons.forEach(l => { lessonTitleMap[l.lesson_id] = l.title; });
      }
    });

    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden text-sm">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--text-muted)]">
          <div className="col-span-5">Lesson</div>
          <div className="col-span-4">When / Score</div>
          <div className="col-span-3 text-right">Status</div>
        </div>
        {struggles.map((e, i) => {
          // e.title is resolved server-side now (list_struggle_events()) —
          // handles both lesson-keyed and problem_id-keyed (DSA) events.
          // The old lessonTitleMap/"Lesson #{id}" fallback rendered
          // literally "Lesson #null" for any DSA event, since those never
          // have a lesson_id at all (see StruggleEvent's exactly-one-target
          // constraint) — kept as a last-resort fallback for an older
          // cached response shape.
          const lessonLabel = e.title || lessonTitleMap[e.lesson_id] || `Lesson #${e.lesson_id}`;
          const score = e.struggle_score != null ? e.struggle_score.toFixed(2) : null;
          const when = e.created_at ? timeAgo(e.created_at) : null;
          return (
            <div key={e.id ?? i} className={`grid grid-cols-12 gap-4 p-4 items-center ${i < struggles.length - 1 ? "border-b border-stone-100" : ""}`}>
              <div className="col-span-5 font-medium text-stone-900 truncate">
                <Link
                  to={lessonPath(e.lesson_id, e.course_id)}
                  className="hover:text-teal-700 transition-colors"
                >
                  {lessonLabel}
                </Link>
              </div>
              <div className="col-span-4 text-stone-500 truncate flex flex-col gap-0.5">
                {when && <span>{when}</span>}
                {score && <span className="text-xs text-stone-400">Score: {score}</span>}
              </div>
              <div className="col-span-3 flex justify-end">
                {e.hint_text
                  ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> Hint Given</span>
                  : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"><BookX className="w-3 h-3" /> No Hint Yet</span>
                }
              </div>
            </div>
          );
        })}
      </div>
    );
  }


  return (
    <div className="page-shell font-sans">
      <StudentSidebar 
        sidebarOpen={true} 
        activeId="/dashboard" 
        mobileOpen={mobileMenuOpen} 
        setMobileOpen={setMobileMenuOpen} 
      />
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
                        {struggles.slice(0, 3).map((e, i) => {
                          let reviewPath = "/courses";
                          if (e.problem_id) {
                            if (e.context_type === 'dsa') {
                              reviewPath = `/dsa/${e.problem_id}`;
                            } else if (e.context_type === 'question') {
                              reviewPath = `/question/${e.problem_id}`;
                            } else {
                              reviewPath = `/question/${e.problem_id}`; // fallback
                            }
                          } else if (e.lesson_id) {
                            reviewPath = lessonPath(e.lesson_id, e.course_id, e.context_type);
                          }
                          return (
                          <div key={i} className="bg-stone-700/50 border border-stone-600 p-3 rounded-lg flex justify-between items-center hover:bg-stone-700 transition-colors">
                            <div>
                              <h4 className="font-medium text-sm">{e.title || (e.problem_id ? `Problem ${e.problem_id}` : `Lesson #${e.lesson_id}`)}</h4>
                              <p className="text-xs text-stone-400 mt-0.5">Score: {e.severity?.toFixed(1) ?? "—"}</p>
                            </div>
                            <Link to={reviewPath} className="text-xs bg-[var(--card-bg)] text-[var(--text)] font-medium px-3 py-1.5 rounded hover:bg-teal-50 transition-colors shadow-sm">Review</Link>
                          </div>
                          );
                        })}
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

      {/* AI Mentor Chat Interface */}
      {isChatOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl rounded-2xl flex flex-col z-[9999] overflow-hidden animate-in slide-in-from-bottom-8">
          <div className="flex items-center justify-between p-4 bg-teal-800 text-white">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5" />
              <h3 className="font-semibold">AI Mentor</h3>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-teal-200 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg)]">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-bl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleChatSubmit} className="p-3 bg-[var(--card-bg)] border-t border-[var(--border)] flex gap-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask your mentor..."
              className="flex-1 app-input text-sm rounded-full px-4"
            />
            <button 
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 bg-teal-700 text-white rounded-full hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
