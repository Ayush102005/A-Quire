import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, BookOpen, Video, BrainCircuit, LineChart, Bell, User, Settings,
  Menu, X, ChevronRight, Zap, Clock, Target, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, RotateCcw, Sparkles, ArrowUpRight, Sun, Moon,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { api, getCurrentUser } from '../services/api';
import UserAvatar from '../components/UserAvatar';
import { renderLiteMarkdown } from '../utils/renderLiteMarkdown';
import { LoadingState, EmptyState } from '../components/UXStates';

// ── Shell nav ─────────────────────────────────────────────────────────────
const NAV = [
  { name: 'Dashboard',     icon: Home,        href: '/dashboard' },
  { name: 'My Courses',    icon: BookOpen,    href: '/courses' },
  { name: 'Progress',      icon: LineChart,   href: '/progress', active: true },
  { name: 'Notifications', icon: Bell,        href: '/notifications' },
];

// ── Color palette for course progress bars ───────────────────────────────
const BAR_COLORS = [
  'bg-teal-500', 'bg-violet-400', 'bg-emerald-500', 'bg-amber-400',
  'bg-sky-400', 'bg-rose-400', 'bg-indigo-400', 'bg-orange-400',
];

// ── Mock data ─────────────────────────────────────────────────────────────
const WEEKLY_HOURS = [
  { day: 'Mon', hours: 1.5 }, { day: 'Tue', hours: 2.0 },
  { day: 'Wed', hours: 0.5 }, { day: 'Thu', hours: 3.0 },
  { day: 'Fri', hours: 2.5 }, { day: 'Sat', hours: 1.0 },
  { day: 'Sun', hours: 1.8 },
];
const QUIZ_TREND = [62, 70, 68, 75, 80, 77, 85];

const MAX_HOURS = Math.max(...WEEKLY_HOURS.map(d => d.hours));

import StudentSidebar from '../components/StudentSidebar';
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

