import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { toMillis } from '../lib/workspaceLogic.ts';
import type { AppNotification } from '../types/orbit.ts';

interface NotificationsViewProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenNotification: (notification: AppNotification) => void;
}

export function NotificationsView({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onOpenNotification,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const sorted = [...notifications].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  const displayed = filter === 'unread' ? sorted.filter((n) => !n.read) : sorted;
  const unreadCount = sorted.filter((n) => !n.read).length;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white font-display">Notification Center</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
            {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'unread'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Unread
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {displayed.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Bell className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time alerts are generated when tasks are assigned, updated, or commented on.
            </p>
          </div>
        ) : (
          displayed.map((n) => {
            const ms = toMillis(n.createdAt);
            return (
              <div
                key={n.id}
                className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  !n.read ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpenNotification(n)}
                  className="text-left min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</span>
                    {!n.read && (
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Unread</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                  <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-1.5">
                    {ms ? new Date(ms).toLocaleString() : 'Just now'}
                  </p>
                </button>

                {!n.read && (
                  <button
                    type="button"
                    onClick={() => onMarkRead(n.id)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
