import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../services/api';
import type { Complaint } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export function ComplaintsHistoryPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/complaints?${params.toString()}`);
      setComplaints(res.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Complaint History & Status Tracking</h1>
        <p className="text-sm text-slate-600">
          Inspect full status timelines, AI categorization results, and duplicate flags.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadComplaints()}
            placeholder="Search by code, title, or address..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <button
          onClick={loadComplaints}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Filter
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs lg:col-span-7">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading complaints...</div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No complaints match your filter.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelected(c)}
                  className={`flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${
                    selected?._id === c._id ? 'bg-teal-50/50' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        {c.complaintCode}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{c.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-600">{c.description}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {c.address} · {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge value={c.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a complaint on the left to view full tracking details.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-teal-700">
                  {selected.complaintCode}
                </span>
                <StatusBadge value={selected.status} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
              <p className="text-sm text-slate-700">{selected.description}</p>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs">
                <div>
                  <span className="text-slate-500">Category:</span>{' '}
                  <strong className="capitalize">{selected.wasteCategory}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Priority:</span>{' '}
                  <strong className="capitalize">{selected.priority}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Address:</span> {selected.address}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status Timeline
                </h3>
                <ol className="space-y-2 border-l-2 border-teal-200 pl-3 text-xs">
                  {selected.statusHistory.map((step, idx) => (
                    <li key={idx}>
                      <span className="font-semibold capitalize text-slate-900">
                        {step.status.replace(/_/g, ' ')}
                      </span>{' '}
                      <span className="text-slate-400">
                        · {new Date(step.changedAt).toLocaleString()}
                      </span>
                      {step.note && <p className="text-slate-600">{step.note}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
