import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../services/api';

export function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => api.get('/notifications').then((res) => setItems(res.data.data.items || []));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <button
          onClick={async () => {
            await api.patch('/notifications/read-all');
            load();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
        >
          <CheckCheck className="h-4 w-4 text-teal-600" /> Mark all read
        </button>
      </div>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No notifications yet.</div>
        ) : (
          items.map((n) => (
            <div key={n._id} className={`flex items-start justify-between gap-4 p-4 ${n.isRead ? '' : 'bg-teal-50/40'}`}>
              <div className="flex items-start gap-3">
                <Bell className={`mt-0.5 h-4 w-4 ${n.isRead ? 'text-slate-400' : 'text-teal-600'}`} />
                <div>
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-slate-600">{n.message}</p>
                </div>
              </div>
              {!n.isRead && (
                <button
                  onClick={async () => {
                    await api.patch(`/notifications/${n._id}/read`);
                    load();
                  }}
                  className="rounded border border-teal-200 px-2.5 py-1 text-xs font-semibold text-teal-700"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
