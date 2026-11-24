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
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E0D5] pb-5">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
            Governance
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#141917]">User Directory & Reports</h1>
          <p className="mt-1 text-sm text-[#5C6460]">
            Manage municipal portal accounts and export full operational CSV records.
          </p>
        </div>
        <button onClick={downloadCsv} className="civic-btn-primary">
          <Download className="h-4 w-4" /> Export CSV Report
        </button>
      </div>

      <div className="civic-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E2E0D5] bg-[#FAF9F6] font-mono text-[10px] uppercase tracking-wider text-[#5C6460]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFECE4]">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-[#FAF9F6]/70">
                <td className="px-4 py-3 font-semibold text-[#141917]">{u.name}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-[#5C6460]">{u.email}</td>
                <td className="px-4 py-3 capitalize text-[#141917]">{u.role.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      u.isActive
                        ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]'
                        : 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-[#059669]' : 'bg-[#DC2626]'}`} />
                    {u.isActive ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(u)}
                    className="rounded-md border border-[#D5D2C6] bg-white px-2.5 py-1 text-xs font-semibold text-[#141917] hover:bg-[#F5F4EF]"
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
