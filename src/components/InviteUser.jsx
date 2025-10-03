import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth.jsx';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';

export default function InviteUser() {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [maxUsers, setMaxUsers] = useState(0);
  const [currentUsers, setCurrentUsers] = useState(0);

  useEffect(() => {
    const loadOrg = async () => {
      if (!profile?.orgId) return;
      const snap = await getDoc(doc(db, 'organisations', profile.orgId));
      if (snap.exists()) {
        setMaxUsers(snap.data().maxUsers || 0);
      }
    };
    loadOrg();
  }, [profile]);

  const invite = async () => {
    if (!email) {
      setStatus('⚠️ Please enter an email');
      return;
    }

    if (!profile?.orgId) {
      setStatus('❌ You are not assigned to an organisation.');
      return;
    }

    // Create invite doc
    await addDoc(collection(db, 'organisations', profile.orgId, 'invites'), {
      email: email.toLowerCase(),
      invitedBy: user.uid,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });

    setStatus(`✅ Invite sent to ${email}`);
    setEmail('');
  };

  if (profile?.role !== 'orgAdmin') {
    return <div style={{ padding: 24 }}>❌ Access denied — only org admins can invite users.</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Invite User</h2>
      <p>Max users allowed: {maxUsers}</p>

      <input
        style={{ border: '1px solid #ccc', borderRadius: 6, padding: 6, marginRight: 8 }}
        type="email"
        placeholder="user@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={invite}
        style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4 }}
      >
        Invite
      </button>
      {status && <div style={{ marginTop: 8 }}>{status}</div>}
    </div>
  );
}
