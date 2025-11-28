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
import { getAuth } from "firebase/auth";

type SignupData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  companyDomain?: string | null;
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

  // loadProfile: reads users/{uid} doc, auto-creates a safe default if missing
  const loadProfile = async (uid: string) => {
    const ref = doc(firestore, "users", uid);

    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        // Merge in admin custom claim if present
        try {
          const current = getAuth();
          const user = current.currentUser;
          if (user) {
            const tokenResult = await user.getIdTokenResult();
            if (tokenResult.claims?.admin) {
              setProfile((p: any) => ({ ...(p ?? {}), role: "admin" }));
            }
          }
        } catch (e) {
          // non-fatal
          console.warn("loadProfile: failed to read token claims", e);
        }
        return;
      }

      // If doc does not exist, create a conservative default profile (client by default)
      const defaultProfile = {
        firstName: "",
        lastName: "",
        email: auth.currentUser?.email ?? "",
        company: null,
        companyDomain: null,
        domain: "Other",
        role: "client", // safe default — never auto-assign "admin"
        createdAt: new Date().toISOString(),
      };

      await setDoc(ref, defaultProfile);
      setProfile(defaultProfile);
      // No admin claim for new users by default
      return;
    } catch (err) {
      // If server fetch fails (network, permissions), log and set undefined to avoid blocking UI.
      console.warn("loadProfile error (server or cache):", err);
      setProfile(undefined);
    }
  };

  // login: signs in and triggers profile load (non-blocking)
  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // start loading profile in background (do not let callers block on a slow network)
    loadProfile(cred.user.uid).catch((e) => console.warn("loadProfile after login error:", e));
    return cred.user;
  };

  // signup: creates auth user, writes Firestore user doc (awaited), then loads profile
  const signup = async (data: SignupData) => {
    const { email, password, firstName, lastName, company, companyDomain, domain, role } = data;
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Update Firebase Auth profile (displayName)
    await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });

    // Create the Firestore user document and await completion (ensures doc exists immediately)
    await setDoc(doc(firestore, "users", cred.user.uid), {
      firstName,
      lastName,
      email,
      company: company ?? null,
      companyDomain: companyDomain ?? null,
      domain,
      role, // IMPORTANT: only set to "admin" if validated elsewhere
      createdAt: new Date().toISOString(),
    });

    // Load profile into context
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
      if (user) {
        // attempt to load profile, but don't block UI; loadProfile is resilient
        loadProfile(user.uid).catch((e) => console.warn("initial loadProfile error:", e));
      } else {
        setProfile(undefined);
      }
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
