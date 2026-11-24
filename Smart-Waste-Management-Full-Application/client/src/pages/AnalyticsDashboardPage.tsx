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

const PIE_COLORS = ['#14533C', '#1D4ED8', '#B45309', '#4B5563', '#B91C1C', '#0F766E'];

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

  if (!summary) {
    return <div className="civic-card p-8 text-sm text-[#5C6460]">Loading operations metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E0D5] pb-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
          Performance Intelligence
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#141917]">Operations Analytics</h1>
        <p className="mt-1 text-sm text-[#5C6460]">
          Live municipal volume trends, category distribution, ward resolution rates, and fleet utilization.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="civic-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#141917]">Daily Report Volume & Resolution</h2>
            <span className="font-mono text-[10px] uppercase text-[#78807B]">Trend</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DC" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5C6460' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5C6460' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E0D5',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="complaints" stroke="#14533C" strokeWidth={2} fill="#14533C" fillOpacity={0.14} name="Filed" />
                <Area type="monotone" dataKey="resolved" stroke="#1D4ED8" strokeWidth={2} fill="#1D4ED8" fillOpacity={0.1} name="Resolved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="civic-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#141917]">Waste Category Breakdown</h2>
            <span className="font-mono text-[10px] uppercase text-[#78807B]">Share</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.byCategory}
                  dataKey="count"
                  nameKey="category"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  label
                >
                  {summary.byCategory.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E0D5',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="civic-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#141917]">Ward Zone Resolution</h2>
            <span className="font-mono text-[10px] uppercase text-[#78807B]">By Ward</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zones}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DC" vertical={false} />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#5C6460' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5C6460' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E0D5',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="totalComplaints" fill="#374151" radius={[4, 4, 0, 0]} name="Filed" />
                <Bar dataKey="resolvedComplaints" fill="#14533C" radius={[4, 4, 0, 0]} name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="civic-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#141917]">Fleet Completed Trips</h2>
            <span className="font-mono text-[10px] uppercase text-[#78807B]">Units</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fleet}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DC" vertical={false} />
                <XAxis dataKey="registrationNumber" tick={{ fontSize: 11, fill: '#5C6460' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5C6460' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E0D5',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="completedTrips" fill="#1D4ED8" radius={[4, 4, 0, 0]} name="Trips" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
