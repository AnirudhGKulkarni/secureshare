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
import { doc, setDoc, getDoc, updateDoc, addDoc, collection, serverTimestamp, increment } from "firebase/firestore";

type SignupData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  companyDomain?: string | null;
  domain: string;
  role: "admin" | "client" | "super_admin";
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
        const profileData = snap.data();
        console.log("AuthContext - loadProfile found profile:", profileData);
        setProfile(profileData);
        return;
      }
      // If profile doesn't exist, do NOT auto-create. Treat as unregistered.
      console.log("AuthContext - No profile found for uid, leaving profile=null (unregistered)");
      setProfile(null as any);
      return;
    } catch (err) {
      // If server fetch fails (network, permissions), log and set undefined to avoid blocking UI.
      console.warn("loadProfile error (server or cache):", err);
      setProfile(undefined);
    }
  };

  // login: signs in and waits for profile load to complete
  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log("AuthContext - Login successful for:", cred.user.email);
    // Wait for profile to load before returning
    await loadProfile(cred.user.uid);
    // Force a second load attempt to ensure fresh data
    await new Promise(resolve => setTimeout(resolve, 200));
    await loadProfile(cred.user.uid);
    // Record login timestamp and increment total login count for the user
    try {
      const userLogRef = doc(firestore, "user_logins", cred.user.uid);
      await setDoc(userLogRef, { lastLogin: serverTimestamp(), totalLogins: increment(1) }, { merge: true });
    } catch (e) {
      console.warn("Failed to write user_logins doc:", e);
    }

    // Append an audit log entry for analytics / timeline
    try {
      await addDoc(collection(firestore, "audit_logs"), {
        userId: cred.user.uid,
        action: "LOGIN",
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn("Failed to append audit_logs entry:", e);
    }
    return cred.user;
  };

  // signup: creates auth user, writes Firestore user doc (awaited), then loads profile
  const signup = async (data: SignupData) => {
    const { email, password, firstName, lastName, company, companyDomain, domain, role } = data;
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Update Firebase Auth profile (displayName)
    await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });

    // Create the Firestore user document and await completion (ensures doc exists immediately)
    // Public signup should not be allowed to set elevated roles like "admin" or "super_admin" directly.
    const profileRef = doc(firestore, "users", cred.user.uid);
    const safeRole: "admin" | "client" | "super_admin" = (role === "admin" || role === "super_admin") ? "client" : role;

    // First attempt a minimal, safe merge write (this is most likely allowed by strict rules)
    try {
      await setDoc(
        profileRef,
        {
          email,
          role: safeRole,
          status: "pending",
          createdAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (err) {
      // If even the minimal merge write is denied, log and continue — do not fail signup.
      console.warn("Minimal profile write failed during signup (non-blocking):", err);
    }

    // Then attempt to write the full profile for richer UX, but do not let failures block signup.
    try {
      await setDoc(profileRef, {
        firstName,
        lastName,
        email,
        company: company ?? null,
        companyDomain: companyDomain ?? null,
        domain,
        role: safeRole,
        status: "pending",
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Full profile write failed during signup (non-blocking):", err);
      // Do not rethrow — many projects restrict writes to some fields; we've already written a minimal profile.
    }

    // Load profile into context (non-blocking)
    loadProfile(cred.user.uid).catch((e) => console.warn("loadProfile after signup error:", e));

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
