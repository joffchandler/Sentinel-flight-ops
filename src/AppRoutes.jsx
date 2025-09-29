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
   USER CREDENTIALS PANEL
   ========================= */
function UserCredentials() {
  const { user, profile } = useAuth();
  const [pilotId, setPilotId] = useState(profile?.pilotId || '');
  const [pilotExpiry, setPilotExpiry] = useState(profile?.pilotExpiry || '');
  const [pilotCert, setPilotCert] = useState(profile?.pilotCert || 'non'); // non | a2coc | gvc
  const [operatorId, setOperatorId] = useState(profile?.operatorId || '');
  const [operatorExpiry, setOperatorExpiry] = useState(profile?.operatorExpiry || '');
  const [orgOperatorId, setOrgOperatorId] = useState(profile?.orgOperatorId || '');
  const [orgOperatorExpiry, setOrgOperatorExpiry] = useState(profile?.orgOperatorExpiry || '');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setPilotId(profile?.pilotId || '');
    setPilotExpiry(profile?.pilotExpiry || '');
    setPilotCert(profile?.pilotCert || 'non');
    setOperatorId(profile?.operatorId || '');
    setOperatorExpiry(profile?.operatorExpiry || '');
    setOrgOperatorId(profile?.orgOperatorId || '');
    setOrgOperatorExpiry(profile?.orgOperatorExpiry || '');
  }, [profile]);

  const save = async () => {
    if (!user) return;
    await setDoc(doc(db, 'users
