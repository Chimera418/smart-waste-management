import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../services/api';

const PIE_COLORS = ['#0f766e', '#4f46e5', '#0284c7', '#d97706', '#dc2626', '#7c3aed'];

export function AnalyticsDashboardPage() {
  const [summary, setSummary] = useState<any | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/analytics/trends'),
      api.get('/analytics/zones'),
      api.get('/analytics/fleet'),
      api.get('/analytics/workers')
    ]).then(([s, t, z, f, w]) => {
      setSummary(s.data.data);
      setTrends(t.data.data);
      setZones(z.data.data);
      setFleet(f.data.data);
      setWorkers(w.data.data);
    });
  }, []);

  if (!summary) return <div className="p-6 text-sm text-slate-500">Aggregating MongoDB analytics...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Municipal Analytics Dashboard</h1>
        <p className="text-sm text-slate-600">
          Live Recharts visualizations powered by MongoDB aggregation pipelines.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Resolved / Pending</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {summary.resolvedComplaints} / {summary.pendingComplaints}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Avg Resolution Time</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{summary.avgResolutionHours} hrs</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Tasks Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {summary.completedTasks} / {summary.totalTasks}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Active Fleet / Workers</p>
          <p className="mt-1 text-2xl font-bold text-sky-700">
            {summary.totalVehicles} / {summary.totalWorkers}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Waste Generation & Resolution Trends</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="complaints" stroke="#4f46e5" fill="#c7d2fe" name="Reported" />
                <Area type="monotone" dataKey="resolved" stroke="#0f766e" fill="#99f6e4" name="Resolved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Complaints by Waste Category</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.byCategory} dataKey="count" nameKey="category" outerRadius={90} label>
                  {summary.byCategory.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Zone-Wise Statistics</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zones}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="totalComplaints" fill="#4f46e5" name="Complaints" />
                <Bar dataKey="resolvedComplaints" fill="#10b981" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Fleet Utilization & Worker Workload</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fleet.length ? fleet : workers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={fleet.length ? 'registrationNumber' : 'employeeCode'} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey={fleet.length ? 'completedTrips' : 'completedTasksCount'}
                  fill="#0284c7"
                  name={fleet.length ? 'Completed Trips' : 'Completed Tasks'}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
