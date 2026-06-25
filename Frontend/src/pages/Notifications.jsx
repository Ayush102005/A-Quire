import React, { useState, useMemo } from 'react';
import {
  Home, BookOpen, Video, BrainCircuit, LineChart, Bell, User, Settings,
  Menu, X, Check, CheckCheck, BookMarked, Megaphone, Cpu, Info,
  ChevronRight, Clock, AlertTriangle, Sparkles, Trash2,
} from 'lucide-react';

// ── Nav ────────────────────────────────────────────────────────────────────
const NAV = [
  { name: 'Dashboard',     icon: Home,         href: '/dashboard' },
  { name: 'My Courses',    icon: BookOpen,     href: '/courses' },
  { name: 'Live Lessons',  icon: Video,        href: '#' },
  { name: 'AI Mentor',     icon: BrainCircuit, href: '#' },
  { name: 'Progress',      icon: LineChart,    href: '/progress' },
  { name: 'Notifications', icon: Bell,         href: '/notifications', active: true },
];

// ── Notification types ─────────────────────────────────────────────────────
const TYPE_META = {
  course:  { label: 'Course',    icon: BookMarked, iconBg: 'bg-violet-50', iconColor: 'text-violet-600', dot: 'bg-violet-400' },
  ai:      { label: 'AI Mentor', icon: Sparkles,   iconBg: 'bg-teal-50',   iconColor: 'text-teal-600',   dot: 'bg-teal-400'   },
  system:  { label: 'System',    icon: Cpu,        iconBg: 'bg-stone-100', iconColor: 'text-stone-500',  dot: 'bg-stone-400'  },
  announce:{ label: 'Announcement', icon: Megaphone, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', dot: 'bg-amber-400'  },
  reminder:{ label: 'Reminder',  icon: Clock,      iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', dot: 'bg-indigo-400' },
};

// ── Mock notifications ─────────────────────────────────────────────────────
const INITIAL = [
  { id: 1,  type: 'ai',       read: false, ts: '2 min ago',   title: 'Big O Notation — follow-up ready',         body: 'Your AI mentor prepared a 3-step revision summary for the concept you struggled with during the last session.',    action: { label: 'Review Summary', href: '/quiz' } },
  { id: 2,  type: 'course',   read: false, ts: '1 hour ago',  title: 'New lesson available: Binary Trees',        body: 'Prof. Alan Mehta has published the next lesson in Data Structures & Algorithms. Pick up where you left off.',      action: { label: 'Start Lesson', href: '/lesson' } },
  { id: 3,  type: 'reminder', read: false, ts: '3 hours ago', title: 'Daily study goal reminder',                 body: "You haven't studied yet today. Your goal is 60 minutes. Even 20 minutes makes a difference.", action: null },
  { id: 4,  type: 'announce', read: false, ts: 'Yesterday',   title: 'Midterm quiz opens tomorrow',               body: 'Your Operating Systems midterm self-check is scheduled to open at 9:00 AM tomorrow. Check your revision priorities.', action: { label: 'View Schedule', href: '#' } },
  { id: 5,  type: 'ai',       read: true,  ts: 'Yesterday',   title: 'Session debrief: OS Process Scheduling',    body: 'You spent 14 minutes on this topic. Your accuracy improved by 22% compared to the previous session. Great recovery!', action: null },
  { id: 6,  type: 'course',   read: true,  ts: '2 days ago',  title: 'DBMS course marked complete',               body: 'Congratulations — you have completed all 20 lessons in Database Management Systems.',                               action: { label: 'View Certificate', href: '#' } },
  { id: 7,  type: 'system',   read: true,  ts: '2 days ago',  title: 'Webcam permissions updated',                body: 'Your session camera settings were updated. Webcam will only activate when you start a live lesson.',                action: null },
  { id: 8,  type: 'ai',       read: true,  ts: '3 days ago',  title: 'Weak area detected: Subnetting',            body: 'Based on your last 3 sessions, the AI mentor flagged Subnetting & CIDR as a priority revision area.',               action: { label: 'Start Revision', href: '/quiz' } },
  { id: 9,  type: 'announce', read: true,  ts: '4 days ago',  title: 'Platform update — voice mentor improved',   body: 'The AI voice mentor now supports Hinglish responses. You can update your language preference in Settings.',          action: { label: 'Update Preference', href: '#' } },
  { id: 10, type: 'system',   read: true,  ts: '1 week ago',  title: 'Account verified successfully',             body: 'Your A-Quire account has been verified. All features including live lessons are now available.',                    action: null },
];

const TABS = ['All', 'Unread', 'Courses', 'AI Mentor', 'System'];
const TAB_FILTER = {
  'All':      null,
  'Unread':   (n) => !n.read,
  'Courses':  (n) => n.type === 'course' || n.type === 'announce',
  'AI Mentor':(n) => n.type === 'ai',
  'System':   (n) => n.type === 'system' || n.type === 'reminder',
};

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ open, onClose, unreadCount }) {
  const body = (
    <div className="flex flex-col h-full bg-stone-50 border-r border-stone-200 w-64 p-6">
      <a href="/" className="inline-flex items-center gap-2 mb-10 pl-1">
        <div className="w-8 h-8 rounded bg-teal-700 text-white flex items-center justify-center font-bold text-base shadow-sm">A</div>
        <span className="font-semibold text-xl tracking-tight text-stone-800">A-Quire</span>
      </a>
      <nav className="space-y-1 flex-1">
        {NAV.map(({ name, icon: Icon, href, active }) => (
          <a key={name} href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-white shadow-sm border border-stone-200 text-teal-800' : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'}`}>
            <Icon className={`w-4 h-4 ${active ? 'text-teal-700' : 'text-stone-400'}`} />
            <span className="flex-1">{name}</span>
            {name === 'Notifications' && unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>
            )}
          </a>
        ))}
      </nav>
      <div className="pt-6 border-t border-stone-200/60 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-200/50 transition-colors"><User className="w-4 h-4 text-stone-400" />Profile</button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-200/50 transition-colors"><Settings className="w-4 h-4 text-stone-400" />Settings</button>
      </div>
    </div>
  );
  return (
    <>
      <div className="hidden lg:flex h-screen sticky top-0 shrink-0">{body}</div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm" onClick={onClose}>
          <div className="fixed inset-y-0 left-0 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative">{body}
              <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:bg-stone-200"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Notification item ──────────────────────────────────────────────────────
function NotifItem({ notif, onRead, onDismiss }) {
  const { id, type, read, ts, title, body, action } = notif;
  const meta = TYPE_META[type];
  const Icon = meta.icon;

  return (
    <div
      className={`group flex items-start gap-4 px-5 py-4 border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50/60 ${!read ? 'bg-teal-50/20' : ''}`}
    >
      {/* Unread dot */}
      <div className="flex flex-col items-center pt-1.5 shrink-0 w-3">
        {!read && <div className={`w-2 h-2 rounded-full ${meta.dot} shrink-0`} aria-label="Unread" />}
      </div>

      {/* Type icon */}
      <div className={`w-9 h-9 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${meta.iconColor}`} strokeWidth={1.75} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-0.5">
          <p className={`text-sm leading-snug ${read ? 'font-medium text-stone-700' : 'font-semibold text-stone-900'}`}>
            {title}
          </p>
          <span className="text-[10px] text-stone-400 font-medium whitespace-nowrap shrink-0 mt-0.5">{ts}</span>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{body}</p>

        {/* Action row */}
        {(action || !read) && (
          <div className="flex items-center gap-4 mt-2.5">
            {action && (
              <a href={action.href}
                className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors focus-visible:outline-none focus-visible:underline">
                {action.label} <ChevronRight className="w-3 h-3" />
              </a>
            )}
            {!read && (
              <button onClick={() => onRead(id)}
                className="text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:underline">
                <Check className="w-3 h-3" />Mark read
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-stone-300 hover:text-stone-500 hover:bg-stone-100 shrink-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function SkeletonItem() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b border-stone-100 animate-pulse">
      <div className="w-3 pt-1.5 shrink-0"><div className="w-2 h-2 rounded-full bg-stone-200" /></div>
      <div className="w-9 h-9 rounded-xl bg-stone-200 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="flex justify-between gap-4"><div className="h-3.5 bg-stone-200 rounded w-2/3" /><div className="h-3 bg-stone-100 rounded w-16 shrink-0" /></div>
        <div className="h-3 bg-stone-100 rounded w-full" />
        <div className="h-3 bg-stone-100 rounded w-4/5" />
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mb-4">
        <Bell className="w-6 h-6 text-stone-400" />
      </div>
      <p className="text-sm font-semibold text-stone-700 mb-1">
        {tab === 'Unread' ? 'All caught up!' : `No ${tab.toLowerCase()} notifications`}
      </p>
      <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
        {tab === 'Unread' ? "You've read everything. Check back after your next session." : 'Notifications of this type will appear here as you use the platform.'}
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Notifications() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [viewState, setViewState]   = useState('full'); // full | loading | empty
  const [activeTab, setActiveTab]   = useState('All');
  const [items, setItems]           = useState(INITIAL);

  const unreadCount = items.filter(n => !n.read).length;

  const filtered = useMemo(() => {
    const fn = TAB_FILTER[activeTab];
    return fn ? items.filter(fn) : items;
  }, [activeTab, items]);

  // Group by date label
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(n => {
      const key = n.ts.includes('min') || n.ts.includes('hour') ? 'Today' : n.ts === 'Yesterday' ? 'Yesterday' : 'Earlier';
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return groups;
  }, [filtered]);

  function markRead(id) { setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); }
  function dismiss(id) { setItems(prev => prev.filter(n => n.id !== id)); }
  function markAllRead() { setItems(prev => prev.map(n => ({ ...n, read: true }))); }

  const tabCounts = useMemo(() => {
    const c = {};
    TABS.forEach(t => { const fn = TAB_FILTER[t]; c[t] = fn ? items.filter(fn).length : items.length; });
    return c;
  }, [items]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} unreadCount={unreadCount} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-stone-50/90 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-stone-600 hover:bg-stone-200/50 rounded-lg" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></button>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-stone-900">Notifications</p>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">{unreadCount} unread</span>
                )}
              </div>
              <p className="text-xs text-stone-500">Stay on top of your learning activity</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Dev toggles */}
            {['full','loading','empty'].map(s => (
              <button key={s} onClick={() => setViewState(s)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize border transition-colors hidden sm:inline-flex ${viewState === s ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>
                {s}
              </button>
            ))}
            <button className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center border border-teal-200">
              <span className="text-sm font-bold text-teal-800">AS</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
              {/* Tabs — scrollable on mobile */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl overflow-x-auto max-w-full">
                {TABS.map(tab => (
                  <button key={tab} id={`notif-tab-${tab.toLowerCase().replace(/\s+/g,'-')}`}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                    {tab}
                    {tabCounts[tab] > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab && tab === 'Unread' ? 'bg-teal-100 text-teal-700' : activeTab === tab ? 'bg-teal-100 text-teal-700' : 'bg-stone-200 text-stone-500'}`}>
                        {tabCounts[tab]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Mark all read */}
              {unreadCount > 0 && viewState === 'full' && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:underline shrink-0">
                  <CheckCheck className="w-3.5 h-3.5" />Mark all read
                </button>
              )}
            </div>

            {/* Loading */}
            {viewState === 'loading' && (
              <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)}
              </div>
            )}

            {/* Empty page state */}
            {viewState === 'empty' && (
              <div className="bg-white border border-stone-200 rounded-2xl shadow-sm">
                <EmptyState tab="All" />
              </div>
            )}

            {/* Full content */}
            {viewState === 'full' && (
              filtered.length === 0
                ? (
                  <div className="bg-white border border-stone-200 rounded-2xl shadow-sm">
                    <EmptyState tab={activeTab} />
                  </div>
                )
                : (
                  <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                    {Object.entries(grouped).map(([group, notifs]) => (
                      <div key={group}>
                        {/* Date group header */}
                        <div className="px-5 py-2.5 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{group}</span>
                          <div className="flex-1 h-px bg-stone-100" />
                        </div>
                        {notifs.map(n => (
                          <NotifItem key={n.id} notif={n} onRead={markRead} onDismiss={dismiss} />
                        ))}
                      </div>
                    ))}

                    {/* Footer */}
                    <div className="px-5 py-3.5 bg-stone-50/60 border-t border-stone-100 flex items-center justify-between">
                      <p className="text-xs text-stone-400">Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}</p>
                      <button
                        onClick={() => setItems(prev => prev.filter(n => n.read))}
                        className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:underline">
                        <Trash2 className="w-3 h-3" />Clear read
                      </button>
                    </div>
                  </div>
                )
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
