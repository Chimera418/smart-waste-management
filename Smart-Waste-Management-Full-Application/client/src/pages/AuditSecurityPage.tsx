import { useEffect, useState } from 'react';
import api from '../services/api';

export function AuditSecurityPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/audit-logs').then((res) => setLogs(res.data.data || []));
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Security & Audit Logs</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l._id}>
                <td className="px-4 py-3 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{l.actorEmail || 'system'} ({l.actorRole})</td>
                <td className="px-4 py-3 font-mono font-semibold">{l.action}</td>
                <td className="px-4 py-3">{l.resourceType}</td>
                <td className="px-4 py-3 capitalize">{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
