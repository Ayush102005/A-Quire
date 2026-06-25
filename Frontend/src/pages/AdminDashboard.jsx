import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Building2, CreditCard, ShieldCheck,
  Activity, FileText, Settings, Bell, Search, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, TrendingUp, Database,
  Download, RefreshCw, Eye, Ban, Flag, Zap, Globe, Lock,
  ArrowUpRight, ArrowDownRight, Brain,
} from 'lucide-react';

const METRICS = [
  { label: 'Total Users', value: '24,891', delta: '+342', up: true, sub: 'across all roles' },
  { label: 'Active Institutions', value: '187', delta: '+8', up: true, sub: 'this month' },
  { label: 'MRR', value: '₹18.4L', delta: '+12%', up: true, sub: 'monthly recurring' },
  { label: 'API Requests / day', value: '1.2M', delta: '+5%', up: true, sub: 'avg last 7 days' },
];

const ROLES = [
  { role: 'Students', count: 21340, pct: 86, color: 'bg-teal-500' },
  { role: 'Instructors', count: 2890, pct: 12, color: 'bg-indigo-400' },
  { role: 'Institution Admins', count: 561, pct: 2, color: 'bg-amber-400' },
  { role: 'Platform Admins', count: 100, pct: 0.4, color: 'bg-stone-400' },
];

const SUBSCRIPTIONS = [
  { plan: 'Enterprise', institutions: 42, arr: '₹12.1L', status: 'healthy' },
  { plan: 'Academic Pro', institutions: 91, arr: '₹5.2L', status: 'healthy' },
  { plan: 'Starter', institutions: 54, arr: '₹1.1L', status: 'at-risk' },
  { plan: 'Trial', institutions: 18, arr: '—', status: 'trial' },
];

const MODERATION = [
  { id: '#M-1042', type: 'Inappropriate Content', course: 'Physics 301 · Entropy Notes', reporter: 'Priya Nair', time: '12 min ago', severity: 'high' },
  { id: '#M-1041', type: 'Plagiarism Flag', course: 'Math 201 · Assignment 3', reporter: 'System AI', time: '1h ago', severity: 'medium' },
  { id: '#M-1040', type: 'Abusive Language', course: 'Chem 101 · Discussion', reporter: 'Riya Sharma', time: '3h ago', severity: 'high' },
  { id: '#M-1039', type: 'Copyright Violation', course: 'Bio 401 · Lecture Upload', reporter: 'Karan Verma', time: '5h ago', severity: 'medium' },
  { id: '#M-1038', type: 'Spam Report', course: 'CS 101 · Forum', reporter: 'System AI', time: '8h ago', severity: 'low' },
];

const AUDIT = [
  { actor: 'admin@aquire.in', action: 'Suspended user account', target: 'riya.sharma@iit.ac.in', time: '9 min ago', type: 'danger' },
  { actor: 'System', action: 'Auto-renewed subscription', target: 'IIT Bombay · Enterprise', time: '22 min ago', type: 'success' },
  { actor: 'billing@aquire.in', action: 'Updated plan pricing', target: 'Academic Pro tier', time: '1h ago', type: 'warn' },
  { actor: 'System', action: 'Backup completed', target: 'DB snapshot v2026-05-17', time: '2h ago', type: 'success' },
  { actor: 'admin@aquire.in', action: 'Bulk-exported user data', target: '2,400 records · CSV', time: '4h ago', type: 'warn' },
  { actor: 'System', action: 'AI model updated', target: 'Intervention model v2.4', time: '6h ago', type: 'info' },
];

const HEALTH = [
  { label: 'API Gateway', status: 'operational', latency: '42ms', uptime: '99.98%' },
  { label: 'AI Inference', status: 'operational', latency: '310ms', uptime: '99.91%' },
  { label: 'Video CDN', status: 'degraded', latency: '890ms', uptime: '98.12%' },
  { label: 'Database', status: 'operational', latency: '8ms', uptime: '100%' },
  { label: 'Auth Service', status: 'operational', latency: '19ms', uptime: '99.99%' },
  { label: 'Storage', status: 'operational', latency: '24ms', uptime: '99.97%' },
];

