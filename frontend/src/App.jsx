import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { RoleProvider, useRole } from './context/RoleContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/StudentDashboard';
import RecruiterDashboard from './pages/RecruiterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import { RefreshCw } from 'lucide-react';

// A layout wrapper for protected dashboards
function DashboardLayout() {
  const { activeRole, loading, isAuthenticated } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (loading) return;
    const currentTab = searchParams.get('tab');
    if (activeRole === 'student') {
      const valid = ['resumes', 'jobs', 'history'];
      if (!currentTab || !valid.includes(currentTab)) {
        setSearchParams({ tab: 'resumes' }, { replace: true });
      }
    } else if (activeRole === 'recruiter') {
      const valid = ['jobs', 'post-job', 'analytics'];
      if (!currentTab || !valid.includes(currentTab)) {
        setSearchParams({ tab: 'jobs' }, { replace: true });
      }
    } else if (activeRole === 'admin') {
      const valid = ['stats', 'users'];
      if (!currentTab || !valid.includes(currentTab)) {
        setSearchParams({ tab: 'stats' }, { replace: true });
      }
    }
  }, [activeRole, searchParams, setSearchParams, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-2">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading Workspace Profiles...</span>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Choose the dashboard page based on active simulated role
  const renderActiveDashboard = () => {
    switch (activeRole) {
      case 'student':
        return <StudentDashboard />;
      case 'recruiter':
        return <RecruiterDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <StudentDashboard />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
          {renderActiveDashboard()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <RoleProvider>
        <Routes>
          {/* Landing Portal */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Authentication Portal */}
          <Route path="/login" element={<Login />} />
          
          {/* Password Reset Link */}
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Dashboard Portal (switches dashboard components dynamically) */}
          <Route path="/dashboard" element={<DashboardLayout />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RoleProvider>
    </Router>
  );
}
