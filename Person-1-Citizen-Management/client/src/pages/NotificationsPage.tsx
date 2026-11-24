import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../services/api';
import type { NotificationItem } from '../types';

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data.data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    load();
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-600">Status updates on your filed waste complaints.</p>
        </div>
        <button
          onClick={markAllRead}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <CheckCheck className="h-4 w-4 text-teal-600" />
          Mark all read
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((n) => (
              <div
                key={n._id}
                className={`flex items-start justify-between gap-4 px-5 py-4 ${
                  n.isRead ? 'bg-white' : 'bg-teal-50/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Bell className={`mt-0.5 h-4 w-4 ${n.isRead ? 'text-slate-400' : 'text-teal-600'}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markRead(n._id)}
                    className="rounded-md border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
