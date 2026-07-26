'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Coins } from 'lucide-react';
import { AppNotification } from '@/types';
import { formatEur, formatCrypto, relativeTime } from '@/lib/format';
import { clsx } from 'clsx';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string, isRead: boolean) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: isRead } : n)));
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: isRead }),
    });
  }

  async function remove(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-vault-100">Notifications</h1>
          <p className="text-sm text-vault-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 text-xs text-brass-400 border border-brass-500/30 bg-brass-500/10 px-3 py-2 rounded-lg hover:bg-brass-500/15"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </header>

      <div className="panel panel-noise divide-y divide-vault-800">
        {loading ? (
          <div className="text-sm text-vault-500 py-12 text-center">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-8 h-8 text-vault-600 mx-auto mb-3" />
            <div className="text-sm text-vault-300 font-medium">No notifications yet</div>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={clsx('flex items-start gap-3 p-4', !n.is_read && 'bg-brass-500/[0.03]')}
            >
              <div
                className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  n.type === 'sync_error' ? 'bg-garnet-500/15 text-garnet-400' : 'bg-emerald-400/15 text-emerald-400'
                )}
              >
                {n.type === 'sync_error' ? <AlertTriangle className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-vault-100">{n.message}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-vault-500">{relativeTime(n.created_at)}</span>
                  {n.eur_value != null && (
                    <span className="text-xs text-vault-500 mono-num">{formatEur(n.eur_value)}</span>
                  )}
                  {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-brass-400" />}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.is_read && (
                  <button onClick={() => markRead(n.id, true)} className="p-1.5 text-vault-500 hover:text-emerald-400" title="Mark as read">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => remove(n.id)} className="p-1.5 text-vault-500 hover:text-garnet-400" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
