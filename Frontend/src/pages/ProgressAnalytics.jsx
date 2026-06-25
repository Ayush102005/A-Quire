import React, { useState } from 'react';
import {
  Home, BookOpen, Video, BrainCircuit, LineChart, Bell, User, Settings,
  Menu, X, ChevronRight, Zap, Clock, Target, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, RotateCcw, Sparkles, ArrowUpRight, Sun, Moon,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// ── Shell nav ─────────────────────────────────────────────────────────────
const NAV = [
  { name: 'Dashboard',     icon: Home,        href: '/dashboard' },
  { name: 'My Courses',    icon: BookOpen,    href: '/courses' },
  { name: 'Live Lessons',  icon: Video,       href: '#' },
  { name: 'AI Mentor',     icon: BrainCircuit,href: '#' },
  { name: 'Progress',      icon: LineChart,   href: '/progress', active: true },
  { name: 'Notifications', icon: Bell,        href: '#' },
];

// ── Mock data ─────────────────────────────────────────────────────────────
const WEEKLY_HOURS = [
  { day: 'Mon', hours: 1.5 }, { day: 'Tue', hours: 2.0 },
  { day: 'Wed', hours: 0.5 }, { day: 'Thu', hours: 3.0 },
  { day: 'Fri', hours: 2.5 }, { day: 'Sat', hours: 1.0 },
  { day: 'Sun', hours: 1.8 },
];
const QUIZ_TREND = [62, 70, 68, 75, 80, 77, 85];
const COURSE_PROGRESS = [
  { name: 'DSA',              progress: 42, color: 'bg-teal-500' },
  { name: 'Operating Systems',progress: 78, color: 'bg-violet-400' },
  { name: 'DBMS',             progress: 100, color: 'bg-emerald-500' },
  { name: 'Computer Networks',progress: 61, color: 'bg-amber-400' },
  { name: 'AI & ML',          progress: 0,  color: 'bg-stone-300' },
];
const STRONG_TOPICS = [
  { name: 'Sorting Algorithms',   score: 92, course: 'DSA' },
  { name: 'Normal Forms (DBMS)',  score: 88, course: 'DBMS' },
  { name: 'Process Scheduling',   score: 85, course: 'OS' },
];
const WEAK_TOPICS = [
  { name: 'Big O Notation',       score: 41, course: 'DSA',      recoveryDays: 3 },
  { name: 'Subnetting & CIDR',    score: 48, course: 'Networks', recoveryDays: 5 },
  { name: 'Deadlock Detection',   score: 53, course: 'OS',       recoveryDays: 2 },
];
const REVISIONS = [
  { topic: 'Big O Notation',    course: 'DSA',      urgency: 'high',   reason: 'Quiz score dropped 18 pts last week' },
  { topic: 'Subnetting',        course: 'Networks', urgency: 'medium', reason: 'Mentor intervened 4× this week' },
  { topic: 'Deadlock Detection',course: 'OS',       urgency: 'low',    reason: 'Not revisited in 9 days' },
];

const MAX_HOURS = Math.max(...WEEKLY_HOURS.map(d => d.hours));

// ── Sidebar ───────────────────────────────────────────────────────────────
function Sidebar({ open, onClose }) {
  const body = (
    <div className="flex flex-col h-full sidebar-dark w-64 p-5">
      <a href="/" className="inline-flex items-center gap-2.5 mb-10 px-1">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center font-bold shadow-lg shadow-teal-900/40">A</div>
        <span className="font-semibold text-lg tracking-tight text-white">A-Quire</span>
      </a>
      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">Navigation</p>
      <nav className="space-y-0.5 flex-1">
        {NAV.map(({ name, icon: Icon, href, active }) => (
          <a key={name} href={href} className={`sidebar-nav-item ${active ? 'active' : ''}`}>
            <Icon className="w-4 h-4 shrink-0" />{name}
          </a>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-[#1E2130] space-y-0.5">
        <button className="sidebar-nav-item"><User className="w-4 h-4 shrink-0" />Profile</button>
        <button className="sidebar-nav-item"><Settings className="w-4 h-4 shrink-0" />Settings</button>
      </div>
    </div>
  );
  return (
    <>
      <div className="hidden lg:flex h-screen sticky top-0 shrink-0">{body}</div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
          <div className="fixed inset-y-0 left-0 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative">{body}
              <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, trend }) {
  return (
    <div className="premium-card rounded-2xl p-5 flex items-start gap-4 hover-lift">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-stone-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
      </div>
      {trend && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-0.5 shrink-0 ${trend > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}

// ── Bar chart (weekly hours) ──────────────────────────────────────────────
function WeeklyBarChart({ data, max }) {
  return (
    <div className="flex items-end gap-1.5 h-28 pt-2">
      {data.map(({ day, hours }) => {
        const pct = (hours / max) * 100;
        const today = day === 'Thu'; // simulate
        return (
          <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-[10px] text-stone-400 font-medium">{hours}h</span>
            <div className="w-full flex items-end" style={{ height: '68px' }}>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${today ? 'bg-teal-600' : 'bg-teal-200'}`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className={`text-[10px] font-medium ${today ? 'text-teal-700' : 'text-stone-400'}`}>{day}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sparkline (quiz trend) ────────────────────────────────────────────────
function Sparkline({ data }) {
  const min = Math.min(...data) - 5;
  const max = Math.max(...data) + 5;
  const W = 200, H = 60;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min)) * H;
    return `${x},${y}`;
  }).join(' ');
  const area = `0,${H} ` + pts + ` ${W},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((v - min) / (max - min)) * H;
        return i === data.length - 1
          ? <circle key={i} cx={x} cy={y} r="3.5" fill="#0D9488" />
          : null;
      })}
    </svg>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ score, color }) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-stone-600 w-8 text-right">{score}%</span>
    </div>
  );
}

// ── Urgency badge ─────────────────────────────────────────────────────────
function UrgencyBadge({ level }) {
  const map = {
    high:   'bg-red-50 text-red-600 border-red-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    low:    'bg-stone-100 text-stone-500 border-stone-200',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${map[level]}`}>
      {level}
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center col-span-full">
      <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
        <LineChart className="w-7 h-7 text-stone-400" />
      </div>
      <h3 className="text-base font-semibold text-stone-800 mb-1.5">No analytics yet</h3>
      <p className="text-sm text-stone-500 max-w-xs leading-relaxed mb-6">
        Complete your first lesson to start seeing your learning patterns and progress here.
      </p>
      <a href="/courses" className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-xl transition-all shadow-sm">
        Start a Lesson
      </a>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────
function Skel({ h = 'h-4', w = 'w-full' }) {
  return <div className={`${h} ${w} animate-shimmer rounded`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => (
          <div key={i} className="premium-card rounded-2xl p-5 space-y-3">
            <div className="flex gap-3"><Skel h="h-11" w="w-11" /><div className="flex-1 space-y-2"><Skel h="h-3" w="w-2/3" /><Skel h="h-6" w="w-1/2" /></div></div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {[0,1].map(i => (
          <div key={i} className="premium-card rounded-2xl p-5 space-y-4">
            <Skel h="h-5" w="w-1/3" /><div className="h-28 animate-shimmer rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} className="theme-toggle" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export default function ProgressAnalytics() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [viewState, setViewState]   = useState('full'); // full | loading | empty | partial

  const totalHours = WEEKLY_HOURS.reduce((s, d) => s + d.hours, 0).toFixed(1);
  const avgQuiz    = Math.round(QUIZ_TREND.reduce((s, v) => s + v, 0) / QUIZ_TREND.length);

  return (
    <div className="min-h-screen app-bg font-sans flex">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="sticky top-0 z-40 app-header px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 rounded-lg" style={{ color: 'var(--text-muted)' }} onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></button>
            <div className="hidden sm:block">
              <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>Progress Analytics</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fall 2026 · Week 4</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {['full','loading','empty','partial'].map(s => (
              <button key={s} onClick={() => setViewState(s)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize border transition-colors ${viewState === s ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>
                {s}
              </button>
            ))}
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center border-2 border-white shadow-sm ml-1">
              <span className="text-xs font-bold text-white">AS</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Loading */}
            {viewState === 'loading' && <LoadingSkeleton />}

            {/* Empty */}
            {viewState === 'empty' && (
              <div className="bg-white border border-stone-200 rounded-2xl p-8">
                <EmptyState />
              </div>
            )}

            {/* Full & Partial */}
            {(viewState === 'full' || viewState === 'partial') && (
              <>

                {/* ── Page title + summary ── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Your Progress</h1>
                    <p className="text-sm text-stone-500 mt-0.5">
                      Good momentum this week —
                      <span className="text-teal-700 font-semibold"> 3 of 4 courses</span> are on track.
                    </p>
                  </div>
                  <a href="/quiz" className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors">
                    <Sparkles className="w-3.5 h-3.5" />Start recommended revision
                  </a>
                </div>

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Clock}       iconBg="bg-teal-50"   iconColor="text-teal-600"   label="Study Time This Week" value={`${totalHours}h`}  sub="↑ 2.5h vs last week" trend={12} />
                  <StatCard icon={Target}      iconBg="bg-violet-50" iconColor="text-violet-600" label="Avg Quiz Score"        value={`${avgQuiz}%`}  sub="Across 5 quizzes"   trend={8}  />
                  <StatCard icon={Zap}         iconBg="bg-amber-50"  iconColor="text-amber-600"  label="AI Interventions"     value="14"             sub="This week"          trend={-3} />
                  <StatCard icon={RotateCcw}   iconBg="bg-emerald-50"iconColor="text-emerald-600"label="Avg Recovery Time"    value="4.2 min"        sub="After a hint"       trend={15} />
                </div>

                {/* ── Charts row ── */}
                <div className="grid lg:grid-cols-2 gap-6">

                  {/* Weekly study bar chart */}
                  <div className="premium-card rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-teal-400 to-teal-600 inline-block" />Weekly Study Time</h2>
                        <p className="text-xs text-stone-400 mt-0.5">Hours per day this week</p>
                      </div>
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full">{totalHours}h total</span>
                    </div>
                    <WeeklyBarChart data={WEEKLY_HOURS} max={MAX_HOURS} />
                  </div>

                  {/* Quiz score sparkline */}
                  <div className="premium-card rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-violet-600 inline-block" />Quiz Score Trend</h2>
                        <p className="text-xs text-stone-400 mt-0.5">Last 7 quizzes</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        <TrendingUp className="w-3.5 h-3.5" />+23 pts
                      </span>
                    </div>
                    <Sparkline data={QUIZ_TREND} />
                    <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                      {QUIZ_TREND.map((v, i) => <span key={i}>{v}%</span>)}
                    </div>
                  </div>
                </div>

                {/* ── Course progress ── */}
                <div className="premium-card rounded-2xl p-5 sm:p-6">
                  <h2 className="text-sm font-semibold text-stone-900 mb-5 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 inline-block" />Course Completion</h2>
                  <div className="space-y-3.5">
                    {COURSE_PROGRESS.map(({ name, progress, color }) => (
                      <div key={name} className="flex items-center gap-4">
                        <span className="text-xs font-medium text-stone-600 w-40 shrink-0 truncate">{name}</span>
                        <ScoreBar score={progress} color={color} />
                        {progress === 100 && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Strong / Weak topics ── */}
                <div className="grid md:grid-cols-2 gap-6">

                  {/* Strong topics */}
                  <div className="premium-card rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <h2 className="text-sm font-semibold text-stone-900">Strong Topics</h2>
                    </div>
                    <div className="space-y-3">
                      {STRONG_TOPICS.map(({ name, score, course }) => (
                        <div key={name} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{name}</p>
                            <p className="text-xs text-stone-400">{course}</p>
                          </div>
                          <ScoreBar score={score} color="bg-emerald-400" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weak topics */}
                  <div className="premium-card rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h2 className="text-sm font-semibold text-stone-900">Needs Attention</h2>
                    </div>
                    <div className="space-y-3">
                      {WEAK_TOPICS.map(({ name, score, course, recoveryDays }) => (
                        <div key={name} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{name}</p>
                            <p className="text-xs text-stone-400">{course} · recovered in {recoveryDays}d avg</p>
                          </div>
                          <ScoreBar score={score} color="bg-amber-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Partial data notice ── */}
                {viewState === 'partial' && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Some data is still loading</p>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">Quiz trends and intervention data will appear after you complete 3 or more sessions.</p>
                    </div>
                  </div>
                )}

                {/* ── Revision priorities ── */}
                <div className="premium-card rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <h2 className="text-sm font-semibold text-stone-900">Suggested Revision Priorities</h2>
                    </div>
                    <p className="text-xs text-stone-400">AI-recommended</p>
                  </div>
                  <div className="space-y-3">
                    {REVISIONS.map(({ topic, course, urgency, reason }) => (
                      <div key={topic} className="flex items-center gap-4 p-3.5 rounded-xl border border-stone-100 bg-stone-50/60 hover:bg-stone-100/60 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-stone-800 truncate">{topic}</p>
                            <UrgencyBadge level={urgency} />
                          </div>
                          <p className="text-xs text-stone-400">{course} · {reason}</p>
                        </div>
                        <a href="/quiz"
                          className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                          Review <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
