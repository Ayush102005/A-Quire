// Struggle Analytics page for A-Quire — Instructor view
import { useState } from 'react';
import {
  Home, BookOpen, Video, BrainCircuit, Bell, Users,
  Settings, Menu, X, ChevronRight, AlertTriangle,
  Lightbulb, Clock, BarChart2, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// ── Data ──────────────────────────────────────────────────────────────────
const LESSONS = [
  { id: 1, name: 'Binary Trees: Traversal', struggles: 38, interventions: 22, resolved: 18, avgTime: 4.2 },
  { id: 2, name: 'Process Scheduling',      struggles: 31, interventions: 17, resolved: 14, avgTime: 5.1 },
  { id: 3, name: 'TCP/IP Stack',            struggles: 27, interventions: 15, resolved: 13, avgTime: 3.8 },
  { id: 4, name: 'Big O Notation',          struggles: 24, interventions: 19, resolved: 12, avgTime: 6.3 },
  { id: 5, name: 'Normal Forms (DBMS)',     struggles: 18, interventions: 11, resolved: 10, avgTime: 3.2 },
];

const CONCEPTS = [
  { name: 'In-order Traversal',    lesson: 'Binary Trees',         count: 14, outcome: 'resolved',  pct: 82 },
  { name: 'Deadlock Detection',    lesson: 'Process Scheduling',   count: 12, outcome: 'partial',   pct: 58 },
  { name: 'Subnetting / CIDR',     lesson: 'TCP/IP Stack',         count: 11, outcome: 'partial',   pct: 63 },
  { name: 'Big O Logarithmic',     lesson: 'Big O Notation',       count: 10, outcome: 'unresolved',pct: 41 },
  { name: 'Recursive Tree Copy',   lesson: 'Binary Trees',         count: 9,  outcome: 'resolved',  pct: 77 },
  { name: '3NF Decomposition',     lesson: 'Normal Forms',         count: 7,  outcome: 'resolved',  pct: 86 },
];

const HEATMAP_ROWS = [
  { lesson: 'Binary Trees', slots: [0,1,3,5,8,6,4,2,1,0,3,2] },
  { lesson: 'Process Sched.', slots: [0,0,2,4,7,9,5,3,1,0,1,0] },
  { lesson: 'TCP/IP Stack', slots: [1,0,1,2,3,5,4,6,3,1,0,0] },
  { lesson: 'Big O Notation', slots: [0,2,3,6,5,4,3,2,1,2,1,0] },
];

const STUDENTS = [
  { name: 'Riya Sharma',  struggles: 12, resolved: 10, risk: 'low' },
  { name: 'Arjun Mehta',  struggles: 18, resolved: 9,  risk: 'high' },
  { name: 'Priya Nair',   struggles: 8,  resolved: 7,  risk: 'low' },
  { name: 'Dev Kapoor',   struggles: 22, resolved: 11, risk: 'high' },
  { name: 'Sneha Rao',    struggles: 14, resolved: 12, risk: 'medium' },
];

const ACTIONS = [
  { priority: 'high',   lesson: 'Big O Notation',       action: 'Add worked examples for logarithmic complexity before the next session — 41% resolution rate is below threshold.' },
  { priority: 'high',   lesson: 'Process Scheduling',   action: 'Deadlock Detection needs a dedicated review segment. 12 students struggled and only 58% resolved.' },
  { priority: 'medium', lesson: 'TCP/IP Stack',         action: 'Consider adding a visual subnetting worksheet. Students who used diagrams resolved faster.' },
];

const NAV = [
  { name: 'Dashboard',    icon: Home,         href: '/instructor' },
  { name: 'My Courses',   icon: BookOpen,     href: '#' },
  { name: 'Live Lessons', icon: Video,        href: '#' },
  { name: 'Students',     icon: Users,        href: '#' },
  { name: 'Analytics',    icon: BarChart2,    href: '/struggle-analytics', active: true },
  { name: 'Notifications',icon: Bell,         href: '#' },
];

// ── Helpers ───────────────────────────────────────────────────────────────
const HEAT_COLOR = v =>
  v === 0 ? 'bg-stone-100' :
  v <= 2  ? 'bg-teal-100'  :
  v <= 5  ? 'bg-amber-200' :
  v <= 7  ? 'bg-amber-400' : 'bg-red-400';

const OUTCOME_STYLE = o =>
  o === 'resolved'   ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
  o === 'partial'    ? 'bg-amber-50 text-amber-700 border-amber-100' :
                       'bg-red-50 text-red-600 border-red-100';

const RISK_STYLE = r =>
  r === 'high'   ? 'bg-red-50 text-red-600 border-red-100' :
  r === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                   'bg-emerald-50 text-emerald-700 border-emerald-100';

const PRIORITY_COLOR = p =>
  p === 'high' ? 'bg-red-400' : p === 'medium' ? 'bg-amber-400' : 'bg-teal-400';

function Bar({ value, max, color = 'bg-teal-500' }) {
  return (
    <div className="flex items-center gap-2.5 flex-1">
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold text-stone-600 w-6 text-right">{value}</span>
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="premium-card rounded-2xl p-5 flex items-start gap-4 hover-lift">
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-stone-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────
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

// ── Loading skeleton ───────────────────────────────────────────────────────
function LoadingView() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <div key={i} className="h-24 premium-card rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-64 premium-card rounded-2xl" />
        <div className="h-64 premium-card rounded-2xl" />
      </div>
      <div className="h-48 premium-card rounded-2xl" />
    </div>
  );
}

// ── No data ────────────────────────────────────────────────────────────────
function NoDataView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center premium-card rounded-2xl">
      <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mb-4"><BarChart2 className="w-6 h-6 text-stone-400" /></div>
      <p className="text-sm font-semibold text-stone-700 mb-1">No struggle data yet</p>
      <p className="text-xs text-stone-400 max-w-xs leading-relaxed">Analytics will appear after students complete at least one lesson session with AI monitoring enabled.</p>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} className="theme-toggle" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function StruggleAnalytics() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [viewState, setViewState]   = useState('class');  // class | lesson | student | loading | nodata
  const [focusLesson, setFocusLesson] = useState(null);
  const [focusStudent, setFocusStudent] = useState(null);

  const maxStruggles = Math.max(...LESSONS.map(l => l.struggles));

  return (
    <div className="min-h-screen app-bg font-sans flex">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-40 app-header px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-lg" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></button>
            <div className="hidden sm:block">
              <p className="text-base font-semibold text-stone-900">Struggle Analytics</p>
              <p className="text-xs text-stone-500">Data Structures &amp; Algorithms · Fall 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View state controls */}
            {['class','lesson','student','loading','nodata'].map(s => (
              <button key={s} onClick={() => setViewState(s)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize border transition-colors hidden sm:inline-flex ${viewState === s ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>
                {s}
              </button>
            ))}
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center border-2 border-white shadow-sm ml-1">
              <span className="text-xs font-bold text-white">AM</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {viewState === 'loading' && <LoadingView />}
            {viewState === 'nodata'  && <NoDataView />}

            {(viewState === 'class' || viewState === 'lesson' || viewState === 'student') && (
              <>
                {/* Breadcrumb */}
                {viewState !== 'class' && (
                  <div className="flex items-center gap-2 text-xs font-medium text-stone-400">
                    <button onClick={() => setViewState('class')} className="hover:text-teal-700 transition-colors">Class Overview</button>
                    <ChevronRight className="w-3 h-3" />
                    {viewState === 'lesson' && <span className="text-stone-700">{focusLesson?.name || 'Lesson Detail'}</span>}
                    {viewState === 'student' && <span className="text-stone-700">{focusStudent?.name || 'Student Detail'}</span>}
                  </div>
                )}

                {/* ── Summary stats ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-600" label="Total Struggle Events" value="138" sub="Across 5 lessons" />
                  <Stat icon={BrainCircuit}  iconBg="bg-teal-50"  iconColor="text-teal-600"  label="AI Interventions"      value="84"  sub="61% resolution rate" />
                  <Stat icon={Clock}         iconBg="bg-indigo-50"iconColor="text-indigo-500" label="Avg Recovery Time"    value="4.5m" sub="Per struggle event" />
                  <Stat icon={Users}         iconBg="bg-red-50"   iconColor="text-red-500"    label="At-Risk Students"     value="2"   sub="Need immediate follow-up" />
                </div>

                {/* ── Lesson struggle bars + heatmap ── */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Lessons by struggle frequency */}
                  <div className="premium-card rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-semibold text-stone-900">Lessons by Struggle Frequency</h2>
                      <span className="text-xs text-stone-400">Click to drill down</span>
                    </div>
                    <div className="space-y-3.5">
                      {LESSONS.map(l => (
                        <button key={l.id} onClick={() => { setFocusLesson(l); setViewState('lesson'); }}
                          className="w-full flex items-center gap-3 text-left group hover:bg-stone-50 -mx-2 px-2 py-1 rounded-lg transition-colors">
                          <span className="text-xs font-medium text-stone-600 w-44 truncate shrink-0 group-hover:text-teal-700 transition-colors">{l.name}</span>
                          <Bar value={l.struggles} max={maxStruggles} color={l.struggles > 30 ? 'bg-red-400' : l.struggles > 20 ? 'bg-amber-400' : 'bg-teal-400'} />
                          <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-teal-500 shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Struggle heatmap by time slot */}
                  <div className="premium-card rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-sm font-semibold text-stone-900">Struggle Heatmap</h2>
                        <p className="text-xs text-stone-400 mt-0.5">By lesson segment (5-min intervals)</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                        <div className="w-3 h-3 rounded-sm bg-stone-100" />Low
                        <div className="w-3 h-3 rounded-sm bg-amber-300 ml-1" />Med
                        <div className="w-3 h-3 rounded-sm bg-red-400 ml-1" />High
                      </div>
                    </div>
                    <div className="space-y-2">
                      {HEATMAP_ROWS.map(row => (
                        <div key={row.lesson} className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-stone-500 w-24 shrink-0 truncate">{row.lesson}</span>
                          <div className="flex gap-1 flex-1">
                            {row.slots.map((v, i) => (
                              <div key={i} title={`Slot ${i+1}: ${v} events`}
                                className={`flex-1 h-7 rounded-sm ${HEAT_COLOR(v)} transition-colors cursor-default`} />
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-24 shrink-0" />
                        <div className="flex flex-1 justify-between text-[9px] text-stone-300 px-0.5">
                          <span>0:00</span><span>10:00</span><span>20:00</span><span>30:00</span><span>60:00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Concept breakdown ── */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <h2 className="text-sm font-semibold text-stone-900 mb-4">Concept-Level Breakdown</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs font-semibold text-stone-400 border-b border-stone-100">
                          <th className="text-left pb-3 pr-4 font-semibold">Concept</th>
                          <th className="text-left pb-3 pr-4 font-semibold">Lesson</th>
                          <th className="text-center pb-3 pr-4 font-semibold">Events</th>
                          <th className="text-left pb-3 pr-4 font-semibold">Resolution</th>
                          <th className="text-center pb-3 font-semibold">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {CONCEPTS.map(c => (
                          <tr key={c.name} className="hover:bg-stone-50 transition-colors">
                            <td className="py-3 pr-4 font-medium text-stone-800">{c.name}</td>
                            <td className="py-3 pr-4 text-stone-500 text-xs">{c.lesson}</td>
                            <td className="py-3 pr-4 text-center">
                              <span className="font-semibold text-stone-700">{c.count}</span>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2 min-w-[80px]">
                                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${c.pct >= 75 ? 'bg-emerald-400' : c.pct >= 55 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${c.pct}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-stone-500 w-8">{c.pct}%</span>
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize ${OUTCOME_STYLE(c.outcome)}`}>{c.outcome}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Class vs individual ── */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-stone-900">Student Comparison</h2>
                    <span className="text-xs text-stone-400">Click a student to drill down</span>
                  </div>
                  <div className="space-y-2.5">
                    {STUDENTS.map(s => (
                      <button key={s.name} onClick={() => { setFocusStudent(s); setViewState('student'); }}
                        className="w-full flex items-center gap-4 p-3.5 rounded-xl border border-stone-100 hover:border-stone-200 hover:bg-stone-50 transition-all group text-left">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 shrink-0 group-hover:bg-teal-100 group-hover:text-teal-800 transition-colors">
                          {s.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 group-hover:text-teal-800 transition-colors">{s.name}</p>
                          <p className="text-xs text-stone-400">{s.struggles} struggles · {s.resolved} resolved</p>
                        </div>
                        <div className="flex items-center gap-2.5 min-w-[100px]">
                          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.risk === 'high' ? 'bg-red-400' : s.risk === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${(s.resolved / s.struggles) * 100}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${RISK_STYLE(s.risk)}`}>{s.risk}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-teal-500 transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Recommended actions ── */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-4 h-4 text-teal-600" />
                    <h2 className="text-sm font-semibold text-stone-900">Recommended Teaching Actions</h2>
                    <span className="text-xs text-stone-400 ml-auto">AI-generated</span>
                  </div>
                  <div className="space-y-3">
                    {ACTIONS.map((a, i) => (
                      <div key={i} className="flex items-start gap-3.5 p-4 rounded-xl border border-stone-100 bg-stone-50/40 hover:bg-stone-50 transition-colors">
                        <div className={`w-2 h-2 rounded-full ${PRIORITY_COLOR(a.priority)} mt-1.5 shrink-0`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-semibold text-stone-700">{a.lesson}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${a.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : a.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>{a.priority}</span>
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed">{a.action}</p>
                        </div>
                        <button className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 shrink-0 mt-0.5 whitespace-nowrap">
                          Act <ChevronRight className="w-3 h-3" />
                        </button>
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
