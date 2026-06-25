import React, { useState } from 'react';
import {
  LayoutDashboard, Users, BookOpen, BarChart2, Settings,
  Bell, ChevronRight, AlertTriangle, TrendingUp, Brain,
  Download, RefreshCw, Activity, Clock, CheckCircle2,
  Lightbulb, FileText, Zap, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

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

const NAV = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: Users, label: 'Students' },
  { icon: BookOpen, label: 'Courses' },
  { icon: BarChart2, label: 'Analytics' },
  { icon: Settings, label: 'Settings' },
];

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

export default function InstructorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('transcript');

  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-900 overflow-hidden">

      {/* Sidebar */}
      <aside className={`shrink-0 flex flex-col bg-white border-r border-stone-200 transition-all duration-300 ${sidebarOpen ? 'w-52' : 'w-16'}`}>
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-stone-100 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shrink-0">A</div>
          {sidebarOpen && <span className="font-bold text-sm tracking-tight text-stone-800">A-Quire</span>}
        </div>
        <nav className="flex-1 py-4 px-2 space-y-0.5" aria-label="Instructor navigation">
          {NAV.map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                active ? 'bg-teal-50 text-teal-800 border border-teal-100' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-teal-700' : ''}`} />
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
            <button onClick={() => setSidebarOpen(o => !o)} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors" aria-label="Toggle sidebar">
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-stone-900">Class Overview</h1>
              <p className="text-[10px] text-stone-400 font-medium">Physics 301 · Thermodynamics · Spring 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
              <Download className="w-3 h-3" /> Export
            </button>
            <button className="relative p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Metrics */}
          <section aria-label="Key metrics" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {METRICS.map(m => <MetricCard key={m.label} {...m} />)}
          </section>

          {/* Hotspots + Hint effectiveness */}
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
                      <tr key={row.lesson} className="hover:bg-stone-50 transition-colors group">
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

          {/* Students + Engagement */}
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

          {/* Activity + Quick actions */}
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
                  { icon: BookOpen, label: 'Update Course Content', desc: 'Boltzmann section' },
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
        </main>
      </div>
    </div>
  );
}
