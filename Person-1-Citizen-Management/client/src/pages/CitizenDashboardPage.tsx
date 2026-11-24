import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, Clock, FilePlus2, FileWarning } from 'lucide-react';
import api from '../services/api';
import type { Complaint } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export function CitizenDashboardPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/complaints?limit=10')
      .then((res) => setComplaints(res.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const total = complaints.length;
  const active = complaints.filter((c) => !['resolved', 'rejected'].includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h1>
          <p className="text-sm text-slate-600">
            Track your waste reports, check AI categorization insights, or ask our civic assistant.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            to="/chatbot"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Bot className="h-4 w-4 text-teal-600" />
            Ask AI Assistant
          </Link>
          <Link
            to="/complaints/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <FilePlus2 className="h-4 w-4" />
            New Complaint
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase">Total Submitted</span>
            <FileWarning className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase">Active / Pending</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{active}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase">Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{resolved}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Recent Complaints</h2>
          <Link to="/complaints" className="text-xs font-semibold text-teal-700 hover:underline">
            View all history
          </Link>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading your complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-600">You have not filed any waste complaints yet.</p>
            <Link
              to="/complaints/new"
              className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline"
            >
              Submit your first complaint
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.slice(0, 5).map((item) => (
              <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {item.complaintCode}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.address} · Category: <span className="capitalize">{item.wasteCategory}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={item.priority} />
                  <StatusBadge value={item.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
