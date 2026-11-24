import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, Clock, FilePlus2, FileWarning } from 'lucide-react';
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h1>
          <p className="text-sm text-slate-600">Report waste issues in plain text and track cleanup progress live.</p>
        </div>
        <div className="flex gap-2.5">
          <Link
            to="/chatbot"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Bot className="h-4 w-4 text-teal-600" />
            Waste Assistant
          </Link>
          <Link
            to="/complaints/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <FilePlus2 className="h-4 w-4" />
            Submit Complaint
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>TOTAL SUBMITTED</span>
            <FileWarning className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-3xl font-bold">{complaints.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>IN PROGRESS / OPEN</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-bold">{active}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>RESOLVED</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold">{resolved}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold">Recent Complaints</h2>
          <Link to="/complaints" className="text-xs font-semibold text-teal-700 hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {complaints.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No complaints submitted yet.</div>
          ) : (
            complaints.slice(0, 6).map((c) => (
              <div key={c._id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                <div>
                  <span className="font-mono text-xs font-semibold text-slate-500">{c.complaintCode}</span>{' '}
                  <span className="text-sm font-semibold text-slate-900">{c.title}</span>
                  <p className="text-xs text-slate-500">{c.address}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge value={c.priority} />
                  <StatusBadge value={c.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
