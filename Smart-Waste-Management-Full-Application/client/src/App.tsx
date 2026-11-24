import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { SubmitComplaintPage } from './pages/SubmitComplaintPage';
import { ComplaintsHistoryPage } from './pages/ComplaintsHistoryPage';
import { ChatbotPage } from './pages/ChatbotPage';
import { WorkerDashboardPage } from './pages/WorkerDashboardPage';
import { OperatorDashboardPage } from './pages/OperatorDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminDispatchPage } from './pages/AdminDispatchPage';
import { FleetAndWorkersPage } from './pages/FleetAndWorkersPage';
import { ZonesPage } from './pages/ZonesPage';
import { LiveTrackingMapPage } from './pages/LiveTrackingMapPage';
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage';
import { HotspotMapPage } from './pages/HotspotMapPage';
import { EscalationsPage } from './pages/EscalationsPage';
import { AuditSecurityPage } from './pages/AuditSecurityPage';
import { ReportsUsersPage } from './pages/ReportsUsersPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';

function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'citizen') return <Navigate to="/citizen" replace />;
  if (user.role === 'worker') return <Navigate to="/worker" replace />;
  if (user.role === 'vehicle_operator') return <Navigate to="/operator" replace />;
  return <Navigate to="/admin" replace />;
}

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Loading CivicClean...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppShell>
      <Routes>
        <Route path="/citizen" element={<CitizenDashboardPage />} />
        <Route path="/complaints/new" element={<SubmitComplaintPage />} />
        <Route path="/complaints" element={<ComplaintsHistoryPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/worker" element={<WorkerDashboardPage />} />
        <Route path="/operator" element={<OperatorDashboardPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/dispatch" element={<AdminDispatchPage />} />
        <Route path="/fleet" element={<FleetAndWorkersPage />} />
        <Route path="/zones" element={<ZonesPage />} />
        <Route path="/tracking" element={<LiveTrackingMapPage />} />
        <Route path="/analytics" element={<AnalyticsDashboardPage />} />
        <Route path="/hotspots" element={<HotspotMapPage />} />
        <Route path="/escalations" element={<EscalationsPage />} />
        <Route path="/audit" element={<AuditSecurityPage />} />
        <Route path="/reports" element={<ReportsUsersPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<RoleHomeRedirect />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/*" element={<ProtectedShell />} />
    </Routes>
  );
}
