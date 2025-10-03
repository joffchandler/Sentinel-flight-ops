import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import { doc, setDoc } from 'firebase/firestore';

export default function UserCredentials() {
  const { user, profile } = useAuth();
  const [pilotId, setPilotId] = useState('');
  const [pilotExpiry, setPilotExpiry] = useState('');
  const [pilotCert, setPilotCert] = useState('non'); // non | a2coc | gvc
  const [operatorId, setOperatorId] = useState('');
  const [operatorExpiry, setOperatorExpiry] = useState('');
  const [orgOperatorId, setOrgOperatorId] = useState('');
  const [orgOperatorExpiry, setOrgOperatorExpiry] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!profile) return;
    setPilotId(profile.pilotId || '');
    setPilotExpiry(profile.pilotExpiry || '');
    setPilotCert(profile.pilotCert || 'non');
    setOperatorId(profile.operatorId || '');
    setOperatorExpiry(profile.operatorExpiry || '');
    setOrgOperatorId(profile.orgOperatorId || '');
    setOrgOperatorExpiry(profile.orgOperatorExpiry || '');
  }, [profile]);

  const save = async () => {
    if (!user) return;
    await setDoc(
      doc(db, 'users', user.uid),
      {
        pilotId,
        pilotExpiry,
        pilotCert,
        operatorId,
        operatorExpiry,
        orgOperatorId,
        orgOperatorExpiry,
      },
      { merge: true }
    );
    setStatus('✅ Saved');
    setTimeout(() => setStatus(''), 2000);
  };

  const daysLeft = (dateStr) => {
    if (!dateStr) return null;
    const diffMs = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, background: '#fff' }}>
      <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}>👤 Pilot & Operator Credentials</h3>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label>
          Pilot ID
          <input value={pilotId} onChange={(e) => setPilotId(e.target.value)} placeholder="GBR-RP-…" style={inputStyle} />
        </label>

        <label>
          Pilot Expiry
          <input type="date" value={pilotExpiry} onChange={(e) => setPilotExpiry(e.target.value)} style={inputStyle} />
        </label>

        <label>
          Pilot Certification
          <select value={pilotCert} onChange={(e) => setPilotCert(e.target.value)} style={inputStyle}>
            <option value="non">Non-certified</option>
            <option value="a2coc">A2 CofC</option>
            <option value="gvc">GVC</option>
          </select>
        </label>

        <label>
          Operator ID
          <input value={operatorId} onChange={(e) => setOperatorId(e.target.value)} placeholder="GBR-OP-…" style={inputStyle} />
        </label>

        <label>
          Operator Expiry
          <input type="date" value={operatorExpiry} onChange={(e) => setOperatorExpiry(e.target.value)} style={inputStyle} />
        </label>

        <label>
          Org Operator ID
          <input value={orgOperatorId} onChange={(e) => setOrgOperatorId(e.target.value)} placeholder="GBR-ORG-…" style={inputStyle} />
        </label>

        <label>
          Org Operator Expiry
          <input type="date" value={orgOperatorExpiry} onChange={(e) => setOrgOperatorExpiry(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        {pilotExpiry && <span style={pillStyle(daysLeft(pilotExpiry))}>Pilot: {daysLeft(pilotExpiry)} days left</span>}{" "}
        {operatorExpiry && <span style={pillStyle(daysLeft(operatorExpiry))}>Operator: {daysLeft(operatorExpiry)} days left</span>}{" "}
        {orgOperatorExpiry && <span style={pillStyle(daysLeft(orgOperatorExpiry))}>Org Operator: {daysLeft(orgOperatorExpiry)} days left</span>}
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={save} style={btnStyle}>Save</button>
        {status && <span>{status}</span>}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  border: '1px solid #ccc',
  borderRadius: 6,
  padding: '6px 8px',
  marginTop: 4,
};

const btnStyle = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  padding: '8px 12px',
  borderRadius: 6,
  cursor: 'pointer',
};

const pillStyle = (days) => ({
  marginRight: 8,
  padding: '2px 6px',
  borderRadius: 6,
  background: days < 14 ? '#fecaca' : '#d1fae5',
  color: days < 14 ? '#991b1b' : '#065f46',
  fontSize: 12,
});
