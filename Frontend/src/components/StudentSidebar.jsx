import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, BookOpen, LineChart, Bell, User, Settings as SettingsIcon, X
} from 'lucide-react';
import { getCurrentUser } from '../services/api';

const STUDENT_NAV = [
  { name: 'Dashboard',     icon: Home,        href: '/dashboard' },
  { name: 'My Courses',    icon: BookOpen,    href: '/courses' },
  { name: 'Progress',      icon: LineChart,   href: '/progress' },
  { name: 'Notifications', icon: Bell,        href: '/notifications' },
];

export default function StudentSidebar({ sidebarOpen = true, mobileOpen = false, setMobileOpen, activeId, unreadCount = 0 }) {
  const location = useLocation();
  const currentPath = activeId || location.pathname;

  const desktopBody = (
    <aside className={`shrink-0 flex flex-col sidebar-light transition-all duration-300 h-full border-r border-[var(--border)] ${sidebarOpen ? 'w-64' : 'w-20'}`}>
      <Link to="/" className="h-14 flex items-center gap-3 px-6 border-b border-[var(--border)] shrink-0 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">A</div>
        {sidebarOpen && <span className="font-bold text-xl tracking-tight text-[var(--text)]">A-Quire</span>}
      </Link>
      
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto" aria-label="Student navigation">
        {STUDENT_NAV.map(({ name, icon: Icon, href }) => {
          const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));
          return (
            <Link
              key={name}
              to={href}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 sidebar-nav-item ${
                isActive ? 'active bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700 dark:text-teal-400' : ''}`} />
                {sidebarOpen && name}
              </div>
              {name === 'Notifications' && unreadCount > 0 && sidebarOpen && (
                <span className="bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border)] shrink-0 space-y-1">
        <Link
          to="/settings"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 sidebar-nav-item ${
            currentPath === '/settings' ? 'active bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <User className={`w-4 h-4 shrink-0 ${currentPath === '/settings' ? 'text-teal-700 dark:text-teal-400' : ''}`} />
          {sidebarOpen && "Profile & Settings"}
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-screen sticky top-0 shrink-0">
        {desktopBody}
      </div>

      {/* Mobile Sidebar */}
      {setMobileOpen && (
        <div className={`lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileOpen(false)}>
          <div className={`fixed inset-y-0 left-0 shadow-2xl sidebar-light w-64 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={e => e.stopPropagation()}>
            <div className="h-14 flex items-center justify-between px-6 border-b border-[var(--border)] shrink-0">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">A</div>
                <span className="font-bold text-xl tracking-tight text-[var(--text)]">A-Quire</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
              {STUDENT_NAV.map(({ name, icon: Icon, href }) => {
                const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));
                return (
                  <Link
                    key={name}
                    to={href}
                    onClick={() => setMobileOpen(false)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 sidebar-nav-item ${
                      isActive ? 'active bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700 dark:text-teal-400' : ''}`} />
                      {name}
                    </div>
                    {name === 'Notifications' && unreadCount > 0 && (
                      <span className="bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[var(--border)] shrink-0 space-y-1">
              <Link
                to="/settings"
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 sidebar-nav-item ${
                  currentPath === '/settings' ? 'active bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <User className={`w-4 h-4 shrink-0 ${currentPath === '/settings' ? 'text-teal-700 dark:text-teal-400' : ''}`} />
                Profile & Settings
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
