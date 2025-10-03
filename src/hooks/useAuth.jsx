import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        // Does this user already have a profile?
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Check if any organisation exists
          const orgsSnap = await getDocs(collection(db, 'organisations'));

          if (orgsSnap.empty) {
            // No orgs exist → bootstrap first org + admin
            const orgId = 'sentinel-sky'; // you can later make this dynamic
            await setDoc(doc(db, 'organisations', orgId), {
              name: 'Sentinel Sky Technologies',
              operatorId: '',
              expiryDate: '',
              maxUsers: 5,
              createdBy: u.uid,
            });

            await setDoc(userRef, {
              email: u.email,
              role: 'orgAdmin',
              orgId,
            });
            setProfile({ email: u.email, role: 'orgAdmin', orgId });
          } else {
            // Org exists → new user gets basic role
            const firstOrg = orgsSnap.docs[0].id;
            await setDoc(userRef, {
              email: u.email,
              role: 'user',
              orgId: firstOrg,
            });
            setProfile({ email: u.email, role: 'user', orgId: firstOrg });
          }
        } else {
          // Existing user → load profile
          setProfile(userSnap.data());
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
