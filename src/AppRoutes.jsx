import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

function TopNav() {
  return (
    <nav style={{background:'#111', color:'#fff', padding:'10px 16px', display:'flex', gap:12}}>
      <Link to="/" style={{color:'#fff', textDecoration:'none', fontWeight:600}}>SentinelSky</Link>
      <Link to="/dashboard" style={{color:'#fff'}}>My Dashboard</Link>
      <Link to="/org/reports" style={{color:'#fff'}}>Org Reports</Link>
    </nav>
  );
}

function Dashboard() { return <div style={{padding:24}}>✅ Deployed! — Dashboard (authed shell)</div>; }
function OrgReports() { return <div style={{padding:24}}>Org Reports (placeholder)</div>; }

export default function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TopNav />
        <div style={{maxWidth:900, margin:'0 auto', padding:16}}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/org/reports" element={<OrgReports />} />
            <Route path="*" element={<div style={{padding:24}}>Not found</div>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
