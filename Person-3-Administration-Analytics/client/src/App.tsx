import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ComplaintsMonitorPage } from './pages/ComplaintsMonitorPage';
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage';
import { HotspotMapPage } from './pages/HotspotMapPage';
import { EscalationsPage } from './pages/EscalationsPage';
import { AuditSecurityPage } from './pages/AuditSecurityPage';
import { ReportsUsersPage } from './pages/ReportsUsersPage';
import { NotificationsPage } from './pages/NotificationsPage';

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppShell>
      <Routes>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/complaints" element={<ComplaintsMonitorPage />} />
        <Route path="/analytics" element={<AnalyticsDashboardPage />} />
        <Route path="/hotspots" element={<HotspotMapPage />} />
        <Route path="/escalations" element={<EscalationsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/audit" element={<AuditSecurityPage />} />
        <Route path="/reports" element={<ReportsUsersPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedShell />} />
    </Routes>
  );
}
