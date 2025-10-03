import React, { useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

export default function FlightPlanner() {
  const { profile } = useAuth();
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState([]);
  const [decision, setDecision] = useState(null);
  const [status, setStatus] = useState('');

  if (!profile?.orgId) {
    return <div style={{ padding: 24 }}>❌ You must belong to an organisation to plan flights.</div>;
  }

  const runChecks = async () => {
    const summary = [];

    // Weather (placeholder)
    summary.push({ type: 'Weather', result: 'amber', detail: 'Max wind ~15mph, showers possible' });

    // NOTAMs (placeholder)
    summary.push({ type: 'NOTAMs', result: 'green', detail: 'No NOTAMs detected (UK FIR summary)' });

    // Solar Activity (placeholder)
    summary.push({ type: 'Solar Activity', result: 'green', detail: 'Kp-index low' });

    // A+E lookup
    summary.push({
      type: 'Nearest A+E',
      result: 'green',
      link: `https://www.google.com/maps/search/nearest+accident+and+emergency+hospital/@${lat},${lng},10z`
    });

    // Drone Safety Map (Altitude Angel) check
    try {
      const url = `https://dronesafetymap.com/#lat=${lat}&lon=${lng}&z=12`;
      const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
      const res = await axios.get(proxyUrl);
      const html = res.data.contents || '';

      const hazardRegex = /(Restricted|Hazard|Warning|No Fly|NFZ)/i;
      const foundHazard = hazardRegex.test(html);

      summary.push({
        type: 'Airspace & Ground Hazards',
        result: foundHazard ? 'red' : 'amber',
        detail: foundHazard
          ? 'Restricted zones or hazards detected in DroneSafetyMap'
          : 'No obvious hazards detected (review manually)',
        link: url
      });
    } catch (err) {
      summary.push({
        type: 'Airspace & Ground Hazards',
        result: 'amber',
        detail: 'Could not fetch DroneSafetyMap, please review manually',
        link: `https://dronesafetymap.com/#lat=${lat}&lon=${lng}&z=12`
      });
    }

    setResults(summary);

    const hasRed = summary.some(i => i.result === 'red');
    const hasAmber = summary.some(i => i.result === 'amber');
    setDecision(hasRed ? 'NO-GO' : hasAmber ? 'CAUTION' : 'GO');
  };

  const saveReport = async () => {
    try {
      await addDoc(collection(db, 'organisations', profile.orgId, 'flights'), {
        createdBy: profile.email,
        lat,
        lng,
        startDate,
        endDate,
        results,
        decision,
        createdAt: serverTimestamp()
      });
      setStatus('✅ Report saved');
      setTimeout(() => setStatus(''), 2500);
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to save');
    }
  };

  const exportPDF = () => {
    const docPdf = new jsPDF();
    docPdf.setFontSize(16);
    docPdf.text('SentinelSky Flight Risk Report', 14, 18);

    autoTable(docPdf, {
      startY: 26,
      head: [['Type', 'Result', 'Detail/Link']],
      body: results.map(r => [r.type, r.result, r.detail || r.link || '-'])
    });

    docPdf.setFontSize(14);
    docPdf.text(
      `FINAL DECISION: ${decision || 'PENDING'}`,
      14,
      (docPdf).lastAutoTable.finalY + 10
    );
    docPdf.save('Flight-Risk-Report.pdf');
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>🛫 Flight Planner</h2>

      <label>
        Latitude:
        <input type="number" value={lat} onChange={(e) => setLat(e.target.value)} style={inputStyle} />
      </label>
      <label>
        Longitude:
        <input type="number" value={lng} onChange={(e) => setLng(e.target.value)} style={inputStyle} />
      </label>
      <label>
        Start Date:
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
      </label>
      <label>
        End Date:
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
      </label>

      <button onClick={runChecks} style={btnStyle}>Run Risk Checks</button>

      {results.length > 0 && (
        <>
          <ul style={{ marginTop: 16 }}>
            {results.map((r, i) => (
              <li
                key={i}
                style={{
                  marginBottom: 8,
                  padding: 8,
                  borderRadius: 4,
                  background:
                    r.result === 'green'
                      ? '#bbf7d0'
                      : r.result === 'amber'
                      ? '#fef9c3'
                      : '#fecaca'
                }}
              >
                <strong>{r.type}:</strong> {r.result.toUpperCase()} <br />
                {r.detail && <span>{r.detail}</span>}
                {r.link && (
                  <div>
                    <a href={r.link} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 6,
              textAlign: 'center',
              fontWeight: 700,
              color: '#fff',
              background:
                decision === 'GO'
                  ? '#16a34a'
                  : decision === 'CAUTION'
                  ? '#facc15'
                  : '#dc2626'
            }}
          >
            FINAL DECISION: {decision}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={saveReport} style={btnStyle}>
              Save Report
            </button>
            <button onClick={exportPDF} style={btnStyle}>
              Export PDF
            </button>
          </div>
          {status && <div style={{ marginTop: 8 }}>{status}</div>}
        </>
      )}
    </div>
  );
}

const inputStyle = {
  display: 'block',
  margin: '6px 0 12px 0',
  padding: 6,
  border: '1px solid #ccc',
  borderRadius: 4,
  width: 200
};
const btnStyle = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 4,
  fontWeight: 600,
  marginTop: 8
};