// Custom Skeleton removed in favor of UXStates

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
  const [viewState, setViewState]   = useState('loading'); // full | loading | empty | partial
  const [courseProgressData, setCourseProgressData] = useState(null);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [thetaHistory, setThetaHistory] = useState([]);
  const [misconceptions, setMisconceptions] = useState([]);

  // Flatten every topic's session history into one chronological list of
  // real quiz attempts, then take the most recent 7 for the trend sparkline.
  // theta (IRT ability, roughly -4..4) is rescaled to a 0-100 "mastery"
  // score purely for display — the sparkline auto-scales to its own data
  // either way, this just keeps the numbers legible.
  const recentSessions = (thetaHistory || [])
    .flatMap(t => (t.history || []).map(h => ({ ...h, topic_id: t.topic_id })))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);
  const quizTrendData = recentSessions.length > 0
    ? recentSessions.map(h => Math.round(((h.theta + 4) / 8) * 100))
    : [62, 70, 68, 75, 80, 77, 85];
  const trendLabel = recentSessions.length > 0 ? 'Based on recent assessments' : 'Last 7 quizzes';

  // Recommended revision target: the topic with the lowest most-recent theta
  // (i.e. the topic the student is currently weakest in), derived from real
  // quiz session history rather than a fixed topic id.
  const weakestTopic = (thetaHistory || []).reduce((weakest, t) => {
    const latest = (t.history || [])[t.history.length - 1];
    if (!latest) return weakest;
    if (!weakest || latest.theta < weakest.theta) {
      return { topic_id: t.topic_id, topic_name: t.topic, theta: latest.theta };
    }
    return weakest;
  }, null);

  const totalHours = analyticsSummary
    ? (analyticsSummary.total_watched_seconds / 3600).toFixed(1)
    : 0;
  const avgCompletion = analyticsSummary
    ? Math.round(analyticsSummary.avg_completion_percent)
    : 0;
  const totalLessonsCompleted = analyticsSummary?.completed_lessons ?? 0;
  const totalLessonsInProgress = analyticsSummary?.total_lessons_in_progress ?? 0;
  const totalStruggleEvents = analyticsSummary?.struggle_events ?? 0;

  // Derive strong/weak topics from misconceptions (error_type present = weak)
  const weakTopics = misconceptions.slice(0, 5).map(m => ({
    name: m.topic,
    score: Math.max(20, Math.min(60, 50 - (misconceptions.filter(x => x.topic === m.topic).length * 5))),
    course: m.topic,
    feedback: m.feedback_provided,
  }));

  // Course completion data from API (fall back to empty list)
  const courseCompletionList = courseProgressData
    ? courseProgressData.map((c, i) => ({
        name: c.course_title,
        progress: Math.round(c.completion_percent),
        color: ['bg-teal-500', 'bg-violet-400', 'bg-emerald-500', 'bg-amber-400', 'bg-sky-400', 'bg-rose-400', 'bg-indigo-400', 'bg-orange-400'][i % 8],
      }))
    : [];

  const mockSum = 12.3;
  const scale = Number(totalHours) > 0 ? Number(totalHours) / mockSum : 0;
  const scaledWeeklyHours = WEEKLY_HOURS.map(d => ({
    day: d.day,
    hours: Number((d.hours * scale).toFixed(1))
  }));
  const currentMaxHours = scale === 0 ? 3 : Math.max(...scaledWeeklyHours.map(d => d.hours));


  useEffect(() => {
    async function loadAnalytics() {
      setViewState('loading');
      try {
        const [progressData, summaryData, thetaData, misconceptionsData] = await Promise.all([
          api.analytics.studentProgress(),
          api.analytics.studentSummary(),
          api.analytics.thetaHistory(),
          api.analytics.misconceptions(),
        ]);

        setCourseProgressData(progressData);
        setAnalyticsSummary(summaryData);
        setThetaHistory(thetaData || []);
        setMisconceptions(misconceptionsData || []);

        const isEmpty = summaryData.total_watched_seconds === 0 && summaryData.completed_lessons === 0;
        setViewState(isEmpty ? 'empty' : 'full');
      } catch (err) {
        console.error('Progress analytics failed:', err);
        setViewState('empty');
      }
    }

    loadAnalytics();
  }, []);

  return (
    <div className="page-shell font-sans">
      <StudentSidebar sidebarOpen={true} activeId="/progress" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="page-main">

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
            <ThemeToggle />
            <UserAvatar className="border-2 border-white shadow-sm ml-1" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Loading */}
            {viewState === 'loading' && <LoadingState message="Loading your progress..." />}

            {/* Empty */}
            {viewState === 'empty' && (
              <EmptyState 
                title="No analytics yet"
                message="Complete your first lesson to start seeing your learning patterns and progress here."
                action={<a href="/courses" className="px-5 py-2 bg-teal-700 text-white rounded-lg font-semibold shadow-sm hover:bg-teal-800 transition-colors inline-block">Start a Lesson</a>}
              />
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
                      <span className="text-teal-700 font-semibold"> {analyticsSummary ? `${analyticsSummary.completed_lessons} lessons completed` : '3 of 4 courses'}</span>
                      {analyticsSummary ? `, ${analyticsSummary.total_lessons_in_progress} in progress` : ' are on track'}.
                    </p>
                  </div>
                  {weakestTopic ? (
                    <Link to={`/adaptive-quiz?topic=${weakestTopic.topic_id}`} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors">
                      <Sparkles className="w-3.5 h-3.5" />Start recommended revision
                    </Link>
                  ) : (
                    <Link to="/courses" className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors">
                      <Sparkles className="w-3.5 h-3.5" />Start a lesson to get recommendations
                    </Link>
                  )}
                </div>

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Clock}       iconBg="bg-teal-50"   iconColor="text-teal-600"   label="Study Time This Week" value={`${totalHours}h`}  sub={analyticsSummary ? `${Math.round(analyticsSummary.total_watched_seconds / 60)} minutes watched` : 'Weekly total'} trend={12} />
                  <StatCard icon={Target}      iconBg="bg-violet-50" iconColor="text-violet-600" label="Avg Completion"        value={`${avgCompletion}%`}  sub={analyticsSummary ? 'Across all lessons' : 'Across 5 quizzes'}   trend={8}  />
                  <StatCard icon={Zap}         iconBg="bg-amber-50"  iconColor="text-amber-600"  label="AI Interventions"     value={analyticsSummary ? `${totalStruggleEvents}` : '14'}             sub="Struggle events"          trend={-3} />
                  <StatCard icon={Sparkles}    iconBg="bg-emerald-50"iconColor="text-emerald-600"label="Avg Confidence"       value={analyticsSummary ? `${analyticsSummary.avg_confidence_score}/4` : '3.2/4'}        sub="Overall assessment"       trend={15} />
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
                    <WeeklyBarChart data={scaledWeeklyHours} max={currentMaxHours} />
                  </div>

                  {/* Quiz score sparkline */}
                  <div className="premium-card rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-violet-600 inline-block" />Ability Trend (θ)</h2>
                        <p className="text-xs text-stone-400 mt-0.5">{trendLabel}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        <TrendingUp className="w-3.5 h-3.5" />Active
                      </span>
                    </div>
                    <Sparkline data={quizTrendData} />
                    <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                      {quizTrendData.map((v, i) => <span key={i}>{v}%</span>)}
                    </div>
                  </div>
                </div>

                {/* ── Course progress ── */}
                <div className="premium-card rounded-2xl p-5 sm:p-6">
                  <h2 className="text-sm font-semibold text-stone-900 mb-5 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 inline-block" />Course Completion</h2>
                  {courseCompletionList.length === 0 ? (
                    <p className="text-xs text-stone-400">No enrolled courses yet. <a href="/courses" className="text-teal-700 font-semibold hover:underline">Browse courses</a></p>
                  ) : (
                    <div className="space-y-3.5">
                      {courseCompletionList.map(({ name, progress, color }) => (
                        <div key={name} className="flex items-center gap-4">
                          <span className="text-xs font-medium text-stone-600 w-40 shrink-0 truncate">{name}</span>
                          <ScoreBar score={progress} color={color} />
                          {progress === 100 && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Strong / Weak topics ── */}
                <div className="grid md:grid-cols-2 gap-6">

                  {/* Misconceptions as weak topics */}
                  <div className="premium-card rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h2 className="text-sm font-semibold text-stone-900">Needs Attention</h2>
                    </div>
                    <div className="space-y-3">
                      {weakTopics.length > 0 ? weakTopics.map(({ name, score, course }) => (
                        <div key={name} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{name}</p>
                            <p className="text-xs text-stone-400">{course}</p>
                          </div>
                          <ScoreBar score={score} color="bg-amber-400" />
                        </div>
                      )) : (
                        <p className="text-xs text-stone-400">No problem areas detected yet — keep going!</p>
                      )}
                    </div>
                  </div>

                  {/* Misconceptions detail */}
                  <div className="premium-card rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                      <h2 className="text-sm font-semibold text-stone-900">Error Types Breakdown</h2>
                    </div>
                    <div className="space-y-3">
                      {analyticsSummary?.misconception_breakdown && Object.keys(analyticsSummary.misconception_breakdown).length > 0 ? (
                        Object.entries(analyticsSummary.misconception_breakdown).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                            <span className="font-semibold text-stone-700">{type}</span>
                            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">{count}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-stone-400">Complete some quizzes to see your error breakdown here.</p>
                      )}
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

                {/* ── Misconceptions ── */}
                <div className="premium-card rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-violet-600" />
                      <h2 className="text-sm font-semibold text-stone-900">Recent Misconceptions & AI Feedback</h2>
                    </div>
                    <p className="text-xs text-stone-400">Diagnostic Loop</p>
                  </div>
                  <div className="space-y-3">
                    {misconceptions.length > 0 ? misconceptions.map((m) => (
                      <div key={m.id} className="flex flex-col gap-2 p-3.5 rounded-xl border border-stone-100 bg-stone-50/60 hover:bg-stone-100/60 transition-colors group">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-stone-800 truncate">{m.topic}</p>
                          <UrgencyBadge level={m.error_type === 'Concept Error' ? 'high' : 'medium'} />
                          <span className="text-[10px] text-stone-400 ml-auto">{new Date(m.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-stone-500"><strong>Your reasoning:</strong> {m.student_explanation}</p>
                        <div className="mt-1 p-2 bg-violet-50 rounded-lg text-xs text-violet-800 border border-violet-100 space-y-1">
                           {renderLiteMarkdown(m.feedback_provided)}
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-stone-500">No recent misconceptions found.</p>
                    )}
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
