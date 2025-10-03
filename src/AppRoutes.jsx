import React from 'react'
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom'

function Dashboard() {
  return <div style={{ padding: 24 }}>✅ Deployed! — SentinelSky Dashboard</div>
}

function Reports() {
  return <div style={{ padding: 24 }}>📋 Reports placeholder</div>
}

export default function AppRoutes() {
  return (
    <HashRouter>
      <nav style={{ background: '#111', color: '#fff', padding: '10px 16px', display: 'flex', gap: 12 }}>
        <Link to="/" style={{ color: '#fff' }}>Home</Link>
        <Link to="/dashboard" style={{ color: '#fff' }}>Dashboard</Link>
        <Link to="/reports" style={{ color: '#fff' }}>Reports</Link>
      </nav>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<div>Not found</div>} />
        </Routes>
      </div>
    </HashRouter>
  )
}
