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
    await setDoc(doc(db, 'users', user.uid), {
      ...(profile || {}),
      pilotId, pilotExpiry, pilotCert,
      operatorId, operatorExpiry,
      orgOperatorId, orgOperatorExpiry
    }, { merge: true });
    setStatus('✅ Saved your credentials');
    setTimeout(() => setStatus(''), 1500);
  };

  const daysLeft = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-4 border rounded bg-white mb-6">
      <h3 className="font-semibold text-lg">👤 Pilot & Operator Credentials</h3>
      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <label className="text-sm">Pilot ID
          <input className="w-full border rounded px-2 py-1" value={pilotId} onChange={e=>setPilotId(e.target.value)} placeholder="GBR-RP-..." />
        </label>
        <label className="text-sm">Pilot Expiry
          <input type="date" className="w-full border rounded px-2 py-1" value={pilotExpiry} onChange={e=>setPilotExpiry(e.target.value)} />
        </label>
        <label className="text-sm">Pilot Certification
          <select className="w-full border rounded px-2 py-1" value={pilotCert} onChange={e=>setPilotCert(e.target.value)}>
            <option value="non">Non-certified</option>
            <option value="a2coc">A2 CofC</option>
            <option value="gvc">GVC</option>
          </select>
        </label>
        <label className="text-sm">Operator ID
          <input className="w-full border rounded px-2 py-1" value={operatorId} onChange={e=>setOperatorId(e.target.value)} placeholder="GBR-OP-..." />
        </label>
        <label className="text-sm">Operator Expiry
          <input type="date" className="w-full border rounded px-2 py-1" value={operatorExpiry} onChange={e=>setOperatorExpiry(e.target.value)} />
        </label>
        <label className="text-sm">Organisation Operator ID
          <input className="w-full border rounded px-2 py-1" value={orgOperatorId} onChange={e=>setOrgOperatorId(e.target.value)} placeholder="GBR-ORG-..." />
        </label>
        <label className="text-sm">Organisation Operator Expiry
          <input type="date" className="w-full border rounded px-2 py-1" value={orgOperatorExpiry} onChange={e=>setOrgOperatorExpiry(e.target.value)} />
        </label>
      </div>
      <div className="mt-2 text-sm">
        {pilotExpiry && <span className={`${daysLeft(pilotExpiry) < 14 ? 'text-red-600' : 'text-green-700'}`}>Pilot: {daysLeft(pilotExpiry)} days left</span>} {pilotExpiry && ' · '}
        {operatorExpiry && <span className={`${daysLeft(operatorExpiry) < 14 ? 'text-red-600' : 'text-green-700'}`}>Operator: {daysLeft(operatorExpiry)} days left</span>} {operatorExpiry && ' · '}
        {orgOperatorExpiry && <span className={`${daysLeft(orgOperatorExpiry) < 14 ? 'text-red-600' : 'text-green-700'}`}>Org Operator: {daysLeft(orgOperatorExpiry)} days left</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={save} className="px-3 py-2 rounded bg-blue-600 text-white">Save</button>
        {status && <span className="text-sm text-gray-600">{status}</span>}
      </div>
    </div>
  );
}

/* =========================
   RISK CHECKER
   ========================= */
