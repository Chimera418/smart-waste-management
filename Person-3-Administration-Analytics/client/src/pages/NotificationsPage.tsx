import { useEffect, useState } from 'react';
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
        <h1 className="text-2xl font-bold text-slate-900">Admin Alerts & Notifications</h1>
        <button
          onClick={async () => {
            await api.patch('/notifications/read-all');
            load();
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
        >
          Mark all read
        </button>
      </div>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No alerts yet.</div>
        ) : (
          items.map((n) => (
            <div key={n._id} className="p-4">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-xs text-slate-600">{n.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
