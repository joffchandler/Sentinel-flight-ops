import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function Dashboard() {
  return <div style={{ padding: 24, fontFamily: 'system-ui' }}>✅ Deployed! — SentinelSky Dashboard</div>;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<div style={{padding:24}}>Not found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
