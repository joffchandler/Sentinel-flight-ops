import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import {
  doc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

export default function OrgInfo() {
  const { profile } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(profile?.orgId || '');
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operatorId, setOperatorId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [maxUsers, setMaxUsers] = useState(0);
  const [status, setStatus] = useState('');

  // Load all orgs if superAdmin
  useEffect(() => {
    const loadOrgs = async () => {
      if (profile?.role === 'superAdmin') {
        const snap = await getDocs(collection(db, 'organisations'));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrgs(all);
      }
      setLoading(false);
    };
    loadOrgs();
  }, [profile]);

  // Load selected org data
  useEffect(() => {
    const loadOrg = async () => {
      if (!selectedOrgId) return;
      const snap = await getDoc(doc(db, 'organisations', selectedOrgId));
      if (snap.exists()) {
        const data = snap.data();
        setOrg(data);
        setOperatorId(data.operatorId || '');
        setExpiryDate(data.expiryDate || '');
        setMaxUsers(data.maxUsers || 0);
      }
    };
    loadOrg();
  }, [selectedOrgId]);

  const save = async () => {
    if (!selectedOrgId) return;
    try {
      const updates = { operatorId, expiryDate };
      if (profile.role === 'superAdmin') {
        updates.maxUsers = maxUsers;
      }

      await updateDoc(doc(db, 'organisations', selectedOrgId), updates);

      // Audit log
      await addDoc(collection(db, 'organisations', selectedOrgId, 'history'), {
        updatedBy: profile.email,
        updatedByRole: profile.role,
        updates,
        timestamp: serverTimestamp()
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

      {profile.role === 'superAdmin' && (
        <div style={{ marginBottom: 16 }}>
          <label>
            Select Organisation:{' '}
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              style={{ padding: 6, borderRadius: 4 }}
            >
              <option value="">-- Select an organisation --</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.id})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {org ? (
        <>
          <div style={{ marginBottom: 8 }}>
            <strong>Name:</strong> {org.name}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Organisation ID:</strong> {selectedOrgId}
          </div>

          <label style={{ display: 'block', marginBottom: 12 }}>
            Operator ID:
            <input
              style={{
                display: 'block',
                marginTop: 4,
                padding: 6,
                border: '1px solid #ccc',
                borderRadius: 4
              }}
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="GBR-ORG-123"
            />
          </label>

          <label style={{ display: 'block', marginBottom: 12 }}>
            Expiry Date:
            <input
              type="date"
              style={{
                display: 'block',
                marginTop: 4,
                padding: 6,
                border: '1px solid #ccc',
                borderRadius: 4
              }}
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </label>

          {profile.role === 'superAdmin' && (
            <label style={{ display: 'block', marginBottom: 12 }}>
              Max Users:
              <input
                type="number"
                style={{
                  display: 'block',
                  marginTop: 4,
                  padding: 6,
                  border: '1px solid #ccc',
                  borderRadius: 4
                }}
                value={maxUsers}
                onChange={(e) => setMaxUsers(parseInt(e.target.value))}
              />
            </label>
          )}

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
