import { Link } from "react-router-dom";
import {
  Home, BookOpen, Video, BrainCircuit, LineChart, Bell, User, Settings,
  Search, Sun, PlayCircle, Clock, CheckCircle2, ChevronRight,
  AlertCircle, Sparkles, BookX, Target, Zap, TrendingUp, ArrowRight
} from "lucide-react";

/* ─── Static demo data ─────────────────────────────────────────────────────── */
const DEMO_STATS = { enrolled_courses: 3, completed_lessons: 8, avg_completion_percent: 54, hints_received: 14, struggle_events: 18 };
const DEMO_COURSES = [
  { course_id: 1, course_title: "Intro to Data Structures", instructor: "Dr. Alan Turing", completion_percent: 42, completed_lessons: 5, total_lessons: 12 },
  { course_id: 2, course_title: "Modern World History", instructor: "Prof. S. Vance", completion_percent: 88, completed_lessons: 14, total_lessons: 16 },
];
const DEMO_STRUGGLES = [
  { id: 1, lesson_id: 4, struggle_score: 0.82, hint_text: "Consider reviewing the definition of entropy." },
  { id: 2, lesson_id: 7, struggle_score: 0.74, hint_text: null },
  { id: 3, lesson_id: 2, struggle_score: 0.61, hint_text: "Big O describes worst-case growth rate." },
];

function Sidebar({ isMobile, onNavigate }) {
  const navItems = [
    { name: "Dashboard", icon: Home, active: true, href: "/demo" },
    { name: "My Courses", icon: BookOpen, active: false, href: "/demo" },
    { name: "Progress", icon: LineChart, active: false, href: "/demo" },
    { name: "Notifications", icon: Bell, active: false, href: "/demo" },
  ];
  return (
    <div className={`flex flex-col h-screen min-h-screen sidebar-dark ${isMobile ? "p-4" : "w-64 p-6 hidden lg:flex"}`}>
      {!isMobile && (
        <a href="/" className="inline-flex items-center gap-2 mb-10 pl-2">
          <div className="w-8 h-8 rounded bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">A</div>
          <span className="font-semibold text-xl tracking-tight text-stone-800">A-Quire</span>
        </a>
      )}
      <div className="space-y-1 flex-1">
        {navItems.map(item => (
          <span key={item.name} className={`sidebar-nav-item cursor-default select-none ${item.active ? "active" : ""}`}>
            <item.icon className="w-4 h-4 shrink-0" />{item.name}
          </span>
        ))}
      </div>
      <div className="mt-auto space-y-0.5 pt-4 border-t border-[#1E2130]">
        <span className="sidebar-nav-item cursor-default select-none"><User className="w-4 h-4 shrink-0" /> Profile</span>
        <span className="sidebar-nav-item cursor-default select-none"><Settings className="w-4 h-4 shrink-0" /> Settings</span>
      </div>
    </div>
  );
}

