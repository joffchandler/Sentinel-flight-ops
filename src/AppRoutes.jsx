import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import { AuthProvider, useAuth } from './hooks/useAuth';
import { db } from './firebase';
import {
  collection, onSnapshot, query, orderBy, deleteDoc, doc, addDoc, updateDoc, getDoc,
  serverTimestamp, setDoc
} from 'firebase/firestore';

/* =========================
   NAV
   ========================= */
function TopNav() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  return (
    <nav className="w-full bg-gray-900 text-white px-4 py-3 flex items-center gap-4">
      <Link to="/" className="font-semibold">SentinelSky</Link>
      <Link to="/dashboard" className="hover:underline">My Dashboard</Link>
      {profile?.orgId && <Link to="/org/reports" className="hover:underline">Org Reports</Link>}
      {isAdmin && (
        <>
          <Link to="/org/users" className="hover:underline">Org Users</Link>
          <Link to="/settings/risk" className="hover:underline">Risk Settings</Link>
          <Link to="/admin" className="hover:underline">Admin Panel</Link>
        </>
      )}
      <span className="ml-auto text-xs text-gray-300">
        {profile?.orgName || profile?.orgId || 'No org'}
      </span>
    </nav>
  );
}

/* =========================
   SIMPLE DASHBOARD
   ========================= */
function RiskDashboard() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">📋 Risk Dashboard</h2>
      <p>This is a placeholder dashboard. Risk reports and planning tools will appear here.</p>
    </div>
  );
}

/* =========================
   PLACEHOLDERS
   ========================= */
function OrgReportsDashboard() { return <div className="p-4">Org Reports (placeholder)</div>; }
function OrgUserAdmin() { return <div className="p-4">Org Users (placeholder)</div>; }
function OrgRiskSettings() { return <div className="p-4">Risk Settings (placeholder)</div>; }
function AdminPanel() { return <div className="p-4">Admin Panel (placeholder)</div>; }

/* =========================
   APP ROUTES
   ========================= */
export default function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TopNav />
        <div className="max-w-6xl mx-auto p-4">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<RiskDashboard />} />
            <Route path="/org/reports" element={<OrgReportsDashboard />} />
            <Route path="/org/users" element={<OrgUserAdmin />} />
            <Route path="/settings/risk" element={<OrgRiskSettings />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<div className="p-6">Not found</div>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
