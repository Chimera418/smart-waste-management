import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bot, FilePlus2, MapPin } from 'lucide-react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export function CitizenDashboardPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);

  useEffect(() => {
    api.get('/complaints?limit=10').then((res) => setComplaints(res.data.data || []));
  }, []);

  const active = complaints.filter((c) => !['resolved', 'rejected'].includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E0D5] pb-5">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
            Citizen Portal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#141917]">Welcome back, {user?.name}</h1>
          <p className="mt-1 text-sm text-[#5C6460]">
            Report municipal waste issues in plain language and follow assigned vehicles live.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/chatbot" className="civic-btn-secondary">
            <Bot className="h-4 w-4 text-[#14533C]" />
            Waste Assistant
          </Link>
          <Link to="/complaints/new" className="civic-btn-primary">
            <FilePlus2 className="h-4 w-4" />
            Report Issue
          </Link>
        </div>
      </div>

      {/* Unified Hairline Metric Bar */}
      <div className="civic-card grid divide-y divide-[#E2E0D5] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78807B]">
            Total Submitted
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#141917] tabular-nums">
            {complaints.length}
          </p>
          <p className="mt-1 text-xs text-[#78807B]">All logged reports</p>
        </div>
        <div className="p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78807B]">
            Active / In Progress
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#B45309] tabular-nums">{active}</p>
          <p className="mt-1 text-xs text-[#78807B]">Awaiting or undergoing pickup</p>
        </div>
        <div className="p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78807B]">
            Resolved
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#14533C] tabular-nums">{resolved}</p>
          <p className="mt-1 text-xs text-[#78807B]">Cleared & verified</p>
        </div>
      </div>

      <div className="civic-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E2E0D5] bg-[#FAF9F6] px-5 py-3.5">
          <h2 className="text-sm font-bold text-[#141917]">Recent Reports</h2>
          <Link
            to="/complaints"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#14533C] hover:underline"
          >
            Track live on map <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-[#EFECE4]">
          {complaints.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-[#141917]">No reports filed yet</p>
              <p className="mt-1 text-xs text-[#5C6460]">
                Submit your first waste report or chat with the Waste Assistant to log one quickly.
              </p>
              <Link to="/complaints/new" className="civic-btn-primary mt-4">
                <FilePlus2 className="h-4 w-4" /> File a Report
              </Link>
            </div>
          ) : (
            complaints.slice(0, 6).map((c) => (
              <Link
                key={c._id}
                to="/complaints"
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-[#FAF9F6]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#14533C]">{c.complaintCode}</span>
                    <span className="truncate text-sm font-semibold text-[#141917]">{c.title}</span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[#5C6460]">
                    <MapPin className="h-3 w-3 shrink-0 text-[#8A918C]" />
                    <span className="truncate">{c.address}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={c.priority} />
                  <StatusBadge value={c.status} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
