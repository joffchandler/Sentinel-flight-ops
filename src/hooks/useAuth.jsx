import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collectionGroup,
  getDocs,
  updateDoc
} from 'firebase/firestore';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        const userRef = doc(db, 'users', u.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          // Look for an invite matching this email
          const invitesSnap = await getDocs(collectionGroup(db, 'invites'));
          const match = invitesSnap.docs.find(
            (d) =>
              d.data().email === u.email.toLowerCase() &&
              d.data().status === 'pending'
          );

          if (match) {
            const orgId = match.ref.parent.parent.id;
            await setDoc(
              userRef,
              { email: u.email, role: 'user', orgId },
              { merge: true }
            );
            setProfile({ email: u.email, role: 'user', orgId });
            await updateDoc(match.ref, { status: 'accepted' });
          } else {
            // No invite found — user exists but unassigned
            await setDoc(
              userRef,
              { email: u.email, role: null, orgId: null },
              { merge: true }
            );
            setProfile({ email: u.email, role: null, orgId: null });
          }
        } else {
          setProfile(snap.data());
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <Ctx.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
