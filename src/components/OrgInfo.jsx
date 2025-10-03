import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function OrgInfo() {
  const { user, profile } = useAuth();
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!profile?.orgId) return;
    const loadOrg = async () => {
      const snap = await getDoc(doc(db, 'organisations', profile.orgId));
      if (snap.exists()) {
        setOrgData(snap.data());
      } else {
        // create empty org doc if missing
        await setDoc(doc(db, 'organisations', profile.orgId), {
          operatorId: '',
          expiryDate: '',
          maxUsers: 1,
          createdBy: user.uid,
        });
        setOrgData({
          operatorId: '',
          expiryDate: '',
          maxUsers: 1,
          createdBy: user.uid,
        });
      }
      setLoading(false);
    };
    loadOrg();
  }, [profile, user]);

  const save = async () => {
    if (!profile?.orgId) return;
    await setDoc(doc(db, 'organisations', profile.orgId), orgData, { merge: true });
    setStatus('✅ Saved');
    setTimeout(() => setStatus(''), 2000);
  };

  if (!profile?.role || profile.role !== 'orgAdmin') {
    return <div style={{ padding: 24 }}>❌ Access denied — only org admins can view this page.</div>;
  }

  if (loading) return <div style={{ padding: 24 }}>Loading organisation info…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>🏢 Organisation Info</h2>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <label>
          Organisation Operator ID
          <input
            style={inputStyle}
            value={orgData.operatorId || ''}
            onChange={(e) => setOrgData({ ...orgData, operatorId: e.target.value })}
            placeholder="GBR-ORG-XXXX"
          />
        </label>

        <label>
          Subscription Expiry Date
          <input
            type="date"
            style={inputStyle}
            value={orgData.expiryDate || ''}
            onChange={(e) => setOrgData({ ...orgData, expiryDate: e.target.value })}
          />
        </label>

        <label>
          Max Users
          <input
            type="number"
            min="1"
            style={inputStyle}
            value={orgData.maxUsers || 1}
            onChange={(e) => setOrgData({ ...orgData, maxUsers: parseInt(e.target.value) })}
          />
        </label>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
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
