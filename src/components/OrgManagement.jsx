import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

export default function OrgManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      if (!profile?.orgId) return;
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.orgId === profile.orgId);
      setUsers(list);
    };
    loadUsers();
  }, [profile]);

  const inviteUser = async () => {
    if (!email) return;
    try {
      await addDoc(collection(db, 'organisations', profile.orgId, 'invites'), {
        email: email.toLowerCase(),
        invitedBy: profile.email,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      setStatus(`✅ Invite created for ${email}`);
      setEmail('');
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to invite user');
    }
  };

  const promoteUser = async (uid, newRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setStatus(`✅ Updated role to ${newRole}`);
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to update role');
    }
  };

  if (!profile) return <div style={{ padding: 24 }}>Loading...</div>;
  if (profile.role !== 'orgAdmin' && profile.role !== 'superAdmin') {
    return <div style={{ padding: 24 }}>❌ Access denied.</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>👥 Organisation Management</h2>

      <h3 style={{ marginBottom: 8 }}>Invite New User</h3>
      <input
        type="email"
        placeholder="user@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ marginRight: 8, padding: 6 }}
      />
      <button onClick={inviteUser} style={btnStyle}>Invite</button>
      {status && <div style={{ marginTop: 8 }}>{status}</div>}

      <h3 style={{ marginTop: 20, marginBottom: 8 }}>Current Users</h3>
      <ul>
        {users.map(u => (
          <li key={u.id} style={{ marginBottom: 6 }}>
            {u.email} — <strong>{u.role || 'pending'}</strong>
            {profile.role === 'orgAdmin' || profile.role === 'superAdmin' ? (
              <>
                {u.role !== 'orgAdmin' && (
                  <button
                    onClick={() => promoteUser(u.id, 'orgAdmin')}
                    style={miniBtnStyle}
                  >
                    Promote to Admin
                  </button>
                )}
                {u.role !== 'user' && (
                  <button
                    onClick={() => promoteUser(u.id, 'user')}
                    style={miniBtnStyle}
                  >
                    Demote to User
                  </button>
                )}
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

const btnStyle = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 4,
  fontWeight: 600
};

const miniBtnStyle = {
  marginLeft: 8,
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  padding: '2px 6px',
  borderRadius: 4,
  fontSize: 12
};
