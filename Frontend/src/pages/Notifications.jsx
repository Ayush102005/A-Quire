import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, BookOpen, Video, BrainCircuit, LineChart, Bell, User, Settings,
  Menu, X, Check, CheckCheck, BookMarked, Megaphone, Cpu, Info,
  ChevronRight, Clock, AlertTriangle, Sparkles, Trash2,
} from 'lucide-react';
import { api, getAccessToken, connectNotifications } from '../services/api';
import UserAvatar from '../components/UserAvatar';
import ThemeToggle from '../components/ThemeToggle';
import { renderInline, renderLiteMarkdown } from '../utils/renderLiteMarkdown';

// ── Nav ────────────────────────────────────────────────────────────────────
const NAV = [
  { name: 'Dashboard',     icon: Home,         href: '/dashboard' },
  { name: 'My Courses',    icon: BookOpen,     href: '/courses' },
  { name: 'Progress',      icon: LineChart,    href: '/progress' },
  { name: 'Notifications', icon: Bell,         href: '/notifications', active: true },
];

// ── Notification types ─────────────────────────────────────────────────────
const TYPE_META = {
  course:  { label: 'Course',    icon: BookMarked, iconBg: 'bg-violet-50', iconColor: 'text-violet-600', dot: 'bg-violet-400' },
  ai:      { label: 'AI Mentor', icon: Sparkles,   iconBg: 'bg-teal-50',   iconColor: 'text-teal-600',   dot: 'bg-teal-400'   },
  system:  { label: 'System',    icon: Cpu,        iconBg: 'bg-[var(--surface-2)]', iconColor: 'text-[var(--text-muted)]',  dot: 'bg-[var(--text-faint)]'  },
  announce:{ label: 'Announcement', icon: Megaphone, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', dot: 'bg-amber-400'  },
  reminder:{ label: 'Reminder',  icon: Clock,      iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', dot: 'bg-indigo-400' },
};



const TABS = ['All', 'Unread', 'Courses', 'AI Mentor', 'System'];
const TAB_FILTER = {
  'All':      null,
  'Unread':   (n) => !n.read,
  'Courses':  (n) => n.type === 'course' || n.type === 'announce',
  'AI Mentor':(n) => n.type === 'ai',
  'System':   (n) => n.type === 'system' || n.type === 'reminder',
};
import StudentSidebar from '../components/StudentSidebar';

// ── Notification item ──────────────────────────────────────────────────────
function NotifItem({ notif, onRead, onDismiss }) {
  const { id, type, read, ts, title, body, action } = notif;
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
    if (!read) onRead(id);
  };

  return (
    <div
      className={`group flex items-start gap-4 px-5 py-4 border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface)]/60 cursor-pointer ${!read ? 'bg-teal-50/20' : ''}`}
      onClick={toggleExpanded}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(); } }}
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
          <p className={`text-sm leading-snug ${read ? 'font-medium text-[var(--text)]' : 'font-semibold text-[var(--text)]'}`}>
            {title}
          </p>
          <span className="text-[10px] text-[var(--text-faint)] font-medium whitespace-nowrap shrink-0 mt-0.5">{ts}</span>
        </div>

        {expanded ? (
          <div className="text-xs text-[var(--text-muted)] leading-relaxed space-y-1.5 mt-1">
            {renderLiteMarkdown(body)}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">{renderInline(body, `notif-${id}`)}</p>
        )}

        {/* Action row */}
        {(action || !read || expanded) && (
          <div className="flex items-center gap-4 mt-2.5">
            {action && (
              <Link to={action.href}
                onClick={(e) => {
                  // stopPropagation alone silently skipped onRead too — it
                  // only exists here to stop the row's own onClick from
                  // toggling "expanded" right as the user navigates away,
                  // not to skip marking the notification read.
                  e.stopPropagation();
                  if (!read) onRead(id);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors focus-visible:outline-none focus-visible:underline">
                {action.label} <ChevronRight className="w-3 h-3" />
              </Link>
            )}
            {!read && (
              <button onClick={(e) => { e.stopPropagation(); onRead(id); }}
                className="text-xs font-medium text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:underline">
                <Check className="w-3 h-3" />Mark read
              </button>
            )}
            <span className="text-xs font-medium text-[var(--text-faint)] flex items-center gap-1">
              {expanded ? 'Show less' : 'Show more'}
            </span>
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(id); }}
        aria-label="Dismiss notification"
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-2)] shrink-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-2)] mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function SkeletonItem() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b border-[var(--border)]">
      <div className="w-3 pt-1.5 shrink-0"><div className="w-2 h-2 rounded-full animate-shimmer" /></div>
      <div className="w-9 h-9 rounded-xl animate-shimmer shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="flex justify-between gap-4"><div className="h-3.5 animate-shimmer rounded w-2/3" /><div className="h-3 animate-shimmer rounded w-16 shrink-0" /></div>
        <div className="h-3 animate-shimmer rounded w-full" />
        <div className="h-3 animate-shimmer rounded w-4/5" />
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-[var(--surface-2)] rounded-full flex items-center justify-center mb-4">
        <Bell className="w-6 h-6 text-[var(--text-faint)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--text)] mb-1">
        {tab === 'Unread' ? 'All caught up!' : tab === 'All' ? 'No notifications' : `No ${tab.toLowerCase()} notifications`}
      </p>
      <p className="text-xs text-[var(--text-faint)] max-w-xs leading-relaxed">
        {tab === 'Unread' ? "You've read everything. Check back after your next session." : 'Notifications of this type will appear here as you use the platform.'}
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Notifications() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [viewState, setViewState]   = useState('loading'); // full | loading | empty | error
  const [activeTab, setActiveTab]   = useState('All');
  const [items, setItems]           = useState([]);
  const [errorMsg, setErrorMsg]     = useState('');

  React.useEffect(() => {
    loadNotifications();

    const token = getAccessToken();
    let ws = null;
    if (token) {
      ws = connectNotifications(token, (msg) => {
        // Refresh notifications on any incoming WS message
        loadNotifications();
      });
    }
    return () => {
      if (ws) ws.close();
    };
  }, []);

  async function loadNotifications() {
    try {
      setViewState('loading');
      const data = await api.notifications.list();
      
      const formatted = data.map(n => {
        let type = 'system';
        const lowerTitle = n.title.toLowerCase();
        const lowerMsg = n.message.toLowerCase();
        if (lowerTitle.includes('course') || lowerTitle.includes('lesson') || lowerTitle.includes('module')) type = 'course';
        else if (lowerTitle.includes('mentor') || lowerTitle.includes('ai') || lowerTitle.includes('hint')) type = 'ai';
        else if (lowerTitle.includes('reminder') || lowerMsg.includes('reminder')) type = 'reminder';
        else if (lowerTitle.includes('update') || lowerTitle.includes('announce')) type = 'announce';
        
        const ms = new Date() - new Date(n.created_at);
        const mins = Math.floor(ms / 60000);
        const hrs = Math.floor(mins / 60);
        const days = Math.floor(hrs / 24);
        let ts = 'Just now';
        if (days > 1) ts = `${days} days ago`;
        else if (days === 1) ts = 'Yesterday';
        else if (hrs > 0) ts = `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
        else if (mins > 0) ts = `${mins} min${mins > 1 ? 's' : ''} ago`;

        let body = n.message;
        let action = null;
        
        // Extract scheduling/meeting link if present
        if (body.includes('\nLink: ')) {
          const parts = body.split('\nLink: ');
          body = parts[0];
          const linkStr = parts[1].trim();
          action = { 
            label: 'Join Meeting', 
            href: linkStr.startsWith('/') ? linkStr : (linkStr.startsWith('http') ? linkStr : `https://${linkStr}`)
          };
        }

        return {
          id: n.id,
          type,
          read: n.is_read,
          ts,
          title: n.title,
          body,
          action
        };
      });
      setItems(formatted);
      setViewState(formatted.length === 0 ? 'empty' : 'full');
    } catch (e) {
      console.error(e);
      setErrorMsg('Could not load notifications. Please try again.');
      setViewState('error');
    }
  }

  const unreadCount = items.filter(n => !n.read).length;

  const filtered = useMemo(() => {
    const fn = TAB_FILTER[activeTab];
    return fn ? items.filter(fn) : items;
  }, [activeTab, items]);

  // Group by date label
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(n => {
      const key = n.ts.includes('min') || n.ts.includes('hour') || n.ts === 'Just now' ? 'Today' : n.ts === 'Yesterday' ? 'Yesterday' : 'Earlier';
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return groups;
  }, [filtered]);

  async function markRead(id) { 
    try {
      await api.notifications.markRead(id, true);
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) { console.error(e); }
  }
  
  function dismiss(id) { 
    setItems(prev => prev.filter(n => n.id !== id)); 
  }
  
  async function markAllRead() { 
    try {
      await api.notifications.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) { console.error(e); }
  }

  const tabCounts = useMemo(() => {
    const c = {};
    TABS.forEach(t => { const fn = TAB_FILTER[t]; c[t] = fn ? items.filter(fn).length : items.length; });
    return c;
  }, [items]);

  return (
    <div className="page-shell font-sans">
      <StudentSidebar sidebarOpen={true} activeId="/notifications" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} unreadCount={unreadCount} />

      <div className="page-main">

        {/* Topbar */}
        <header className="sticky top-0 z-40 app-header backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] rounded-lg" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></button>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-[var(--text)]">Notifications</p>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">{unreadCount} unread</span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">Stay on top of your learning activity</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserAvatar />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
              {/* Tabs — scrollable on mobile */}
              <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl overflow-x-auto max-w-full">
                {TABS.map(tab => (
                  <button key={tab} id={`notif-tab-${tab.toLowerCase().replace(/\s+/g,'-')}`}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-[var(--card-bg)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                    {tab}
                    {tabCounts[tab] > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab && tab === 'Unread' ? 'bg-teal-100 text-teal-700' : activeTab === tab ? 'bg-teal-100 text-teal-700' : 'bg-[var(--border)] text-[var(--text-muted)]'}`}>
                        {tabCounts[tab]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Mark all read */}
              {unreadCount > 0 && viewState === 'full' && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:underline shrink-0">
                  <CheckCheck className="w-3.5 h-3.5" />Mark all read
                </button>
              )}
            </div>

            {/* Loading */}
            {viewState === 'loading' && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)}
              </div>
            )}

            {/* Empty page state */}
            {viewState === 'empty' && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm">
                <EmptyState tab="All" />
              </div>
            )}

            {/* Error state */}
            {viewState === 'error' && (
              <div className="bg-[var(--card-bg)] border border-red-100 rounded-2xl shadow-sm p-8 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-sm font-semibold text-[var(--text)] mb-1">Failed to load notifications</p>
                <p className="text-xs text-[var(--text-faint)] mb-4">{errorMsg}</p>
                <button onClick={loadNotifications}
                  className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors">
                  Retry
                </button>
              </div>
            )}

            {/* Full content */}
            {viewState === 'full' && (
              filtered.length === 0
                ? (
                  <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm">
                    <EmptyState tab={activeTab} />
                  </div>
                )
                : (
                  <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden">
                    {Object.entries(grouped).map(([group, notifs]) => (
                      <div key={group}>
                        {/* Date group header */}
                        <div className="px-5 py-2.5 bg-[var(--surface)] border-b border-[var(--border)] flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-widest">{group}</span>
                          <div className="flex-1 h-px bg-[var(--border)]" />
                        </div>
                        {notifs.map(n => (
                          <NotifItem key={n.id} notif={n} onRead={markRead} onDismiss={dismiss} />
                        ))}
                      </div>
                    ))}

                    {/* Footer */}
                    <div className="px-5 py-3.5 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between">
                      <p className="text-xs text-[var(--text-faint)]">Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}</p>
                      <button
                        onClick={() => setItems(prev => prev.filter(n => n.read))}
                        className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-faint)] hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:underline">
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
