import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, BarChart2, Settings, X, Terminal, LogOut } from 'lucide-react';
import { getCurrentUser, api } from '../services/api';

const NAV = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview', href: '/instructor?tab=overview' },
  { id: 'courses',  icon: BookOpen,        label: 'Courses',  href: '/instructor?tab=courses' },
  { id: 'students', icon: Users,           label: 'Students', href: '/instructor?tab=students' },
  { id: 'analytics',icon: BarChart2,       label: 'Analytics', href: '/analytics' },
  { id: 'settings', icon: Settings,        label: 'Settings', href: '/settings' },
];

export default function InstructorSidebar({ sidebarOpen = true, mobileOpen = false, setMobileOpen, activeId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser() || { full_name: 'Instructor', role: 'instructor' };
  const initials = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'I';

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  // Desktop Body
  const desktopBody = (
    <aside className={`shrink-0 flex flex-col sidebar-light transition-all duration-300 h-full border-r border-[var(--border)] ${sidebarOpen ? 'w-52' : 'w-16'}`}>
      <button
        onClick={() => navigate('/')}
        className="h-14 flex items-center gap-2.5 px-4 border-b border-[var(--border)] shrink-0 hover:opacity-80 transition-opacity text-left"
      >
        <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shrink-0">A</div>
        {sidebarOpen && <span className="font-bold text-sm tracking-tight text-[var(--text)]">A-Quire</span>}
      </button>
      <nav className="flex-1 py-4 px-2 space-y-0.5" aria-label="Instructor navigation">
        {NAV.map(({ id, icon: Icon, label, href }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              onClick={() => navigate(href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 sidebar-nav-item ${
                isActive ? 'active bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : ''}`} />
              {sidebarOpen && label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--border)] shrink-0 space-y-1">
        <div className={`flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--surface-2)] cursor-pointer ${!sidebarOpen && 'justify-center'}`} onClick={() => navigate('/settings')}>
          <div className="w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">{initials}</div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text)] truncate">{user.full_name}</p>
              <p className="text-[10px] text-[var(--text-faint)] truncate capitalize">{user.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sidebar-nav-item text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 ${!sidebarOpen && 'justify-center'}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {sidebarOpen && "Logout"}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex h-screen sticky top-0 shrink-0">
        {desktopBody}
      </div>

      {/* Mobile Sidebar */}
      {setMobileOpen && (
        <div className={`lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileOpen(false)}>
          <div className={`fixed inset-y-0 left-0 shadow-2xl sidebar-light w-64 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={e => e.stopPropagation()}>
              <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[var(--border)] shrink-0 justify-between">
                <button
                  onClick={() => { navigate('/'); setMobileOpen(false); }}
                  className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shrink-0">A</div>
                  <span className="font-bold text-sm tracking-tight text-[var(--text)]">A-Quire</span>
                </button>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
                {NAV.map(({ id, icon: Icon, label, href }) => {
                  const isActive = activeId === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        navigate(href);
                        setMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 sidebar-nav-item ${
                        isActive ? 'active bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : ''}`} />
                      {label}
                    </button>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-[var(--border)] shrink-0 space-y-1">
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--surface-2)] cursor-pointer" onClick={() => navigate('/settings')}>
                  <div className="w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">{initials}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text)] truncate">{user.full_name}</p>
                    <p className="text-[10px] text-[var(--text-faint)] truncate capitalize">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sidebar-nav-item text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Logout
                </button>
              </div>
          </div>
        </div>
      )}
    </>
  );
}
