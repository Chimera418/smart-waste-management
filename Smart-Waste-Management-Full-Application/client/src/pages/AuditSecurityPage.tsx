import { useEffect, useState } from 'react';
import api from '../services/api';

export function AuditSecurityPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/audit-logs').then((res) => setLogs(res.data.data || []));
  }, []);

  return (
    <div className="space-y-5">
      <div className="border-b border-[#E2E0D5] pb-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
          Governance
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#141917]">Security & Audit Trail</h1>
        <p className="mt-1 text-sm text-[#5C6460]">
          Immutable log of authentication, role checks, dispatch overrides, and report exports.
        </p>
      </div>

      <div className="civic-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E2E0D5] bg-[#FAF9F6] font-mono text-[10px] uppercase tracking-wider text-[#5C6460]">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFECE4]">
            {logs.map((l) => (
              <tr key={l._id} className="hover:bg-[#FAF9F6]/70">
                <td className="px-4 py-3 font-mono text-[11px] text-[#5C6460] tabular-nums">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-[#141917]">
                  {l.actorEmail || 'system'}{' '}
                  <span className="font-mono text-[10px] uppercase text-[#78807B]">({l.actorRole})</span>
                </td>
                <td className="px-4 py-3 font-mono font-semibold text-[#14533C]">{l.action}</td>
                <td className="px-4 py-3 capitalize text-[#5C6460]">{l.resourceType}</td>
                <td className="px-4 py-3 capitalize font-medium text-[#141917]">{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
