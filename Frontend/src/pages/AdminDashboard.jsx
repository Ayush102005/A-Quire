import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, CreditCard, ShieldCheck,
  Activity, FileText, Settings, Bell, Search, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, TrendingUp, Database,
  Download, RefreshCw, Eye, Ban, Flag, Zap, Globe, Lock,
  ArrowUpRight, ArrowDownRight, Brain, LogOut, Check, X
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { api } from '../services/api';

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

const SEV = { high: 'bg-red-50 text-red-700 border-red-100', medium: 'bg-amber-50 text-amber-700 border-amber-100', low: 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]' };
const AUDIT_DOT = { danger: 'bg-red-500', success: 'bg-emerald-500', warn: 'bg-amber-400', info: 'bg-indigo-400' };
const PLAN_STATUS = { healthy: 'bg-emerald-50 text-emerald-700 border-emerald-100', 'at-risk': 'bg-amber-50 text-amber-700 border-amber-100', trial: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
const STATUS_CFG = {
  operational: { color: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Operational' },
  degraded: { color: 'text-amber-600', dot: 'bg-amber-400', label: 'Degraded' },
};

const NAV = [
  { icon: LayoutDashboard, label: 'Overview' },
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
    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text)] leading-none">{title}</h2>
        {sub && <p className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">{sub}</p>}
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
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] leading-none">{label}</p>
      <p className="text-3xl font-bold text-[var(--text)] tabular-nums leading-none">{value}</p>
      <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${up ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {delta}
        </span>
        <span className="text-[11px] text-[var(--text-muted)] font-medium">{sub}</span>
      </div>
    </div>
  );
}

// --- MOCK COMPONENTS ---