export default function DemoDashboard() {
  return (
    <div className="page-shell font-sans text-stone-900">
      <Sidebar isMobile={false} />
      <div className="page-main">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-stone-50/90 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-stone-900">Welcome back, Demo Student</h1>
              <p className="text-xs text-stone-500 font-medium">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input readOnly type="text" placeholder="Search courses, mentors..." className="w-64 pl-9 pr-4 py-1.5 bg-white border border-stone-200 rounded-lg text-sm placeholder:text-stone-400 cursor-default" />
            </div>
            <div className="flex items-center gap-2 border-l border-stone-200 pl-3 sm:pl-5">
              <button className="p-2 text-stone-500 hover:bg-stone-200/50 rounded-full transition-colors"><Sun className="w-4 h-4" /></button>
              <button className="relative p-2 text-stone-500 hover:bg-stone-200/50 rounded-full transition-colors"><Bell className="w-4 h-4" /></button>
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center border border-stone-300 ml-1">
                <span className="text-sm font-bold text-stone-500">DS</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="page-content max-w-7xl">

            {/* Demo banner */}
            <div className="mb-6 flex flex-wrap items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
              <span>This is a <strong>read-only demo</strong>. All data below is static and for preview purposes only.</span>
              <Link to="/login" className="ml-auto inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline shrink-0">
                Sign in for real data <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-8">
              {/* Hero */}
              <section className="bg-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 border border-stone-200/80 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-600 rounded-l-2xl" />
                <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-teal-50 to-transparent opacity-50 pointer-events-none rounded-tr-2xl" />
                <div className="flex-1 relative z-10 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded">Up Next</span>
                    <span className="text-sm font-medium text-stone-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Last active 2 hours ago</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-stone-900 mb-1 leading-tight">Thermodynamics: Entropy &amp; Enthalpy</h2>
                  <p className="text-stone-600 mb-6 font-medium">Physics 301 • Prof. Davis</p>
                  <div className="max-w-md space-y-2">
                    <div className="flex justify-between text-sm font-medium text-stone-700"><span>Lesson Progress</span><span>65%</span></div>
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-600 rounded-full" style={{ width: "65%" }} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 relative z-10 shrink-0">
                  <button disabled className="px-6 py-3 bg-white border border-stone-200 text-stone-400 font-medium rounded-xl cursor-not-allowed shadow-sm flex items-center justify-center gap-2">
                    <BrainCircuit className="w-5 h-5" /> Consult AI Mentor
                  </button>
                  <button disabled className="px-6 py-3 bg-teal-700/50 text-white font-medium rounded-xl cursor-not-allowed shadow-sm flex items-center justify-center gap-2">
                    <PlayCircle className="w-5 h-5" /> Resume Lesson
                  </button>
                </div>
              </section>

              {/* Stats */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Enrolled Courses", value: DEMO_STATS.enrolled_courses, icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
                  { label: "Avg. Completion", value: `${DEMO_STATS.avg_completion_percent}%`, icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
                  { label: "Lessons Completed", value: DEMO_STATS.completed_lessons, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "AI Interventions", value: DEMO_STATS.hints_received, icon: BrainCircuit, color: "text-indigo-600", bg: "bg-indigo-50" },
                ].map((s, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} ${s.color} flex items-center justify-center shrink-0`}><s.icon className="w-5 h-5" /></div>
                    <div><p className="text-xs font-medium text-stone-500 mb-0.5">{s.label}</p><p className="text-xl font-semibold text-stone-900">{s.value}</p></div>
                  </div>
                ))}
              </section>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Courses */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-stone-900">Active Courses</h3>
                      <span className="text-sm font-medium text-stone-400 flex items-center gap-1 cursor-default">View All <ChevronRight className="w-4 h-4" /></span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {DEMO_COURSES.map((c) => (
                        <div key={c.course_id} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                          <h4 className="font-semibold text-stone-900 line-clamp-1 mb-1">{c.course_title}</h4>
                          <p className="text-sm text-stone-500 mb-1">{c.instructor}</p>
                          <p className="text-xs text-stone-400 mb-4">{c.completed_lessons} / {c.total_lessons} lessons</p>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${c.completion_percent}%` }} />
                            </div>
                            <span className="text-xs font-semibold w-8 text-right text-stone-600">{c.completion_percent}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Struggles */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-teal-700" /> Recent Interventions</h3>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden text-sm">
                      <div className="grid grid-cols-12 gap-4 p-4 border-b border-stone-100 bg-stone-50/50 font-medium text-stone-500">
                        <div className="col-span-5">Lesson</div><div className="col-span-4">Struggle Score</div><div className="col-span-3 text-right">Status</div>
                      </div>
                      {DEMO_STRUGGLES.map((e, i) => (
                        <div key={e.id} className={`grid grid-cols-12 gap-4 p-4 items-center ${i < DEMO_STRUGGLES.length - 1 ? "border-b border-stone-100" : ""}`}>
                          <div className="col-span-5 font-medium text-stone-900">Lesson #{e.lesson_id}</div>
                          <div className="col-span-4 text-stone-600">{e.struggle_score.toFixed(2)}</div>
                          <div className="col-span-3 flex justify-end">
                            {e.hint_text
                              ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> Hint Given</span>
                              : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"><BookX className="w-3 h-3" /> Pending</span>
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Right rail */}
                <div className="space-y-6">
                  <section className="bg-stone-800 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><Sparkles className="w-32 h-32 -mt-8 -mr-8" /></div>
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      <h3 className="text-lg font-semibold">Priority Revision</h3>
                    </div>
                    <p className="text-stone-300 text-sm mb-4">Concepts to revisit based on struggle events.</p>
                    <div className="space-y-3 relative z-10">
                      {[{ name: "Big O Notation", course: "Data Structures" }, { name: "Carnot Cycle", course: "Physics 301" }].map((c, i) => (
                        <div key={i} className="bg-stone-700/50 border border-stone-600 p-3 rounded-lg flex justify-between items-center">
                          <div><h4 className="font-medium text-sm">{c.name}</h4><p className="text-xs text-stone-400 mt-0.5">{c.course}</p></div>
                          <button disabled className="text-xs bg-white/30 text-white font-medium px-3 py-1.5 rounded cursor-not-allowed">Review</button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-stone-900">Progress Overview</h3>
                      <TrendingUp className="w-4 h-4 text-stone-400" />
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: "Avg. Completion", value: "54%", pct: 54, color: "bg-teal-500" },
                        { label: "Lessons Done", value: "8", pct: 40, color: "bg-emerald-500" },
                        { label: "AI Hints Used", value: "14", pct: 78, color: "bg-indigo-500" },
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1"><span className="text-stone-600">{item.label}</span><span className="font-semibold text-stone-900">{item.value}</span></div>
                          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden"><div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} /></div>
                        </div>
                      ))}
                      <Link to="/login" className="block text-center text-xs font-medium text-teal-700 hover:text-teal-800 pt-2 border-t border-stone-100 mt-2">Sign in for real analytics →</Link>
                    </div>
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
