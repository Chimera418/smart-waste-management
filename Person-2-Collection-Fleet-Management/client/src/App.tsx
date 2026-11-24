import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { WorkerDashboardPage } from './pages/WorkerDashboardPage';
import { OperatorDashboardPage } from './pages/OperatorDashboardPage';
import { FleetManagementPage } from './pages/FleetManagementPage';
import { TaskAllocationPage } from './pages/TaskAllocationPage';
import { ZonesPage } from './pages/ZonesPage';
import { LiveTrackingMapPage } from './pages/LiveTrackingMapPage';

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppShell>
      <Routes>
        <Route path="/worker" element={<WorkerDashboardPage />} />
        <Route path="/operator" element={<OperatorDashboardPage />} />
        <Route path="/tasks" element={<TaskAllocationPage />} />
        <Route path="/fleet" element={<FleetManagementPage />} />
        <Route path="/zones" element={<ZonesPage />} />
        <Route path="/tracking" element={<LiveTrackingMapPage />} />
        <Route path="*" element={<Navigate to="/tracking" replace />} />
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