function UsersTab({ usersData, institutionsData, onRefresh }) {
  const users = usersData || [];
  const institutions = institutionsData || [];
  const [loadingAction, setLoadingAction] = useState(null);

  const handleStatusChange = async (userId, currentStatus) => {
    try {
      setLoadingAction(`status-${userId}`);
      await api.admin.updateUserStatus(userId, currentStatus !== 'Active');
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setLoadingAction(`role-${userId}`);
      await api.admin.updateUserRole(userId, newRole);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      alert('Failed to update role');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInstitutionChange = async (userId, instId) => {
    try {
      setLoadingAction(`inst-${userId}`);
      const val = instId === "" ? null : parseInt(instId, 10);
      await api.admin.updateUserInstitution(userId, val);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      alert('Failed to assign institution');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-4 fade-in">
      <SectionHeader title="User Management" sub="View and manage all registered users and assign instructors to institutes" action="Export CSV" />
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider border-b border-[var(--border)]">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Institution</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {users.map((u, i) => (
              <tr key={i} className="hover:bg-[var(--surface-2)] transition-colors">
                <td className="px-5 py-3 font-semibold text-[var(--text)]">{u.name}</td>
                <td className="px-5 py-3 text-[var(--text-muted)]">{u.email}</td>
                <td className="px-5 py-3">
                  <select 
                    value={u.role?.toLowerCase() || "student"}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={loadingAction === `role-${u.id}` || !u.id}
                    className="bg-transparent border border-[var(--border)] rounded px-2 py-1 text-xs outline-none focus:border-teal-500"
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <select 
                    value={u.institution_id || ""}
                    onChange={(e) => handleInstitutionChange(u.id, e.target.value)}
                    disabled={loadingAction === `inst-${u.id}` || !u.id || (u.role !== 'instructor' && u.role !== 'admin')}
                    className={`bg-transparent border border-[var(--border)] rounded px-2 py-1 text-xs outline-none focus:border-teal-500 ${(u.role !== 'instructor' && u.role !== 'admin') ? 'opacity-30' : ''}`}
                  >
                    <option value="">Platform-wide</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right flex justify-end gap-2">
                  <button 
                    onClick={() => handleStatusChange(u.id, u.status)}
                    disabled={loadingAction === `status-${u.id}` || !u.id}
                    className={`${u.status === 'Active' ? 'text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200' : 'text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'} font-semibold text-xs px-2.5 py-1 rounded focus-visible:outline-none disabled:opacity-50 transition-colors`}
                  >
                    {u.status === 'Active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InstitutionsTab({ institutionsData, onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', tier: 'Enterprise', mrr: '', status: 'Healthy' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.admin.addInstitution({
        name: formData.name,
        tier: formData.tier,
        mrr: parseFloat(formData.mrr) || 0,
        status: formData.status
      });
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Failed to add institution: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const insts = institutionsData || [];
  return (
    <div className="space-y-4 fade-in relative">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Institutions</h2>
          <p className="text-xs text-[var(--text-muted)]">Manage institutional clients and deployments</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none"
        >
          Add Institution
        </button>
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-md shadow-xl overflow-hidden fade-in">
            <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
              <h3 className="font-bold text-[var(--text)]">Add New Institution</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Institution Name</label>
                <input required autoFocus type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus-visible:border-teal-500 transition-colors" placeholder="e.g. IIT Bombay" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Plan Tier</label>
                  <select value={formData.tier} onChange={e => setFormData({...formData, tier: e.target.value})} className="w-full bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus-visible:border-teal-500 transition-colors">
                    <option>Enterprise</option>
                    <option>Academic Pro</option>
                    <option>Starter</option>
                    <option>Trial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus-visible:border-teal-500 transition-colors">
                    <option>Healthy</option>
                    <option>At Risk</option>
                    <option>Trial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Monthly Recurring Revenue (₹)</label>
                <input required type="number" min="0" value={formData.mrr} onChange={e => setFormData({...formData, mrr: e.target.value})} className="w-full bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus-visible:border-teal-500 transition-colors" placeholder="e.g. 150000" />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {insts.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--text-muted)]">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-sm">No institutions found</p>
          <p className="text-xs mt-1">Click "Add Institution" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {insts.map((inst, i) => (
            <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 flex items-center justify-between shadow-sm hover:border-teal-300 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--surface-2)] rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-[var(--text-muted)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text)]">{inst.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{inst.users} active users · {inst.tier}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[var(--text)] tabular-nums">{inst.mrr}</p>
                <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${inst.status === 'Healthy' ? 'text-emerald-600' : inst.status === 'Trial' ? 'text-indigo-600' : 'text-amber-600'}`}>{inst.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BillingTab({ invoicesData }) {
  const invoices = invoicesData || [];
  return (
    <div className="space-y-4 fade-in">
      <SectionHeader title="Billing & Revenue" sub="Manage subscriptions, invoices, and payment gateways" action="View Stripe Dashboard" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Monthly Recurring Revenue" value="₹18.4L" delta="+12%" up={true} sub="vs last month" />
        <MetricCard label="Annual Run Rate (ARR)" value="₹2.2Cr" delta="+8%" up={true} sub="projected" />
        <MetricCard label="Failed Charges" value="3" delta="-2" up={true} sub="this week" />
      </div>
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold mb-4 text-[var(--text)]">Recent Invoices</h3>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-[var(--border)]">
            {invoices.map((inv, i) => (
              <tr key={i} className="hover:bg-[var(--surface-2)] transition-colors">
                <td className="py-3 px-2 font-mono text-xs text-[var(--text-muted)]">{inv.id}</td>
                <td className="py-3 px-2 font-semibold text-[var(--text)]">{inv.institution}</td>
                <td className="py-3 px-2 text-[var(--text)]">{inv.amount}</td>
                <td className="py-3 px-2"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{inv.status}</span></td>
                <td className="py-3 px-2 text-right"><Download className="w-4 h-4 inline-block text-[var(--text-muted)] cursor-pointer hover:text-teal-600" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModerationTab({ moderationData, onRefresh }) {
  const [loadingAction, setLoadingAction] = useState(null);

  const handleResolve = async (id) => {
    try {
      const numericId = typeof id === 'string' && id.startsWith('#M-') ? parseInt(id.replace('#M-', ''), 10) : id;
      setLoadingAction(id);
      await api.admin.resolveModeration(numericId);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      alert('Failed to resolve moderation report');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-4 fade-in">
      <SectionHeader title="Content Moderation" sub="Review flagged interactions and system reports" />
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[var(--surface)]">
            <tr className="border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <th className="px-5 py-3">Report ID</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Context</th>
              <th className="px-5 py-3">Severity</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {moderationData.map((m, i) => (
              <tr key={i} className="hover:bg-[var(--surface-2)] transition-colors">
                <td className="px-5 py-3 text-xs font-mono text-[var(--text-muted)]">{m.id}</td>
                <td className="px-5 py-3 text-xs font-semibold text-[var(--text)]">{m.type}</td>
                <td className="px-5 py-3 text-xs text-[var(--text-muted)]">{m.course}</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${m.severity === 'high' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'}`}>{m.severity}</span>
                </td>
                <td className="px-5 py-3 text-right flex justify-end gap-2">
                  <button 
                    onClick={() => handleResolve(m.id)}
                    disabled={loadingAction === m.id}
                    className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-none dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
            {moderationData.length === 0 && (
              <tr>
                <td colSpan="5" className="px-5 py-8 text-center text-[var(--text-muted)] text-sm">
                  No pending moderation reports.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLogsTab({ auditData }) {
  return (
    <div className="space-y-4 fade-in">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Audit Logs</h2>
          <p className="text-xs text-[var(--text-muted)]">Immutable record of system and privileged user actions</p>
        </div>
        <div className="flex gap-2">
          <input type="date" className="border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-lg px-2 py-1.5 text-xs outline-none focus-visible:border-teal-500" />
          <button className="bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none">Filter</button>
        </div>
      </div>
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-[var(--border)]">
          {auditData.map((a, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4 hover:bg-[var(--surface-2)] transition-colors">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.type === 'danger' ? 'bg-red-500' : a.type === 'success' ? 'bg-emerald-500' : a.type === 'warn' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text)]">{a.action} <span className="text-[var(--text-muted)] font-normal ml-1">on</span> <span className="font-mono text-xs ml-1 bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">{a.target}</span></p>
                <p className="text-xs text-[var(--text-muted)] mt-1.5">Performed by <span className="font-semibold text-[var(--text)]">{a.actor}</span></p>
              </div>
              <div className="text-xs text-[var(--text-muted)] font-mono">{a.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SystemHealthTab({ healthData }) {
  return (
    <div className="space-y-4 fade-in">
      <SectionHeader title="System Health & Infrastructure" sub="Live telemetry from AWS and Vercel" action="View Datadog" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthData.map((s, i) => (
          <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[var(--text)]">{s.label}</h3>
              <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full border ${s.status === 'operational' ? 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                {s.status}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-5 pt-4 border-t border-[var(--border)]">
              <div>
                <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1 tracking-wider">Latency</p>
                <p className="font-mono font-medium text-[var(--text)]">{s.latency}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1 tracking-wider">Uptime (30d)</p>
                <p className="font-mono font-medium text-[var(--text)]">{s.uptime}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-6 max-w-2xl fade-in">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">Platform Settings</h2>
        <p className="text-xs text-[var(--text-muted)]">Configure global A-Quire platform behavior</p>
      </div>
      
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 shadow-sm space-y-5">
        <h3 className="font-bold border-b border-[var(--border)] pb-3 text-[var(--text)]">AI Configuration (AWS Bedrock)</h3>
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Model Selection</label>
            <select className="w-full bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus-visible:border-teal-500 transition-colors">
              <option>Claude 3.5 Sonnet</option>
              <option>Claude 3 Opus</option>
              <option>Llama 3 70B</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Intervention Strictness</label>
            <input type="range" className="w-full accent-teal-600 cursor-pointer" />
            <div className="flex justify-between text-[10px] font-medium text-[var(--text-muted)] mt-1.5 uppercase">
              <span>Lenient</span>
              <span>Aggressive</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 shadow-sm space-y-5">
        <h3 className="font-bold border-b border-[var(--border)] pb-3 text-[var(--text)]">Authentication</h3>
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Enforce SSO</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Require SAML/SSO for all Enterprise institutions</p>
            </div>
            <div className="w-10 h-6 bg-teal-600 rounded-full relative cursor-pointer shadow-inner">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Session Timeout</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Force logout after inactivity</p>
            </div>
            <select className="bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus-visible:border-teal-500 cursor-pointer">
              <option>12 Hours</option>
              <option>24 Hours</option>
              <option>7 Days</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  const fetchDashboard = () => {
    setLoading(true);
    api.admin.getDashboard()
      .then(setData)
      .catch(err => console.error("Failed to load admin dashboard:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = data?.metrics || METRICS;
  const roles = data?.roles || ROLES;
  const subscriptions = data?.subscriptions || SUBSCRIPTIONS;
  const moderation = data?.moderation || MODERATION;
  const audit = data?.audit || AUDIT;
  const health = data?.health || HEALTH;

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <div className="space-y-5 fade-in">
            {/* Metrics */}
            <section aria-label="Platform metrics" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {metrics.map(m => <MetricCard key={m.label} {...m} />)}
            </section>

            {/* Roles + Subscriptions */}
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4" aria-label="Roles and subscriptions">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
                <SectionHeader title="Role Distribution" sub="All registered users by access level" />
                <div className="px-5 py-5 space-y-4">
                  {roles.map(r => (
                    <div key={r.role}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[var(--text)]">{r.role}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text)] tabular-nums">{r.count.toLocaleString()}</span>
                          <span className="text-[10px] text-[var(--text-muted)] w-8 text-right tabular-nums">{r.pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
                <SectionHeader title="Subscription Overview" sub="Active plans by tier" action="Manage Billing" />
                <div className="overflow-x-auto">
                  <table className="w-full" aria-label="Subscription plans">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                        {['Plan', 'Institutions', 'ARR', 'Status'].map(h => (
                          <th key={h} className="text-left px-5 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {subscriptions.map(s => (
                        <tr key={s.plan} className="hover:bg-[var(--surface-2)] transition-colors">
                          <td className="px-5 py-3 text-xs font-semibold text-[var(--text)]">{s.plan}</td>
                          <td className="px-5 py-3 text-xs text-[var(--text-muted)] tabular-nums">{s.institutions}</td>
                          <td className="px-5 py-3 text-xs font-semibold text-[var(--text)] tabular-nums">{s.arr}</td>
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
              <div className="xl:col-span-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
                <SectionHeader title="Content Moderation Queue" sub="Unreviewed flags requiring action" action="Open Queue" />
                <div className="overflow-x-auto">
                  <table className="w-full" aria-label="Moderation queue">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                        {['ID', 'Type', 'Course', 'Reporter', 'Time', 'Severity', ''].map(h => (
                          <th key={h} className="text-left px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {moderation.map(m => (
                        <tr key={m.id} className="hover:bg-[var(--surface-2)] transition-colors group">
                          <td className="px-4 py-3 text-[10px] font-mono text-[var(--text-muted)]">{m.id}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-[var(--text)] whitespace-nowrap">{m.type}</td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)] max-w-[140px] truncate">{m.course}</td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">{m.reporter}</td>
                          <td className="px-4 py-3 text-[10px] text-[var(--text-muted)] whitespace-nowrap tabular-nums">{m.time}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${SEV[m.severity]}`}>{m.severity}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1 rounded text-[var(--text-muted)] hover:text-teal-700 hover:bg-teal-50 transition-colors" aria-label="Review"><Eye className="w-3 h-3" /></button>
                              <button className="p-1 rounded text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors" aria-label="Remove"><Ban className="w-3 h-3" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden flex flex-col">
                <SectionHeader title="System Health" sub="Live service status" />
                <div className="divide-y divide-[var(--border)] flex-1">
                  {health.map(s => {
                    const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.operational;
                    return (
                      <div key={s.label} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--surface-2)] transition-colors">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${s.status === 'degraded' ? 'animate-pulse' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text)] truncate">{s.label}</p>
                          <p className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono text-[var(--text-muted)] tabular-nums">{s.latency}</p>
                          <p className="text-[10px] text-[var(--text-muted)] tabular-nums">{s.uptime}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3 border-t border-[var(--border)] bg-amber-50/40 dark:bg-amber-900/10">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">Video CDN latency elevated · Investigating</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Audit Log + Quick Actions */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4" aria-label="Audit log and quick actions">
              <div className="xl:col-span-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
                <SectionHeader title="Audit Trail" sub="Recent privileged actions on the platform" action="Full Logs" />
                <div className="divide-y divide-[var(--border)]">
                  {audit.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--surface-2)] transition-colors">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${AUDIT_DOT[a.type]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded">{a.actor}</span>
                          <span className="text-xs text-[var(--text)] font-medium">{a.action}</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{a.target}</p>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0 tabular-nums whitespace-nowrap">{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
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
                        teal ? 'border-teal-200 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:border-teal-800' : 'border-[var(--border)] hover:bg-[var(--surface-2)] hover:border-[var(--border-2)]'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${teal ? 'bg-teal-700' : 'bg-[var(--surface)] group-hover:bg-[var(--surface-2)]'}`}>
                        <Icon className={`w-3.5 h-3.5 ${teal ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${teal ? 'text-teal-900 dark:text-teal-300' : 'text-[var(--text)]'}`}>{label}</p>
                        <p className={`text-[10px] truncate ${teal ? 'text-teal-700 dark:text-teal-500' : 'text-[var(--text-muted)]'}`}>{desc}</p>
                      </div>
                      <ChevronRight className={`w-3 h-3 shrink-0 transition-colors ${teal ? 'text-teal-400 group-hover:text-teal-500' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        );
      case 'Users':
        return <UsersTab usersData={data?.users} institutionsData={data?.institutions} onRefresh={fetchDashboard} />;
      case 'Institutions':
        return <InstitutionsTab institutionsData={data?.institutions} onRefresh={fetchDashboard} />;
      case 'Billing':
        return <BillingTab invoicesData={data?.billing_invoices} />;
      case 'Moderation':
        return <ModerationTab moderationData={moderation} onRefresh={fetchDashboard} />;
      case 'Audit Logs':
        return <AuditLogsTab auditData={audit} />;
      case 'System Health':
        return <SystemHealthTab healthData={health} />;
      case 'Settings':
        return <SettingsTab />;
      default:
        return (
          <div className="flex-1 overflow-y-auto p-5 flex items-center justify-center">
            <div className="text-center text-[var(--text-muted)] space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-[var(--text-faint)]" />
              </div>
              <h2 className="text-lg font-bold text-[var(--text)]">{activeTab}</h2>
              <p className="text-xs font-medium">This module is currently under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="page-shell text-[13px]">
      <aside className={`shrink-0 sidebar-dark flex flex-col border-r border-[var(--sidebar-border)] transition-all duration-200 ${collapsed ? 'w-14' : 'w-52'}`}>
        <div className="h-12 flex items-center gap-2.5 px-3.5 border-b border-[var(--sidebar-border)] shrink-0">
          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">A</div>
          {!collapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-sm text-white">A-Quire</span>
              <span className="text-[9px] font-bold bg-teal-600/25 text-teal-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Admin</span>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5" aria-label="Admin navigation">
          {NAV.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              title={collapsed ? label : undefined}
              aria-current={activeTab === label ? 'page' : undefined}
              className={`sidebar-nav-item ${
                activeTab === label ? 'active' : ''
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && label}
            </button>
          ))}
        </nav>

        <div className="border-t border-[var(--sidebar-border)] p-2 shrink-0 space-y-1">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[var(--sidebar-text)] hover:text-[var(--text)] hover:bg-[var(--sidebar-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <div className="w-6 h-6 rounded-full bg-[var(--sidebar-hover)] text-[var(--sidebar-text)] text-[10px] font-bold flex items-center justify-center shrink-0">SA</div>
            {!collapsed && <span className="truncate text-[var(--sidebar-text)]">Super Admin</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${collapsed ? 'justify-center' : ''}`}
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">Logout</span>}
          </button>
        </div>
      </aside>

      <div className="page-main">
        <header className="h-14 app-header flex items-center gap-3 px-5 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 focus-within:border-teal-300 focus-within:bg-[var(--card-bg)] transition-colors">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users, institutions, logs…"
              className="flex-1 bg-transparent text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
              aria-label="Search platform"
            />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              PRODUCTION
            </span>
            <ThemeToggle />
            <button className="relative p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors" aria-label="Export">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors" aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5" aria-label={`Admin ${activeTab}`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}