function RiskChecker({ bounds, flightDates, flightStatus, projectTag, enableNotamAlerts=false }) {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState([]);
  const [decision, setDecision] = useState(null);

  // replace-or-insert by type
  const upsert = (item) => setSummary(prev => {
    const copy = prev.filter(i => i.type !== item.type);
    return [...copy, item];
  });

  useEffect(() => {
    if (!bounds) return;
    const lat = (bounds[0][0] + bounds[1][0]) / 2;
    const lng = (bounds[0][1] + bounds[1][1]) / 2;

    // Weather (zero-cost screen scrape)
    const fetchWeather = async () => {
      try {
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const weatherUrl = encodeURIComponent(`https://www.bbc.co.uk/weather/${lat},${lng}`);
        const response = await axios.get(`${proxyUrl}${weatherUrl}`);
        const html = response.data.contents || '';
        const windRegex = /\b([0-9]{1,2})mph\b/gi;
        const rainRegex = /\bheavy rain|light rain|showers\b/gi;
        const windMatches = html.match(windRegex)?.map(w => parseInt(w)) || [];
        const rainMatches = html.match(rainRegex) || [];
        const maxWind = Math.max(...windMatches, 0);
        const rainFlag = rainMatches.length > 0;
        const risk = maxWind > 15 || rainFlag ? (maxWind > 20 ? 'red' : 'amber') : 'green';
        upsert({ type: 'Weather', wind: `${maxWind} mph`, rain: rainFlag ? 'Yes' : 'No', result: risk });
      } catch {
        upsert({ type: 'Weather', error: 'Failed to fetch weather', result: 'unknown' });
      }
    };

    // NOTAM (presence flag via public page)
    const checkNOTAM = async () => {
      try {
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const notamUrl = encodeURIComponent('https://nats-uk.ead-it.com/cms-nats/opencms/en/NotamInfo/');
        const response = await axios.get(`${proxyUrl}${notamUrl}`);
        const html = response.data.contents || '';
        const notamActive = html.includes('Active NOTAMs') || html.includes('Navigation Warnings');
        const risk = notamActive ? 'red' : 'green';
        upsert({ type: 'NOTAMs', detail: notamActive ? 'NOTAMs active in UK FIR' : 'No relevant NOTAMs detected', result: risk, link: 'https://nats-uk.ead-it.com/cms-nats/opencms/en/NotamInfo/' });

        // save baseline for change alerts
        if ((flightStatus === 'CURRENT' || flightStatus === 'FUTURE') && enableNotamAlerts && user) {
          const key = `${bounds[0][0].toFixed(3)},${bounds[0][1].toFixed(3)}-${bounds[1][0].toFixed(3)},${bounds[1][1].toFixed(3)}`;
          await setDoc(doc(db, 'users', user.uid, 'notamWatch', key), {
            baseline: notamActive ? 'active' : 'clear',
            updatedAt: serverTimestamp(),
            bounds
          }, { merge: true });
        }
      } catch {
        upsert({ type: 'NOTAMs', error: 'Unable to fetch NOTAMs', result: 'unknown' });
      }
    };

    // Solar activity (Kp index)
    const checkSolarFlare = async () => {
      try {
        const swlUrl = 'https://www.spaceweatherlive.com/en/solar-activity.html';
        const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(swlUrl);
        const response = await axios.get(proxyUrl);
        const html = response.data.contents || '';
        const kpRegex = /Kp-index.*?(\d+)/i;
        const kpMatch = html.match(kpRegex);
        const kpValue = kpMatch ? parseInt(kpMatch[1]) : null;
        const flareRisk = kpValue >= 6 ? 'red' : kpValue >= 4 ? 'amber' : 'green';
        upsert({ type: 'Solar Activity', detail: kpValue ? `Kp-index: ${kpValue}` : 'Kp-index not found', result: flareRisk, link: swlUrl });
      } catch {
        upsert({ type: 'Solar Activity', error: 'Unable to retrieve solar data', result: 'unknown' });
      }
    };

    // Airspace (prompt to verify)
    const checkAirspace = async () => {
      try {
        const url = `https://notaminfo.com/ukmap`;
        const airspaceRisk = 'amber';
        upsert({ type: 'Airspace Classification', detail: 'Verify restricted/controlled airspace before flight.', result: airspaceRisk, link: url });
      } catch {
        upsert({ type: 'Airspace Classification', error: 'Unable to check airspace', result: 'unknown' });
      }
    };

    // Nearest A+E (maps search link)
    const checkHospital = async () => {
      try {
        const searchQuery = `https://www.google.com/maps/search/nearest+accident+and+emergency+hospital/@${lat},${lng},10z`;
        upsert({ type: 'Nearest A+E', detail: 'Open link to view nearby emergency services', result: 'green', link: searchQuery });
      } catch {
        upsert({ type: 'Nearest A+E', error: 'Unable to generate A+E lookup link', result: 'unknown' });
      }
    };

    // Ground hazards prompt (Altitude Angel public viewer)
    const checkGroundHazards = async () => {
      try {
        const queryUrl = `https://dronesafetymap.com/#lat=${lat}&lon=${lng}&z=12`;
        upsert({ type: 'Ground Hazards (Altitude Angel)', detail: 'Inspect ground risks near the selected area', result: 'amber', link: queryUrl });
      } catch {
        upsert({ type: 'Ground Hazards (Altitude Angel)', error: 'Unable to load map', result: 'unknown' });
      }
    };

    // CAA IDs validity
    const checkCAAExpiry = async () => {
      try {
        const userDoc = user ? await getDoc(doc(db, 'users', user.uid)) : null;
        const data = userDoc?.exists() ? userDoc.data() : (profile || {});
        const pExp = data?.pilotExpiry || '';
        const oExp = data?.operatorExpiry || '';
        const orgExp = data?.orgOperatorExpiry || '';
        const daysLeft = (dateStr) => !dateStr ? null : Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
        const pd = daysLeft(pExp), od = daysLeft(oExp), orgd = daysLeft(orgExp);
        const anySoon = [pd, od, orgd].some(v => v !== null && v < 14);
        upsert({ type: 'CAA IDs', detail: `Pilot ${pd ?? 'n/a'} days · Operator ${od ?? 'n/a'} days · Org Operator ${orgd ?? 'n/a'} days`, result: anySoon ? 'amber' : 'green' });
      } catch {
        upsert({ type: 'CAA IDs', error: 'Could not read pilot/operator expiry', result: 'unknown' });
      }
    };

    setSummary([]);
    fetchWeather();
    checkNOTAM();
    checkSolarFlare();
    checkAirspace();
    checkHospital();
    checkGroundHazards();
    checkCAAExpiry();
  }, [bounds, enableNotamAlerts]); // eslint-disable-line

  // derive final decision
  useEffect(() => {
    if (summary.length < 7) return;
    const hasRed = summary.some(i => i.result === 'red');
    const hasAmber = summary.some(i => i.result === 'amber');
    const final = hasRed ? 'NO-GO' : hasAmber ? 'CAUTION' : 'GO';
    setDecision(final);
  }, [summary]);

  const exportPDF = () => {
    const docPdf = new jsPDF();
    docPdf.setFontSize(16);
    docPdf.text('SentinelSky Risk Report', 14, 18);

    const certLabel = { non: 'Non-certified', a2coc: 'A2 CofC', gvc: 'GVC' }[profile?.pilotCert || 'non'];
    const headerLines = [
      `Pilot ID: ${profile?.pilotId || '-'}  (Cert: ${certLabel || '-'})  Exp: ${profile?.pilotExpiry || '-'}`,
      `Operator ID: ${profile?.operatorId || '-'}  Exp: ${profile?.operatorExpiry || '-'}`,
      `Org Operator ID: ${profile?.orgOperatorId || '-'}  Exp: ${profile?.orgOperatorExpiry || '-'}`
    ];
    docPdf.setFontSize(10);
    headerLines.forEach((l, i) => docPdf.text(l, 14, 26 + i * 5));

    const startY = 26 + headerLines.length * 5 + 4;
    const tableData = summary.map(item => [item.type, (item.result||'').toUpperCase(), item.detail || item.error || '-', item.link || '-']);
    autoTable(docPdf, { startY, head: [['Type', 'Result', 'Detail', 'Link']], body: tableData });

    docPdf.setFontSize(14);
    const after = (autoTable).previous.finalY + 10;
    docPdf.text(`FINAL DECISION: ${decision || 'PENDING'}`, 14, after);
    docPdf.save('SentinelSky-Risk-Report.pdf');
  };

  // Save snapshot to Firestore (user + org copies; org copy logs history)
  useEffect(() => {
    const save = async () => {
      if (!decision || !useAuth().user) return;
      const { user, profile } = useAuth();

      const baseDoc = {
        summary,
        decision,
        location: bounds,
        flightStart: flightDates?.start || null,
        flightEnd: flightDates?.end || null,
        flightStatus: flightStatus || null, // CURRENT/FUTURE/ARCHIVED
        projectTag: projectTag || '',
        snapshot: {
          pilotCert: profile?.pilotCert || 'non',
          pilotId: profile?.pilotId || '',
          pilotExpiry: profile?.pilotExpiry || '',
          operatorId: profile?.operatorId || '',
          operatorExpiry: profile?.operatorExpiry || '',
          orgOperatorId: profile?.orgOperatorId || '',
          orgOperatorExpiry: profile?.orgOperatorExpiry || ''
        },
        locked: true,
        createdAt: serverTimestamp(),
        createdBy: { uid: user.uid, email: user.email }
      };

      const userRef = await addDoc(collection(db, 'users', user.uid, 'riskReports'), baseDoc);

      if (profile?.orgId) {
        const orgRef = await addDoc(collection(db, 'organisations', profile.orgId, 'reports'), {
          ...baseDoc,
          userReportId: userRef.id
        });
        await addDoc(collection(db, 'organisations', profile.orgId, 'reports', orgRef.id, 'history'), {
          action: 'CREATED',
          by: { uid: user.uid, email: user.email },
          at: serverTimestamp(),
          changes: { created: true }
        });
      }
    };
    save();
  }, [decision]); // eslint-disable-line

  const sendEmail = ({ to, subject, body }) => {
    const mail = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mail, '_blank');
  };

  const checkNotamChangeAndNotify = async () => {
    const { user } = useAuth();
    if (!user) return;
    const key = `${bounds[0][0].toFixed(3)},${bounds[0][1].toFixed(3)}-${bounds[1][0].toFixed(3)},${bounds[1][1].toFixed(3)}`;
    const rec = await getDoc(doc(db, 'users', user.uid, 'notamWatch', key));
    if (!rec.exists()) return alert('No NOTAM baseline saved for this area. Enable alerts first.');
    try {
      const proxyUrl = 'https://api.allorigins.win/get?url=';
      const notamUrl = encodeURIComponent('https://nats-uk.ead-it.com/cms-nats/opencms/en/NotamInfo/');
      const response = await axios.get(`${proxyUrl}${notamUrl}`);
      const html = response.data.contents || '';
      const notamActive = html.includes('Active NOTAMs') || html.includes('Navigation Warnings');
      const current = notamActive ? 'active' : 'clear';
      const baseline = rec.data().baseline;
      if (current !== baseline) {
        await addDoc(collection(db, 'users', user.uid, 'notifications'), {
          type: 'NOTAM_CHANGE',
          areaKey: key,
          from: baseline, to: current,
          createdAt: serverTimestamp()
        });
        sendEmail({
          to: user.email,
          subject: '[SentinelSky] NOTAM status changed',
          body: `Area ${key}: NOTAM changed from ${baseline} to ${current}.\nOpen: https://nats-uk.ead-it.com/cms-nats/opencms/en/NotamInfo/`
        });
        alert('NOTAM change detected. Email drafted.');
      } else {
        alert('NOTAM status unchanged.');
      }
    } catch {
      alert('Failed to check NOTAMs now.');
    }
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold">Risk Analysis</h3>
      <ul className="mt-2 space-y-2">
        {summary.sort((a,b)=>a.type.localeCompare(b.type)).map((item, idx) => (
          <li key={idx} className={`p-3 rounded shadow ${item.result === 'green' ? 'bg-green-100' : item.result === 'amber' ? 'bg-yellow-100' : item.result === 'red' ? 'bg-red-200' : 'bg-gray-100'}`}>
            <strong>{item.type}:</strong> {(item.result||'').toUpperCase()}<br />
            {item.wind && <>Wind: {item.wind} | </>}
            {item.rain && <>Rain: {item.rain}</>}
            {item.detail && <div className="text-sm">{item.detail}</div>}
            {item.error && <div className="text-sm text-red-600">{item.error}</div>}
            {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">View source</a>}
          </li>
        ))}
      </ul>
      {decision && (
        <div className={`mt-4 p-4 rounded-lg text-white text-center font-bold text-xl ${decision === 'GO' ? 'bg-green-600' : decision === 'CAUTION' ? 'bg-yellow-500' : 'bg-red-600'}`}>
          FINAL DECISION: {decision}
        </div>
      )}
      <div className="flex gap-2 mt-4 flex-wrap">
        <button onClick={exportPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Export as PDF</button>
        <button onClick={checkNotamChangeAndNotify} className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded">Check NOTAM changes & email me</button>
      </div>
    </div>
  );
}

/* =========================
   PERSONAL DASHBOARD
   ========================= */
function RiskDashboard() {
  const { user, profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all'); // all | go | caution | no-go
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [rerunBounds, setRerunBounds] = useState(null);
  const [flightDates, setFlightDates] = useState({ start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') });
  const [projectTag, setProjectTag] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [groupByTag, setGroupByTag] = useState(false);
  const [enableNotamAlerts, setEnableNotamAlerts] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'riskReports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data);
    });
    return unsub;
  }, [user]);

  const allTags = useMemo(() => {
    const set = new Set();
    reports.forEach(r => r.projectTag && set.add(r.projectTag));
    return ['all', ...Array.from(set).sort()];
  }, [reports]);

  const filtered = reports.filter(r => {
    const matchType = filter === 'all' ? true : filter === 'go' ? r.decision === 'GO' : filter === 'no-go' ? r.decision === 'NO-GO' : r.decision === 'CAUTION';
    const matchTag = tagFilter === 'all' ? true : r.projectTag === tagFilter;
    const matchDate = (() => {
      if (!r.createdAt?.seconds && !r.createdAt?.toDate) return true;
      const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt.seconds * 1000);
      const from = dateRange.from ? new Date(dateRange.from) : null;
      const to = dateRange.to ? new Date(dateRange.to) : null;
      return (!from || d >= from) && (!to || d <= to);
    })();
    return matchType && matchTag && matchDate;
  });

  const groupedByTag = useMemo(() => {
    if (!groupByTag) return { 'All Reports': filtered };
    const groups = {};
    filtered.forEach(r => { const key = r.projectTag || 'Untagged'; (groups[key] ||= []).push(r); });
    return groups;
  }, [filtered, groupByTag]);

  const deleteReport = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'riskReports', id));
  };

  const getFlightStatusFromDates = (startStr, endStr) => {
    const now = new Date(); const start = new Date(startStr); const end = new Date(endStr);
    if (now < start) return 'FUTURE'; if (now > end) return 'ARCHIVED'; return 'CURRENT';
  };

  const exportCSV = () => {
    const rows = [
      ['Created At','Decision','Tag','Flight Start','Flight End','Flight Status','Pilot Cert','Pilot ID','Pilot Exp','Operator ID','Operator Exp','Org Operator ID','Org Operator Exp']
    ];
    const certLabel = (v) => ({ non: 'Non-certified', a2coc: 'A2 CofC', gvc: 'GVC' }[v] || 'Non-certified');

    filtered.forEach(r => {
      const snap = r.snapshot || {};
      const created = r.createdAt?.toDate ? r.createdAt.toDate().toISOString()
        : (r.createdAt?.seconds ? new Date(r.createdAt.seconds*1000).toISOString() : '');
      rows.push([
        created, r.decision || '', r.projectTag || '', r.flightStart || '', r.flightEnd || '', r.flightStatus || '',
        certLabel(snap.pilotCert || r.pilotCert),
        snap.pilotId || r.pilotId || '', snap.pilotExpiry || r.pilotExpiry || '',
        snap.operatorId || r.operatorId || '', snap.operatorExpiry || r.operatorExpiry || '',
        snap.orgOperatorId || r.orgOperatorId || '', snap.orgOperatorExpiry || r.orgOperatorExpiry || ''
      ]);
    });

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sentinelsky_reports.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4">
      <UserCredentials />

      <div className="flex items-center justify-between mt-2">
        <h2 className="text-xl font-bold">📋 Saved Risk Reports</h2>
        <button onClick={exportCSV} className="px-3 py-2 rounded bg-emerald-600 text-white">Export CSV</button>
      </div>

      <div className="mt-2 flex gap-2 flex-wrap items-center">
        <span className="text-sm">Risk:</span>
        <button onClick={() => setFilter('all')} className="btn border px-2 py-1 rounded">All</button>
        <button onClick={() => setFilter('go')} className="btn bg-green-200 px-2 py-1 rounded">GO</button>
        <button onClick={() => setFilter('caution')} className="btn bg-yellow-200 px-2 py-1 rounded">CAUTION</button>
        <button onClick={() => setFilter('no-go')} className="btn bg-red-200 px-2 py-1 rounded">NO-GO</button>

        <span className="ml-4 text-sm">Tag:</span>
        <select className="border px-2 py-1 rounded" value={tagFilter} onChange={e=>setTagFilter(e.target.value)}>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <label className="ml-4 text-sm inline-flex items-center gap-2">
          <input type="checkbox" checked={groupByTag} onChange={e=>setGroupByTag(e.target.checked)} /> Group by tag
        </label>

        <label className="ml-4 text-sm">From:
          <input type="date" className="border rounded px-2 py-1 ml-1" value={dateRange.from} onChange={e=>setDateRange(p=>({...p, from:e.target.value}))} />
        </label>
        <label className="text-sm">To:
          <input type="date" className="border rounded px-2 py-1 ml-1" value={dateRange.to} onChange={e=>setDateRange(p=>({...p, to:e.target.value}))} />
        </label>
      </div>

      {Object.entries(groupedByTag).map(([tag, items]) => (
        <div key={tag} className="mt-4">
          {groupByTag && <h4 className="font-semibold text-gray-700">Tag: {tag}</h4>}
          <ul className="mt-2 space-y-2">
            {items.map(report => (
              <li key={report.id} className="p-3 border rounded bg-white">
                <div className="text-sm text-gray-600">{report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleString() : ''}</div>
                <div className="font-bold">Decision: {report.decision}</div>
                <div className="text-sm text-blue-800">Flight: {report.flightStart || '—'} to {report.flightEnd || '—'} — Status: {report.flightStatus || '—'}</div>
                <div className="text-xs text-gray-700">🔖 Project Tag: {report.projectTag || 'None'}</div>
                <div className="mt-2 flex gap-3">
                  <button className="text-sm text-blue-600 underline" onClick={() => setRerunBounds(report.location)}>🔁 Re-run</button>
                  <button className="text-sm text-red-600 underline" onClick={() => deleteReport(report.id)}>🗑️ Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-6">
        <h3 className="text-lg font-semibold">🗓️ Select Flight Dates</h3>
        <div className="flex gap-4 mt-2 flex-wrap">
          <label>Start Date: <input type="date" value={flightDates.start} onChange={e => setFlightDates(p => ({ ...p, start: e.target.value }))} className="border rounded px-2 py-1 ml-1" /></label>
          <label>End Date: <input type="date" value={flightDates.end} onChange={e => setFlightDates(p => ({ ...p, end: e.target.value }))} className="border rounded px-2 py-1 ml-1" /></label>
          <div className="text-sm text-gray-700">Classification: <span className="font-bold">{getFlightStatusFromDates(flightDates.start, flightDates.end)}</span></div>
          <label>🔖 Project Tag: <input type="text" value={projectTag} onChange={e => setProjectTag(e.target.value)} placeholder="e.g. Seisdon Patrol" className="ml-2 border px-2 py-1 rounded" /></label>
          <label className="text-sm inline-flex items-center gap-2">
            <input type="checkbox" checked={enableNotamAlerts} onChange={e=>setEnableNotamAlerts(e.target.checked)} /> Enable NOTAM alerts
          </label>
        </div>
      </div>

      {rerunBounds && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">🔄 Re-running Risk Analysis</h3>
          <RiskChecker
            bounds={rerunBounds}
            flightDates={flightDates}
            flightStatus={getFlightStatusFromDates(flightDates.start, flightDates.end)}
            projectTag={projectTag}
            enableNotamAlerts={enableNotamAlerts}
          />
        </div>
      )}
    </div>
  );
}

/* =========================
   ADMIN: ORG & INVITES
   ========================= */
function AdminPanel() {
  const { user, profile } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [status, setStatus] = useState('');

  if (profile?.role !== 'admin') {
    return <div className="p-4 border rounded bg-white">You must be an admin to access this page.</div>;
  }

  const createOrg = async () => {
    if (!orgId) return setStatus('Enter an org ID (slug).');
    await setDoc(doc(db, 'organisations', orgId), {
      name: orgName || orgId,
      createdAt: serverTimestamp(),
      createdBy: user.email,
      riskThresholds: { windAmber: 15, windRed: 20, rainBlocks: true }
    }, { merge: true });
    setStatus('✅ Organisation created/updated');
  };

  const inviteUser = async () => {
    if (!profile?.orgId) return setStatus('Attach yourself to an org first (orgId on your user doc).');
    const token = Math.random().toString(36).slice(2,10).toUpperCase();
    await addDoc(collection(db, 'organisations', profile.orgId, 'invites'), {
      email: inviteEmail, role: inviteRole, token, createdAt: serverTimestamp(), invitedBy: user.email
    });
    const link = `${window.location.origin}/signup?org=${profile.orgId}&token=${token}&email=${encodeURIComponent(inviteEmail)}&role=${inviteRole}`;
    const mailto = `mailto:${encodeURIComponent(inviteEmail)}?subject=${encodeURIComponent('SentinelSky Invite')}&body=${encodeURIComponent('You have been invited to join ' + (profile.orgName||profile.orgId) + '.\nClick to accept: ' + link)}`;
    window.open(mailto, '_blank');
    setStatus('✅ Invite recorded and email drafted.');
    setInviteEmail('');
  };

  return (
    <div className="p-4 border rounded bg-white space-y-4">
      <h2 className="text-xl font-bold">🔧 Admin: Organisations & Invites</h2>

      <div>
        <h3 className="font-semibold">Create / Update Organisation</h3>
        <div className="grid md:grid-cols-3 gap-2 mt-2">
          <label className="text-sm">Org ID (slug)
            <input className="w-full border rounded px-2 py-1" value={orgId} onChange={e=>setOrgId(e.target.value)} placeholder="sentinelsky" />
          </label>
          <label className="text-sm">Org Name
            <input className="w-full border rounded px-2 py-1" value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Sentinel Sky Tech" />
          </label>
          <button onClick={createOrg} className="self-end px-3 py-2 rounded bg-blue-600 text-white">Save Org</button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold">Invite User</h3>
        <div className="grid md:grid-cols-3 gap-2 mt-2">
          <label className="text-sm">Email
            <input className="w-full border rounded px-2 py-1" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="pilot@example.com" />
          </label>
          <label className="text-sm">Role
            <select className="w-full border rounded px-2 py-1" value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button onClick={inviteUser} className="self-end px-3 py-2 rounded bg-emerald-600 text-white">Send Invite</button>
        </div>
      </div>

      {status && <div className="text-sm text-gray-700">{status}</div>}
    </div>
  );
}

/* =========================
   ORG RISK SETTINGS
   ========================= */
function OrgRiskSettings() {
  const { profile } = useAuth();
  const [windAmber, setWindAmber] = useState(15);
  const [windRed, setWindRed] = useState(20);
  const [rainBlocks, setRainBlocks] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!profile?.orgId) return;
      const snap = await getDoc(doc(db, 'organisations', profile.orgId));
      const thr = snap.exists() ? (snap.data().riskThresholds || {}) : {};
      setWindAmber(thr.windAmber ?? 15);
      setWindRed(thr.windRed ?? 20);
      setRainBlocks(thr.rainBlocks ?? true);
    };
    load();
  }, [profile?.orgId]);

  const save = async () => {
    if (!profile?.orgId) return;
    await setDoc(doc(db, 'organisations', profile.orgId), {
      riskThresholds: { windAmber: Number(windAmber), windRed: Number(windRed), rainBlocks }
    }, { merge: true });
    setStatus('✅ Thresholds saved');
  };

  return (
    <div className="p-4 border rounded bg-white mt-6">
      <h2 className="text-xl font-bold">⚙️ Organisation Risk Thresholds</h2>
      <div className="grid md:grid-cols-3 gap-3 mt-3">
        <label className="text-sm">Wind (Amber ≥ mph)
          <input type="number" className="w-full border rounded px-2 py-1" value={windAmber} onChange={e=>setWindAmber(e.target.value)} />
        </label>
        <label className="text-sm">Wind (Red > mph)
          <input type="number" className="w-full border rounded px-2 py-1" value={windRed} onChange={e=>setWindRed(e.target.value)} />
        </label>
        <label className="text-sm inline-flex items-center gap-2">Rain triggers caution
          <input type="checkbox" checked={rainBlocks} onChange={e=>setRainBlocks(e.target.checked)} />
        </label>
      </div>
      <button onClick={save} className="mt-3 px-3 py-2 rounded bg-blue-600 text-white">Save Thresholds</button>
      {status && <span className="ml-2 text-sm text-gray-700">{status}</span>}
    </div>
  );
}

