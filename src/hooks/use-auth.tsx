
'use client';

import { auth, db } from '@/lib/firebase';
import { signOut as firebaseSignOut, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as React from 'react';
import { initializeNewUser } from '@/lib/db/database';
import type { AuthUser } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  authUser: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [authUser, setAuthUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!auth || !db) {
      console.warn('Firebase not configured. Auth functionality will be disabled.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data() as AuthUser;
          setAuthUser(userData);
          setUser(currentUser);
        } else {
          // New user, create their document and initialize their data
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            createdAt: serverTimestamp(),
            onboardingComplete: false,
          });
          await initializeNewUser(currentUser.uid);
          const newUserSnap = await getDoc(userRef);
          if (newUserSnap.exists()) {
            setAuthUser(newUserSnap.data() as AuthUser);
          }
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setAuthUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase not configured');
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
      throw error;
    }
  };

  const signOut = async () => {
    if (!auth) {
      throw new Error('Firebase not configured');
    }
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };

  const value = { user, authUser, loading, signInWithGoogle, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
