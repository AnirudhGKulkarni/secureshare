// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth";
import { auth, firestore } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

type SignupData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  companyDomain?: string;
  domain: string;
  role: "admin" | "client";
};

type AuthContextType = {
  currentUser: User | null;
  profile?: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: SignupData) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    try {
      const snap = await getDoc(doc(firestore, "users", uid));
      setProfile(snap.exists() ? snap.data() : undefined);
    } catch (err) {
      console.error("profile load error", err);
    }
  };

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await loadProfile(cred.user.uid);
    return cred.user;
  };

  const signup = async (data: SignupData) => {
    const { email, password, firstName, lastName, company, companyDomain, domain, role } = data;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });
    await setDoc(doc(firestore, "users", cred.user.uid), {
      firstName,
      lastName,
      email,
      company: company ?? null,
      companyDomain: companyDomain ?? null,
      domain,
      role,
      createdAt: new Date().toISOString(),
    });
    await loadProfile(cred.user.uid);
    return cred.user;
  };

  const resetPassword = async (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    setProfile(undefined);
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (currentUser) await loadProfile(currentUser.uid);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) loadProfile(user.uid);
      else setProfile(undefined);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, profile, loading, login, signup, resetPassword, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
