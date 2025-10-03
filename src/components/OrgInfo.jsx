import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function OrgInfo() {
  const { profile } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operatorId, setOperatorId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const loadOrg = async () => {
      if (!profile?.orgId) return;
      const snap = await getDoc(doc(db, 'organisations', profile.orgId));
      if (snap.exists()) {
        const data = snap.data();
        setOrg(data);
        setOperatorId(data.operatorId || '');
        setExpiryDate(data.expiryDate || '');
      }
      setLoading(false);
    };
    loadOrg();
  }, [profile]);

  const save = async () => {
    if (!profile?.orgId) return;
    try {
      await updateDoc(doc(db, 'organisations', profile.orgId), {
        operatorId,
        expiryDate
      });
      setStatus('✅ Organisation updated');
      setTimeout(() => setStatus(''), 2500);
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to update');
    }
  };

  if (!profile) return <div style={{ padding: 24 }}>Please log in.</div>;
  if (profile.role !== 'orgAdmin' && profile.role !== 'superAdmin') {
    return <div style={{ padding: 24 }}>❌ Access denied.</div>;
  }
  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>🏢 Organisation Info</h2>

      {org ? (
        <>
          <div style={{ marginBottom: 8 }}>
            <strong>Name:</strong> {org.name}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Organisation ID:</strong> {profile.orgId}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Max Users:</strong> {org.maxUsers} (editable only by Super Admin)
          </div>

          <label style={{ display: 'block', marginBottom: 12 }}>
            Operator ID:
            <input
              style={{ display: 'block', marginTop: 4, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="GBR-ORG-123"
            />
          </label>

          <label style={{ display: 'block', marginBottom: 12 }}>
            Expiry Date:
            <input
              type="date"
              style={{ display: 'block', marginTop: 4, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </label>

          <button
            onClick={save}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              fontWeight: 600
            }}
          >
            Save Changes
          </button>

          {status && <div style={{ marginTop: 10 }}>{status}</div>}
        </>
      ) : (
        <p>No organisation found.</p>
      )}
    </div>
  );
}