/* =========================
   ORG USER ADMIN
   ========================= */
function OrgUserAdmin() {
  const { profile } = useAuth();
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!profile?.orgId) return;
    const unsub = onSnapshot(collection(db, 'organisations', profile.orgId, 'members'), snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [profile?.orgId]);

  if (profile?.role !== 'admin') {
    return <div className="p-4 border rounded bg-white">Admin only.</div>;
  }

  const addMember = async () => {
    if (!email) return;
    await addDoc(collection(db, 'organisations', profile.orgId, 'invites'), {
      email, role, invitedAt: serverTimestamp(), invitedBy: profile.email
    });
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('SentinelSky Org Invite')}&body=${encodeURIComponent('You have been invited to join '+(profile.orgName||profile.orgId)+'.')}`;
    window.open(mailto, '_blank');
    setStatus('✅ Invite sent');
    setEmail('');
  };

  const setMemberRole = async (memberId, newRole) => {
    await updateDoc(doc(db, 'organisations', profile.orgId, 'members', memberId), { role: newRole });
  };

  const removeMember = async (memberId) => {
    await deleteDoc(doc(db, 'organisations', profile.orgId, 'members', memberId));
  };

  return (
    <div className="p-4 border rounded bg-white space-y-4">
      <h2 className="text-xl font-bold">👥 Organisation Users</h2>
      <div className="grid md:grid-cols-3 gap-2">
        <label className="text-sm">Email
          <input className="w-full border rounded px-2 py-1" value={email} onChange={e=>setEmail(e.target.value)} placeholder="pilot@example.com" />
        </label>
        <label className="text-sm">Role
          <select className="w-full border rounded px-2 py-1" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button onClick={addMember} className="self-end px-3 py-2 rounded bg-emerald-600 text-white">Invite</button>
      </div>

      <ul className="mt-4 divide-y">
        {members.map(m => (
          <li key={m.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{m.email}</div>
              <div className="text-xs text-gray-600">Role: {m.role}</div>
            </div>
            <div className="flex items-center gap-2">
              <select className="border rounded px-2 py-1 text-sm" value={m.role} onChange={e=>setMemberRole(m.id, e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={()=>removeMember(m.id)} className="text-red-600 text-sm">Remove</button>
            </div>
          </li>
        ))}
      </ul>

      {status && <div className="text-sm text-gray-700">{status}</div>}
    </div>
  );
}

/* =========================
   ORG REPORTS (with history, re-run, soft delete)
   ========================= */
function OrgReportsDashboard() {
  const { profile, user } = useAuth();
  const [reports, setReports] = useState([]);
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [rerun, setRerun] = useState(null); // { bounds, flightDates, projectTag }

  useEffect(() => {
    if (!profile?.orgId) return;
    const q = query(collection(db, 'organisations', profile.orgId, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(all);
    });
    return unsub;
  }, [profile?.orgId]);

  const list = reports.filter(r => showDeleted ? true : !r.deleted);

  const openHistory = (rep) => {
    setHistoryFor(rep);
    onSnapshot(collection(db, 'organisations', profile.orgId, 'reports', rep.id, 'history'), snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  };

  const diff = (oldVals, newVals) => {
    const changes = {};
    Object.keys(newVals).forEach(k => {
      if (newVals[k] !== oldVals[k]) changes[k] = { from: oldVals[k] ?? null, to: newVals[k] };
    });
    return changes;
  };

  const softDelete = async (rep) => {
    if (profile?.role !== 'admin') return;
    await updateDoc(doc(db, 'organisations', profile.orgId, 'reports', rep.id), {
      deleted: true, deletedAt: serverTimestamp(), deletedBy: { uid: user.uid, email: user.email }
    });
    await addDoc(collection(db, 'organisations', profile.orgId, 'reports', rep.id, 'history'), {
      action: 'DELETED', by: { uid: user.uid, email: user.email }, at: serverTimestamp(),
      changes: { deleted: { from: !!rep.deleted, to: true } }
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { id, flightStart, flightEnd, projectTag } = editing;
    const repRef = doc(db, 'organisations', profile.orgId, 'reports', id);
    const snap = await getDoc(repRef);
    const prev = snap.data() || {};
    const updated = {
      flightStart,
      flightEnd,
      projectTag,
      flightStatus: (() => { const now=new Date(); const s=new Date(flightStart); const e=new Date(flightEnd); return now < s ? 'FUTURE' : (now > e ? 'ARCHIVED' : 'CURRENT'); })()
    };
    await updateDoc(repRef, updated);
    await addDoc(collection(db, 'organisations', profile.orgId, 'reports', id, 'history'), {
      action: 'UPDATED', by: { uid: user.uid, email: user.email }, at: serverTimestamp(),
      changes: diff({ flightStart: prev.flightStart, flightEnd: prev.flightEnd, projectTag: prev.projectTag }, updated)
    });
    setEditing(null);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="p-4 border rounded bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🏢 Organisation Flight Plans</h2>
        <label className="text-sm inline-flex items-center gap-2">
          <input type="checkbox" checked={showDeleted} onChange={e=>setShowDeleted(e.target.checked)} /> Show deleted
        </label>
      </div>

      <ul className="mt-4 space-y-2">
        {list.map(r => (
          <li key={r.id} className={`p-3 border rounded ${r.deleted ? 'opacity-60' : ''}`}>
            <div className="text-sm text-gray-600">{r.createdAt?.seconds ? new Date(r.createdAt.seconds*1000).toLocaleString() : ''} — by {r.createdBy?.email}</div>
            <div className="font-semibold">Decision: {r.decision} · Tag: {r.projectTag || '–'} · Window: {r.flightStart || '–'} → {r.flightEnd || '–'} · Status: {r.flightStatus || '–'}</div>
            <div className="flex gap-3 mt-2">
              <button className="text-blue-600 text-sm underline" onClick={()=>openHistory(r)}>📜 History</button>
              {!r.deleted && (
                <button className="text-green-700 text-sm underline" onClick={()=>setRerun({ bounds: r.location, flightDates: { start: r.flightStart, end: r.flightEnd }, projectTag: r.projectTag })}>🔁 Re-run check</button>
              )}
              {isAdmin && !r.deleted && (
                <button className="text-indigo-700 text-sm underline" onClick={()=>setEditing({ id:r.id, flightStart:r.flightStart||'', flightEnd:r.flightEnd||'', projectTag:r.projectTag||'' })}>✏️ Edit metadata</button>
              )}
              {isAdmin && !r.deleted && (
                <button className="text-red-600 text-sm underline" onClick={()=>softDelete(r)}>🗑️ Delete</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <h3 className="font-semibold">Edit Metadata</h3>
          <div className="grid md:grid-cols-3 gap-2 mt-2">
            <label className="text-sm">Start
              <input type="date" className="w-full border rounded px-2 py-1" value={editing.flightStart} onChange={e=>setEditing(p=>({ ...p, flightStart:e.target.value }))} />
            </label>
            <label className="text-sm">End
              <input type="date" className="w-full border rounded px-2 py-1" value={editing.flightEnd} onChange={e=>setEditing(p=>({ ...p, flightEnd:e.target.value }))} />
            </label>
            <label className="text-sm">Project Tag
              <input className="w-full border rounded px-2 py-1" value={editing.projectTag} onChange={e=>setEditing(p=>({ ...p, projectTag:e.target.value }))} />
            </label>
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={saveEdit} className="px-3 py-2 rounded bg-blue-600 text-white">Save</button>
            <button onClick={()=>setEditing(null)} className="px-3 py-2 rounded bg-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {historyFor && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Change History — {historyFor.projectTag || historyFor.id}</h3>
            <button onClick={()=>{setHistoryFor(null); setHistory([]);}} className="text-sm">Close</button>
          </div>
          <ul className="mt-2 divide-y">
            {history.sort((a,b)=> (b.at?.seconds||0) - (a.at?.seconds||0)).map(h => (
              <li key={h.id} className="py-2">
                <div className="text-sm text-gray-600">{h.at?.seconds ? new Date(h.at.seconds*1000).toLocaleString() : ''} — {h.action} by {h.by?.email}</div>
                <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-auto">{JSON.stringify(h.changes, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rerun && (
        <div className="mt-6 p-3 border rounded bg-gray-50">
          <h3 className="font-semibold">🔄 Re-running Risk Analysis</h3>
          <RiskChecker
            bounds={rerun.bounds}
            flightDates={rerun.flightDates}
            flightStatus={(() => { const now=new Date(); const s=new Date(rerun.flightDates?.start); const e=new Date(rerun.flightDates?.end); return now < s ? 'FUTURE' : (now > e ? 'ARCHIVED' : 'CURRENT'); })()}
            projectTag={rerun.projectTag}
            enableNotamAlerts
          />
          <button className="mt-2 text-sm" onClick={()=>setRerun(null)}>Close re-run</button>
        </div>
      )}
    </div>
  );
}

/* =========================
   APP ROUTES (DEFAULT EXPORT)
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
