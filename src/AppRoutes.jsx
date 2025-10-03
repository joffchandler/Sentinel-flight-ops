import React from 'react';
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './hooks/useAuth.jsx';

/* ---------------------------
   Top Navigation
---------------------------- */
function TopNav() {
  const { user, login, logout } = useAuth();

  return (
    <nav style={{
      background: '#111', color: '#fff', padding: '10px 16px',
      display: 'flex', gap: 12, alignItems: 'center'
    }}>
      <Link to="/" style={{ color: '#fff', fontWeight: 600 }}>SentinelSky</Link>
      <Link to="/dashboard" style={{ color: '#fff' }}>Dashboard</Link>
      <Link to="/reports" style={{ color: '#fff' }}>Reports</Link>

      <div style={{ marginLeft: 'auto' }}>
        {user ? (
          <button
            onClick={logout}
            style={{ background: '#dc2626', color: '#fff', border: 'none',
                     padding: '6px 10px', borderRadius: 4 }}
          >
            Logout
          </button>
        ) : (
          <button
            onClick={login}
            style={{ background: '#2563eb', color: '#fff', border: 'none',
                     padding: '6px 10px', borderRadius: 4 }}
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}

/* ---------------------------
   Dummy Pages
---------------------------- */
function Dashboard() {
  return <div style={{ padding: 24 }}>📋 Dashboard page (signed in users will see more here later)</div>;
}

function Reports() {
  return <div style={{ padding: 24 }}>📊 Reports placeholder</div>;
}

/* ---------------------------
   App Routes
---------------------------- */
function RoutesInner() {
  return (
    <HashRouter>
      <TopNav />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<div>Not found</div>} />
        </Routes>
      </div>
    </HashRouter>
  );
}

/* ---------------------------
   Default Export
---------------------------- */
export default function AppRoutes() {
  return (
    <AuthProvider>
      <RoutesInner />
    </AuthProvider>
  );
}
