import React from 'react';
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './hooks/useAuth.jsx';
import UserCredentials from './components/UserCredentials.jsx';
import OrgInfo from './components/OrgInfo.jsx';
import CreateOrg from './components/CreateOrg.jsx';
import InviteUser from './components/InviteUser.jsx';
import OrgManagement from './components/OrgManagement.jsx';
import FlightPlanner from './components/FlightPlanner.jsx';

/* ---------------------------
   Top Navigation
---------------------------- */
function TopNav() {
  const { user, login, logout, profile } = useAuth();

  return (
    <nav
      style={{
        background: '#111',
        color: '#fff',
        padding: '10px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}
    >
      <Link to="/" style={{ color: '#fff', fontWeight: 600 }}>
        SentinelSky
      </Link>
      <Link to="/dashboard" style={{ color: '#fff' }}>
        Dashboard
      </Link>
      <Link to="/reports" style={{ color: '#fff' }}>
        Reports
      </Link>
      <Link to="/plan-flight" style={{ color: '#fff' }}>
        Plan Flight
      </Link>

      {profile?.role === 'orgAdmin' && (
        <>
          <Link to="/org-info" style={{ color: '#fff' }}>
            Org Info
          </Link>
          <Link to="/org-management" style={{ color: '#fff' }}>
            Org Management
          </Link>
        </>
      )}

      {profile?.role === 'superAdmin' && (
        <Link to="/create-org" style={{ color: '#fff' }}>
          Create Org
        </Link>
      )}

      <div style={{ marginLeft: 'auto' }}>
        {user ? (
          <button
            onClick={logout}
            style={{
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              padding: '6px 10px',
              borderRadius: 4
            }}
          >
            Logout
          </button>
        ) : (
          <button
            onClick={login}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '6px 10px',
              borderRadius: 4
            }}
          >
            Login
          </button>
        )}
      </div>

      {profile?.expiryWarning && (
        <div
          style={{
            background: '#fef9c3',
            color: '#92400e',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 13,
            marginLeft: 12,
            fontWeight: 600
          }}
        >
          ⚠️ Org subscription expires in {profile.expiryWarning} days
        </div>
      )}
    </nav>
  );
}

/* ---------------------------
   Pages
---------------------------- */
function Dashboard() {
  const { profile } = useAuth();

  if (profile?.expired) {
    return (
      <div style={{ padding: 24, color: '#991b1b' }}>
        ❌ Your organisation’s subscription has expired.
        <br />
        Please contact your administrator.
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>
        📋 Dashboard
      </h2>

      {profile?.expiryWarning && (
        <div
          style={{
            background: '#fef9c3',
            color: '#92400e',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 12,
            fontWeight: 600
          }}
        >
          ⚠️ Subscription expires in {profile.expiryWarning} days
        </div>
      )}

      {profile?.orgId && (
        <div style={{ marginBottom: 12, fontSize: 14, color: '#374151' }}>
          Organisation ID: <strong>{profile.orgId}</strong>
        </div>
      )}

      <UserCredentials />
    </div>
  );
}

function Reports() {
  const { profile } = useAuth();

  if (profile?.expired) {
    return (
      <div style={{ padding: 24, color: '#991b1b' }}>
        ❌ Cannot access reports — organisation subscription expired.
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>
        📊 Reports
      </h2>
      <p>This is a placeholder for organisation and flight reports.</p>
    </div>
  );
}

/* ---------------------------
   Routes
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
          <Route path="/plan-flight" element={<FlightPlanner />} />
          <Route path="/org-info" element={<OrgInfo />} />
          <Route path="/org-management" element={<OrgManagement />} />
          <Route path="/invite-user" element={<InviteUser />} />
          <Route path="/create-org" element={<CreateOrg />} />
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