const SEV = { high: 'bg-red-50 text-red-700 border-red-100', medium: 'bg-amber-50 text-amber-700 border-amber-100', low: 'bg-stone-100 text-stone-500 border-stone-200' };
const AUDIT_DOT = { danger: 'bg-red-500', success: 'bg-emerald-500', warn: 'bg-amber-400', info: 'bg-indigo-400' };
const PLAN_STATUS = { healthy: 'bg-emerald-50 text-emerald-700 border-emerald-100', 'at-risk': 'bg-amber-50 text-amber-700 border-amber-100', trial: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
const STATUS_CFG = {
  operational: { color: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Operational' },
  degraded: { color: 'text-amber-600', dot: 'bg-amber-400', label: 'Degraded' },
};

const NAV = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: Users, label: 'Users' },
  { icon: Building2, label: 'Institutions' },
  { icon: CreditCard, label: 'Billing' },
  { icon: ShieldCheck, label: 'Moderation' },
  { icon: FileText, label: 'Audit Logs' },
  { icon: Activity, label: 'System Health' },
  { icon: Settings, label: 'Settings' },
];

function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/40">
      <div>
        <h2 className="text-sm font-semibold text-stone-900 leading-none">{title}</h2>
        {sub && <p className="text-[11px] text-stone-400 mt-1 font-medium">{sub}</p>}
      </div>
      {action && (
        <button className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
          {action} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function MetricCard({ label, value, delta, up, sub }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 leading-none">{label}</p>
      <p className="text-3xl font-bold text-stone-900 tabular-nums leading-none">{value}</p>
      <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${up ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {delta}
        </span>
        <span className="text-[11px] text-stone-400 font-medium">{sub}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <div className="flex h-screen bg-[#F5F5F4] font-sans text-stone-900 overflow-hidden text-[13px]">

      {/* Sidebar */}
      <aside className={`shrink-0 bg-[#1C1917] text-stone-300 flex flex-col border-r border-stone-800 transition-all duration-200 ${collapsed ? 'w-14' : 'w-52'}`}>
        <div className="h-12 flex items-center gap-2.5 px-3.5 border-b border-stone-800 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">A</div>
          {!collapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-sm text-white">A-Quire</span>
              <span className="text-[9px] font-bold bg-teal-600/25 text-teal-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Admin</span>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5" aria-label="Admin navigation">
          {NAV.map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              title={collapsed ? label : undefined}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                active ? 'bg-teal-600/20 text-teal-300 border border-teal-600/30' : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && label}
            </button>
          ))}
        </nav>

        <div className="border-t border-stone-800 p-2 shrink-0">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <div className="w-6 h-6 rounded-full bg-stone-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">SA</div>
            {!collapsed && <span className="truncate text-stone-400">Super Admin</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="h-14 bg-white border-b border-stone-200 flex items-center gap-3 px-5 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-lg bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 focus-within:border-teal-300 focus-within:bg-white transition-colors">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users, institutions, logs…"
              className="flex-1 bg-transparent text-xs text-stone-700 placeholder-stone-400 outline-none"
              aria-label="Search platform"
            />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              PRODUCTION
            </span>
            <button className="relative p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <button className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors" aria-label="Export">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors" aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5" aria-label="Admin overview">

          {/* Metrics */}
          <section aria-label="Platform metrics" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {METRICS.map(m => <MetricCard key={m.label} {...m} />)}
          </section>

          {/* Roles + Subscriptions */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4" aria-label="Roles and subscriptions">
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
              <SectionHeader title="Role Distribution" sub="All registered users by access level" />
              <div className="px-5 py-5 space-y-4">
                {ROLES.map(r => (
                  <div key={r.role}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-stone-700">{r.role}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-800 tabular-nums">{r.count.toLocaleString()}</span>
                        <span className="text-[10px] text-stone-400 w-8 text-right tabular-nums">{r.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
              <SectionHeader title="Subscription Overview" sub="Active plans by tier" action="Manage Billing" />
              <div className="overflow-x-auto">
                <table className="w-full" aria-label="Subscription plans">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/60">
                      {['Plan', 'Institutions', 'ARR', 'Status'].map(h => (
                        <th key={h} className="text-left px-5 py-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {SUBSCRIPTIONS.map(s => (
                      <tr key={s.plan} className="hover:bg-stone-50 transition-colors">
                        <td className="px-5 py-3 text-xs font-semibold text-stone-800">{s.plan}</td>
                        <td className="px-5 py-3 text-xs text-stone-600 tabular-nums">{s.institutions}</td>
                        <td className="px-5 py-3 text-xs font-semibold text-stone-800 tabular-nums">{s.arr}</td>
                        <td className="px-5 py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${PLAN_STATUS[s.status]}`}>{s.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Moderation + System Health */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4" aria-label="Moderation and system health">
            <div className="xl:col-span-2 bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
              <SectionHeader title="Content Moderation Queue" sub="Unreviewed flags requiring action" action="Open Queue" />
              <div className="overflow-x-auto">
                <table className="w-full" aria-label="Moderation queue">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/60">
                      {['ID', 'Type', 'Course', 'Reporter', 'Time', 'Severity', ''].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {MODERATION.map(m => (
                      <tr key={m.id} className="hover:bg-stone-50 transition-colors group">
                        <td className="px-4 py-3 text-[10px] font-mono text-stone-400">{m.id}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-stone-800 whitespace-nowrap">{m.type}</td>
                        <td className="px-4 py-3 text-xs text-stone-500 max-w-[140px] truncate">{m.course}</td>
                        <td className="px-4 py-3 text-xs text-stone-500 whitespace-nowrap">{m.reporter}</td>
                        <td className="px-4 py-3 text-[10px] text-stone-400 whitespace-nowrap tabular-nums">{m.time}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${SEV[m.severity]}`}>{m.severity}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1 rounded text-stone-400 hover:text-teal-700 hover:bg-teal-50 transition-colors" aria-label="Review"><Eye className="w-3 h-3" /></button>
                            <button className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label="Remove"><Ban className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <SectionHeader title="System Health" sub="Live service status" />
              <div className="divide-y divide-stone-50 flex-1">
                {HEALTH.map(s => {
                  const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.operational;
                  return (
                    <div key={s.label} className="flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${s.status === 'degraded' ? 'animate-pulse' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-800 truncate">{s.label}</p>
                        <p className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono text-stone-600 tabular-nums">{s.latency}</p>
                        <p className="text-[10px] text-stone-400 tabular-nums">{s.uptime}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t border-stone-100 bg-amber-50/40">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <p className="text-[10px] text-amber-700 font-semibold">Video CDN latency elevated · Investigating</p>
                </div>
              </div>
            </div>
          </section>

          {/* Audit Log + Quick Actions */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4" aria-label="Audit log and quick actions">
            <div className="xl:col-span-2 bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
              <SectionHeader title="Audit Trail" sub="Recent privileged actions on the platform" action="Full Logs" />
              <div className="divide-y divide-stone-50">
                {AUDIT.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${AUDIT_DOT[a.type]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">{a.actor}</span>
                        <span className="text-xs text-stone-700 font-medium">{a.action}</span>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-0.5 truncate">{a.target}</p>
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0 tabular-nums whitespace-nowrap">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
              <SectionHeader title="Admin Actions" />
              <div className="p-3 space-y-1.5">
                {[
                  { icon: Users, label: 'User Management', desc: 'Search, suspend, assign roles', teal: true },
                  { icon: Building2, label: 'Institution Manager', desc: 'Add, edit, deactivate orgs' },
                  { icon: CreditCard, label: 'Billing & Invoices', desc: 'Plans, payments, refunds' },
                  { icon: Lock, label: 'Access Control', desc: 'Permissions & API keys' },
                  { icon: Flag, label: 'Review Flagged Content', desc: '5 items in queue' },
                  { icon: Database, label: 'Database Backup', desc: 'Schedule or trigger now' },
                  { icon: Globe, label: 'CDN Configuration', desc: 'Regions & cache rules' },
                  { icon: FileText, label: 'Export Audit Report', desc: 'PDF or CSV · any range' },
                ].map(({ icon: Icon, label, desc, teal }) => (
                  <button
                    key={label}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                      teal ? 'border-teal-200 bg-teal-50 hover:bg-teal-100' : 'border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${teal ? 'bg-teal-700' : 'bg-stone-100 group-hover:bg-stone-200'}`}>
                      <Icon className={`w-3.5 h-3.5 ${teal ? 'text-white' : 'text-stone-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${teal ? 'text-teal-900' : 'text-stone-700'}`}>{label}</p>
                      <p className={`text-[10px] truncate ${teal ? 'text-teal-700' : 'text-stone-400'}`}>{desc}</p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-stone-300 group-hover:text-stone-500 shrink-0 transition-colors" />
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