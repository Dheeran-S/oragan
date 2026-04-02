// src/context/AuthContext.jsx
// Manages Firebase authentication state and fetches the user's role from Firestore.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser]   = useState(null);
  const [userProfile, setUserProfile]   = useState(null); // Firestore users doc
  const [loading, setLoading]           = useState(true);
  const [authError, setAuthError]       = useState(null);

  // ── Login ────────────────────────────────────────────────────────────────
  async function login(email, password) {
    setAuthError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return credential;
    } catch (err) {
      const msg = friendlyError(err.code);
      setAuthError(msg);
      throw new Error(msg);
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  async function logout() {
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  }

  // ── Auth State Listener ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        // Fetch role + profile from Firestore
        try {
          const userRef  = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserProfile({ id: userSnap.id, ...userSnap.data() });
          } else {
            // Fallback profile if doc not yet created
            setUserProfile({ id: firebaseUser.uid, email: firebaseUser.email, role: 'doctor' });
          }
        } catch (e) {
          console.error('Failed to fetch user profile:', e);
          setUserProfile({ id: firebaseUser.uid, email: firebaseUser.email, role: 'doctor' });
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Role Helpers ─────────────────────────────────────────────────────────
  const isAdmin  = userProfile?.role === 'admin';
  const isDoctor = userProfile?.role === 'doctor';
  const role     = userProfile?.role || 'doctor';

  const value = {
    currentUser,
    userProfile,
    isAdmin,
    isDoctor,
    role,
    loading,
    authError,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// ── Friendly Firebase error messages ────────────────────────────────────────
function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':          return 'Invalid email address format.';
    case 'auth/user-disabled':          return 'This account has been disabled.';
    case 'auth/user-not-found':         return 'No account found with this email.';
    case 'auth/wrong-password':         return 'Incorrect password.';
    case 'auth/too-many-requests':      return 'Too many failed attempts. Try again later.';
    case 'auth/invalid-credential':     return 'Invalid credentials. Please check your email and password.';
    default: return 'Authentication failed. Please try again.';
  }
}

export default AuthContext;
