import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { SubmitComplaintPage } from './pages/SubmitComplaintPage';
import { ComplaintsHistoryPage } from './pages/ComplaintsHistoryPage';
import { ChatbotPage } from './pages/ChatbotPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading CivicClean...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <AppShell>
      <Routes>
        <Route path="/dashboard" element={<CitizenDashboardPage />} />
        <Route path="/complaints/new" element={<SubmitComplaintPage />} />
        <Route path="/complaints" element={<ComplaintsHistoryPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
