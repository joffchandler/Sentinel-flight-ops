import React, { useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

export default function CreateOrg() {
  const { user, profile } = useAuth();
  const [orgId, setOrgId] = useState('');
  const [name, setName] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [maxUsers, setMaxUsers] = useState(5);
  const [adminUid, setAdminUid] = useState(''); // initial admin user UID
  const [status, setStatus] = useState('');

  if (!user || profile?.role !== 'superAdmin') {
    return <div style={{ padding: 24 }}>❌ Access denied — only super admins can create organisations.</div>;
  }

  const create = async () => {
    if (!orgId || !name || !adminUid) {
      setStatus('⚠️ Org ID, Name and Admin UID are required.');
      return;
    }

    await setDoc(doc(db, 'organisations', orgId), {
      name,
      operatorId,
      expiryDate,
      maxUsers,
      createdBy: user.uid,
      firstAdmin: adminUid,
    });

    // promote initial admin
    await updateDoc(doc(db, 'users', adminUid), {
      orgId,
      role: 'orgAdmin'
    });

    setStatus(`✅ Organisation "${name}" created with ID: ${orgId}`);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Create Organisation (Super Admin Only)</h2>
      <input style={inputStyle} placeholder="Org ID (e.g., acme-drones)" value={orgId} onChange={e => setOrgId(e.target.value)} />
      <input style={inputStyle} placeholder="Organisation Name" value={name} onChange={e => setName(e.target.value)} />
      <input style={inputStyle} placeholder="Operator ID (optional)" value={operatorId} onChange={e => setOperatorId(e.target.value)} />
      <input style={inputStyle} type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
      <input style={inputStyle} type="number" value={maxUsers} onChange={e => setMaxUsers(parseInt(e.target.value))} placeholder="Max users" />
      <input style={inputStyle} placeholder="Initial Admin UID" value={adminUid} onChange={e => setAdminUid(e.target.value)} />
      <button onClick={create} style={btnStyle}>Create</button>
      {status && <div style={{ marginTop: 8 }}>{status}</div>}
    </div>
  );
}

const inputStyle = { display: 'block', margin: '8px 0', padding: 6, border: '1px solid #ccc', borderRadius: 4, width: '100%' };
const btnStyle = { background: '#2563eb', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4, cursor: 'pointer' };
