import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Menu, Moon, Search, Sun } from 'lucide-react';
import type { AppNotification, UserProfile } from '../types/orbit.ts';
import { Avatar } from './Avatar.tsx';
import type { WorkspaceView } from './Sidebar.tsx';

interface TopBarProps {
  breadcrumb: string;
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  notifications: AppNotification[];
  profile: UserProfile;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenMobileMenu: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (view: WorkspaceView, projectId?: string | null, taskId?: string | null) => void;
}

export function TopBar({
  breadcrumb,
  globalSearch,
  onGlobalSearchChange,
  notifications,
  profile,
  darkMode,
  onToggleDarkMode,
  onOpenMobileMenu,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
      {/* Left: Mobile Trigger + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate font-display">
          {breadcrumb}
        </h1>
      </div>

      {/* Center/Right: Search + Controls */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={globalSearch}
            onChange={(e) => onGlobalSearchChange(e.target.value)}
            placeholder="Search projects or tasks..."
            aria-label="Global search"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/25 focus:border-emerald-700"
          />
        </div>

        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Bell Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="Notifications"
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-md bg-emerald-700 text-white text-[10px] font-mono tabular-nums font-semibold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-40 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    No notifications yet. Events such as task assignments and comments will appear here.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        if (!n.read) onMarkRead(n.id);
                        setNotifOpen(false);
                        onNavigate('project_detail', n.projectId, n.taskId || null);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                        !n.read ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                    </button>
                  ))
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    onNavigate('notifications');
                  }}
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  Open notification center
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Button */}
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Avatar name={profile.displayName} color={profile.avatarColor} size="sm" />
          <span className="hidden sm:inline text-xs font-medium text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
            {profile.displayName}
          </span>
        </button>
      </div>
    </header>
  );
}
