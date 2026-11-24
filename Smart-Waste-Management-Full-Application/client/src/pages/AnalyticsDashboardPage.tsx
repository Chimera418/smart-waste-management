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

  useEffect(() => {
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/analytics/trends'),
      api.get('/analytics/zones'),
      api.get('/analytics/fleet')
    ]).then(([s, t, z, f]) => {
      setSummary(s.data.data);
      setTrends(t.data.data);
      setZones(z.data.data);
      setFleet(f.data.data);
    });
  }, []);

  if (!summary) return <div className="p-6 text-sm text-slate-500">Running MongoDB aggregations...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard (Recharts + MongoDB)</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Waste Generation Trends</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="complaints" stroke="#0f766e" fill="#99f6e4" />
                <Area type="monotone" dataKey="resolved" stroke="#4f46e5" fill="#c7d2fe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Waste Categories</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.byCategory} dataKey="count" nameKey="category" outerRadius={88} label>
                  {summary.byCategory.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Zone Performance</h2>
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
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Fleet Completed Trips</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fleet}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="registrationNumber" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="completedTrips" fill="#0284c7" name="Trips" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
