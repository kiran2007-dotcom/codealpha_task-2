import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { validatePasswordStrength } from '../lib/validation.ts';
import { ensureUserProfile, updateUserProfile } from '../services/firestoreService.ts';
import type { UserProfile } from '../types/orbit.ts';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  authReady: boolean;
  isVerified: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (displayName: string, email: string, password: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  saveProfile: (updates: {
    displayName: string;
    jobTitle: string;
    department: string;
    bio: string;
    avatarColor: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('orbit_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('orbit_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore storage failure
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setAuthReady(true);
        return;
      }

      if (!user.emailVerified) {
        setProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        const ensured = await ensureUserProfile(user);
        setProfile(ensured);
        unsubscribeProfile = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile(snap.data() as UserProfile);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          }
        );
      } catch (error) {
        console.error('Failed to initialize user profile:', error);
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const registerWithEmail = useCallback(async (displayName: string, email: string, password: string) => {
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      throw new Error(`Password requirements not met: ${strength.errors.join(', ')}`);
    }
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: displayName.trim() });
    await sendEmailVerification(cred.user);
    setFirebaseUser({ ...cred.user });
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) throw new Error('No active account session.');
    await sendEmailVerification(auth.currentUser);
  }, []);

  const refreshVerificationStatus = useCallback(async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const refreshed = auth.currentUser;
    setFirebaseUser(refreshed ? ({ ...refreshed } as FirebaseUser) : null);
    if (refreshed.emailVerified) {
      const ensured = await ensureUserProfile(refreshed);
      setProfile(ensured);
      return true;
    }
    return false;
  }, []);

  const saveProfile = useCallback(
    async (updates: {
      displayName: string;
      jobTitle: string;
      department: string;
      bio: string;
      avatarColor: string;
    }) => {
      if (!profile) throw new Error('Profile not loaded.');
      await updateUserProfile(profile, updates);
    },
    [profile]
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        authReady,
        isVerified: Boolean(firebaseUser?.emailVerified),
        darkMode,
        toggleDarkMode,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resendVerificationEmail,
        refreshVerificationStatus,
        saveProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
