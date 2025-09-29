import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import { doc, setDoc } from 'firebase/firestore';

export default function UserCredentials() {
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
    await setDoc(
      doc(db, 'users', user.uid),
      {
        ...(profile || {}),
        pilotId,
        pilotExpiry,
        pilotCert,            // "non" | "a2coc" | "gvc"
        operatorId,
        operatorExpiry,
        orgOperatorId,
        orgOperatorExpiry
      },
      { merge: true }
    );
    setStatus('✅ Saved');
    setTimeout(() => setStatus(''), 1500);
  };

  const daysLeft = (dateStr) => {
    if (!dateStr) return null;
    const diffMs = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const pill = (n) => {
    if (n == null) return null;
    const danger = n < 14 ? '#991b1b' : '#065f46';
    const bg = n < 14 ? '#fecaca' : '#d1fae5';
    return (
      <span style={{ color: danger, background: bg, padding: '2px 6px', borderRadius: 6, fontSize: 12 }}>
        {n} days left
      </span>
    );
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#fff' }}>
      <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>👤 Pilot & Operator Credentials</h3>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label style={{ fontSize: 14 }}>
          Pilot ID
          <input value={pilotId} onChange={(e)=>setPilotId(e.target.value)} placeholder="GBR-RP-…" style={inputStyle} />
        </label>

        <label style={{ fontSize: 14 }}>
          Pilot Expiry
          <input type="date" value={pilotExpiry} onChange={(e)=>setPilotExpiry(e.target.value)} style={inputStyle} />
        </label>

        <label style={{ fontSize: 14 }}>
          Pilot Certification
          <select value={pilotCert} onChange={(e)=>setPilotCert(e.target.value)} style={inputStyle}>
            <option value="non">Non-certified</option>
            <option value="a2coc">A2 CofC</option>
            <option value="gvc">GVC</option>
          </select>
        </label>

        <label style={{ fontSize: 14 }}>
          Operator ID
          <input value={operatorId} onChange={(e)=>setOperatorId(e.target.value)} placeholder="GBR-OP-…" style={inputStyle} />
        </label>

        <label style={{ fontSize: 14 }}>
          Operator Expiry
          <input type="date" value={operatorExpiry} onChange={(e)=>setOperatorExpiry(e.target.value)} style={inputStyle} />
        </label>

        <label style={{ fontSize: 14 }}>
          Organisation Operator ID
          <input value={orgOperatorId} onChange={(e)=>setOrgOperatorId(e.target.value)} placeholder="GBR-ORG-…" style={inputStyle} />
        </label>

        <label style={{ fontSize: 14 }}>
          Organisation Operator Expiry
          <input type="date" value={orgOperatorExpiry} onChange={(e)=>setOrgOperatorExpiry(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ marginTop: 8, fontSize: 13, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {pilotExpiry && <>Pilot: {pill(daysLeft(pilotExpiry))}</>}
        {operatorExpiry && <>Operator: {pill(daysLeft(operatorExpiry))}</>}
        {orgOperatorExpiry && <>Org Operator: {pill(daysLeft(orgOperatorExpiry))}</>}
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={save} style={btnStyle}>Save</button>
        {status && <span style={{ fontSize: 13, color: '#374151' }}>{status}</span>}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '6px 8px',
  marginTop: 4
};

const btnStyle = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  padding: '8px 12px',
  borderRadius: 6,
  cursor: 'pointer'
};
