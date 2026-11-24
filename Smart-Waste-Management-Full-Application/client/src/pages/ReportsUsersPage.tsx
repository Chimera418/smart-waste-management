import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import api from '../services/api';

export function ReportsUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const load = () => api.get('/admin/users').then((res) => setUsers(res.data.data || []));
  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (u: any) => {
    await api.patch(`/admin/users/${u._id}/status`, { isActive: !u.isActive });
    load();
  };

  const downloadCsv = async () => {
    const res = await api.get('/admin/reports/export?format=csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'civicclean-full-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">User Directory & CSV Reports</h1>
        <button
          onClick={downloadCsv}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Download className="h-4 w-4" /> Export CSV Report
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u._id}>
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role.replace('_', ' ')}</td>
                <td className="px-4 py-3">{u.isActive ? 'Active' : 'Suspended'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(u)}
                    className="rounded border border-slate-300 px-2.5 py-1 hover:bg-slate-50"
                  >
                    {u.isActive ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
