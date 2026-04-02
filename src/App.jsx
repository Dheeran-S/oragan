// src/App.jsx
// Main router — protected routes, role-based access, sidebar layout.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Layout/Sidebar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DonorManagement from './pages/DonorManagement';
import RecipientManagement from './pages/RecipientManagement';
import OrganManagement from './pages/OrganManagement';
import MatchingPage from './pages/MatchingPage';
import AllocationPage from './pages/AllocationPage';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
import HospitalManagement from './pages/HospitalManagement';
import SeedPage from './pages/SeedPage';

// ── Protected Route wrapper ──────────────────────────────────────────────────
function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-overlay" style={{height:'100vh'}}>
        <span className="loading-spinner" style={{width:28, height:28}}/>
        <span style={{color:'var(--slate)'}}>Loading…</span>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (adminOnly && userProfile?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
}

// ── App layout (with sidebar) ────────────────────────────────────────────────
function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

// ── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-overlay" style={{height:'100vh'}}>
        <span className="loading-spinner" style={{width:28,height:28}}/>
        <span style={{color:'var(--slate)'}}>Initializing…</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      {/* Protected — all authenticated users */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      }/>
      <Route path="/donors" element={
        <ProtectedRoute>
          <AppLayout><DonorManagement /></AppLayout>
        </ProtectedRoute>
      }/>
      <Route path="/recipients" element={
        <ProtectedRoute>
          <AppLayout><RecipientManagement /></AppLayout>
        </ProtectedRoute>
      }/>
      <Route path="/organs" element={
        <ProtectedRoute>
          <AppLayout><OrganManagement /></AppLayout>
        </ProtectedRoute>
      }/>
      <Route path="/matching" element={
        <ProtectedRoute>
          <AppLayout><MatchingPage /></AppLayout>
        </ProtectedRoute>
      }/>
      <Route path="/allocation" element={
        <ProtectedRoute>
          <AppLayout><AllocationPage /></AppLayout>
        </ProtectedRoute>
      }/>
      <Route path="/notifications" element={
        <ProtectedRoute>
          <AppLayout><Notifications /></AppLayout>
        </ProtectedRoute>
      }/>

      {/* Admin-only */}
      <Route path="/audit-logs" element={
        <ProtectedRoute adminOnly>
          <AppLayout><AuditLogs /></AppLayout>
        </ProtectedRoute>
      }/>
      <Route path="/hospitals" element={
        <ProtectedRoute adminOnly>
          <AppLayout><HospitalManagement /></AppLayout>
        </ProtectedRoute>
      }/>

      {/* Seed — PUBLIC utility (no auth required, needed before accounts exist) */}
      <Route path="/seed" element={<SeedPage />}/>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
