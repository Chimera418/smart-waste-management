import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ClipboardCheck, Map, ShieldAlert } from 'lucide-react';
import api from '../services/api';

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<any | null>(null);

  useEffect(() => {
    api.get('/admin/overview').then((res) => setOverview(res.data.data));
  }, []);

  if (!overview) {
    return (
      <div className="civic-card p-8 text-sm text-[#5C6460]">Loading operations overview...</div>
    );
  }

  const { summary, usersByRole, zonesCount, recentEscalations } = overview;

  const metrics = [
    {
      label: 'Total Reports',
      value: summary.totalComplaints,
      note: 'All municipal wards',
      accent: 'text-[#141917]'
    },
    {
      label: 'Collection Efficiency',
      value: `${summary.collectionEfficiencyPct}%`,
      note: 'Resolved vs logged',
      accent: 'text-[#14533C]'
    },
    {
      label: 'SLA Compliance',
      value: `${summary.slaCompliancePct}%`,
      note: 'Within deadline target',
      accent: 'text-[#1D4ED8]'
    },
    {
      label: 'Open Escalations',
      value: summary.openEscalations,
      note: 'Requires dispatch review',
      accent: summary.openEscalations > 0 ? 'text-[#B91C1C]' : 'text-[#141917]'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E0D5] pb-5">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
            Municipal Control
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#141917]">Command Center</h1>
          <p className="mt-1 text-sm text-[#5C6460]">
            Unified oversight across citizen reports, field crews, fleet telemetry, and ward SLAs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/tracking" className="civic-btn-secondary">
            <Map className="h-4 w-4 text-[#14533C]" />
            Live Fleet Map
          </Link>
          <Link to="/admin/dispatch" className="civic-btn-primary">
            <ClipboardCheck className="h-4 w-4" />
            Open Dispatch Queue
          </Link>
        </div>
      </div>

      {/* Unified Hairline Metric Strip */}
      <div className="civic-card grid divide-y divide-[#E2E0D5] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {metrics.map((m) => (
          <div key={m.label} className="p-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78807B]">
              {m.label}
            </p>
            <p className={`mt-2 font-display text-3xl font-extrabold tabular-nums ${m.accent}`}>
              {m.value}
            </p>
            <p className="mt-1 text-xs text-[#78807B]">{m.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="civic-card p-5 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#141917]">Active Network Directory</h2>
            <Link
              to="/reports"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#14533C] hover:underline"
            >
              Manage users <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Registered Citizens', value: usersByRole.citizen || 0 },
              { label: 'Sanitation Workers', value: usersByRole.worker || 0 },
              { label: 'Vehicle Operators', value: usersByRole.vehicle_operator || 0 },
              { label: 'Active Ward Zones', value: zonesCount }
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-lg border border-[#E2E0D5] bg-[#FAF9F6] px-4 py-3"
              >
                <p className="text-xs text-[#5C6460]">{row.label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#141917] tabular-nums">
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="civic-card p-5 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#141917]">
              <ShieldAlert className="h-4 w-4 text-[#B91C1C]" />
              Recent SLA Escalations
            </h2>
            <Link
              to="/escalations"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#14533C] hover:underline"
            >
              View SLA log <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentEscalations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#D5D2C6] bg-[#FAF9F6] p-6 text-center text-xs text-[#5C6460]">
              All active complaints are currently within SLA compliance thresholds.
            </div>
          ) : (
            <div className="divide-y divide-[#EFECE4] rounded-lg border border-[#E2E0D5]">
              {recentEscalations.slice(0, 5).map((e: any) => (
                <div key={e._id} className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                  <div>
                    <span className="font-mono font-semibold text-[#141917]">{e.complaintCode}</span>
                    <span className="ml-2 text-[#5C6460]">
                      {e.previousPriority} → <strong className="uppercase text-[#B91C1C]">{e.newPriority}</strong>
                    </span>
                  </div>
                  <span className="rounded bg-[#FEF2F2] px-2 py-0.5 font-mono text-[10px] font-bold text-[#991B1B]">
                    LEVEL {e.escalationLevel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
