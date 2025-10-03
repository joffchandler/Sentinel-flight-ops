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

        let userData;

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
            userData = { email: u.email, role: 'user', orgId };
            await updateDoc(match.ref, { status: 'accepted' });
          } else {
            // No invite found
            await setDoc(
              userRef,
              { email: u.email, role: null, orgId: null },
              { merge: true }
            );
            userData = { email: u.email, role: null, orgId: null };
          }
        } else {
          userData = snap.data();
        }

        // If user has an org, check expiry
        if (userData?.orgId) {
          const orgSnap = await getDoc(doc(db, 'organisations', userData.orgId));
          if (orgSnap.exists()) {
            const org = orgSnap.data();
            if (org.expiryDate) {
              const today = new Date();
              const expiry = new Date(org.expiryDate);
              const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

              if (diffDays < 0) {
                userData.expired = true;
              } else if (diffDays <= 30) {
                userData.expiryWarning = diffDays; // warn if 30 days or less
              }
            }
          }
        }

        setProfile(userData);
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
