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
  getIdTokenResult,
} from "firebase/auth";
import { auth, firestore } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc, addDoc, collection, serverTimestamp, increment } from "firebase/firestore";
import { getSecuritySettings } from "@/features/superAdmin/services/securitySettingsService";
import { writeLoginHistory } from "@/features/superAdmin/services/loginHistoryService";
import { writeAuditLog } from "@/features/superAdmin/services/auditLogsService";
import { isSuperAdminRole } from "@/features/superAdmin/services/superAdminGuards";

const getDeviceInfo = () => {
  if (typeof navigator === "undefined") return "";
  return [navigator.userAgent, (navigator as any).platform].filter(Boolean).join(" | ");
};

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
        let profileData = snap.data();
        // If the profile doc exists but role is missing, try to infer from token claims
        try {
          const user = auth.currentUser;
          if (user && !profileData.role) {
            const id = await getIdTokenResult(user);
            if ((id.claims as any)?.super_admin || (id.claims as any)?.superadmin) profileData.role = "super_admin";
            else if ((id.claims as any)?.admin) profileData.role = "admin";
          }
        } catch (e) {
          console.warn("Could not read token claims while loading profile (non-blocking):", e);
        }

        console.log("AuthContext - loadProfile found profile:", profileData);
        setProfile(profileData);
        return;
      }
      // If profile doesn't exist, do NOT auto-create. Treat as unregistered.
      // If no profile doc, check token claims to infer role so admin UI can still render.
      try {
        const user = auth.currentUser;
        if (user) {
          const id = await getIdTokenResult(user);
          if ((id.claims as any)?.super_admin || (id.claims as any)?.superadmin) {
            const inferred: any = { role: "super_admin", email: user.email };
            console.log("AuthContext - No profile doc, inferred super_admin from token claims");
            setProfile(inferred);
            return;
          } else if ((id.claims as any)?.admin) {
            const inferred: any = { role: "admin", email: user.email };
            console.log("AuthContext - No profile doc, inferred admin from token claims");
            setProfile(inferred);
            return;
          }
        }
      } catch (e) {
        console.warn("Could not infer role from token claims (non-blocking):", e);
      }

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
    // Best-effort login throttling (client-side)
    try {
      const settings = await getSecuritySettings();
      const limit = settings?.loginAttemptLimit ?? 0;
      if (limit > 0 && typeof window !== "undefined") {
        const key = `login_fail_${email.toLowerCase()}`;
        const raw = window.localStorage.getItem(key);
        const fails = raw ? Number(raw) : 0;
        if (Number.isFinite(fails) && fails >= limit) {
          const err: any = new Error("Too many failed login attempts. Please try again later.");
          err.code = "auth/too-many-attempts";
          throw err;
        }
      }
    } catch {
      // ignore settings read failures; do not block login
    }

    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      try {
        if (typeof window !== "undefined") {
          const key = `login_fail_${email.toLowerCase()}`;
          const raw = window.localStorage.getItem(key);
          const fails = raw ? Number(raw) : 0;
          const next = Number.isFinite(fails) ? fails + 1 : 1;
          window.localStorage.setItem(key, String(next));
        }
      } catch {
        /* ignore */
      }
      throw err;
    }

    console.log("AuthContext - Login successful for:", cred.user.email);
    // Wait for profile to load before returning
    await loadProfile(cred.user.uid);
    // Force a second load attempt to ensure fresh data
    await new Promise(resolve => setTimeout(resolve, 200));
    await loadProfile(cred.user.uid);

    // Enforce blocked accounts and maintenance mode (best-effort client enforcement)
    // IMPORTANT: Never fail login just because Firestore reads are denied.
    try {
      let pr: any = null;
      try {
        const snap = await getDoc(doc(firestore, "users", cred.user.uid));
        pr = snap.exists() ? (snap.data() as any) : null;
      } catch (e) {
        console.warn("Could not read users doc during enforcement (non-blocking):", e);
        pr = null;
      }

      if (pr?.blocked === true) {
        await signOut(auth);
        const err: any = new Error("Your account has been blocked. Contact support.");
        err.code = "auth/account-blocked";
        throw err;
      }

      // settings read is best-effort (getSecuritySettings returns null on denied)
      const settings = await getSecuritySettings();
      if (settings?.maintenanceMode === true && !isSuperAdminRole(pr?.role)) {
        await signOut(auth);
        const err: any = new Error("The platform is currently in maintenance mode. Please try again later.");
        err.code = "auth/maintenance-mode";
        throw err;
      }

      if (pr?.forcePasswordReset === true) {
        // Best-effort: send reset email and clear the flag.
        try {
          await sendPasswordResetEmail(auth, cred.user.email || email);
        } catch (e) {
          console.warn("Could not send forced password reset email:", e);
        }
        try {
          await updateDoc(doc(firestore, "users", cred.user.uid), { forcePasswordReset: false, passwordResetRequestedAt: serverTimestamp() });
        } catch (e) {
          console.warn("Could not clear forcePasswordReset flag:", e);
        }
        await signOut(auth);
        const err: any = new Error("Password reset required. Please check your email.");
        err.code = "auth/password-reset-required";
        throw err;
      }
    } catch (e) {
      // If enforcement throws one of our explicit auth errors, surface it.
      if ((e as any)?.code?.startsWith?.("auth/")) throw e;
      // Otherwise, never block login.
      console.warn("Enforcement skipped due to error (non-blocking):", e);
    }
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

    // New: loginHistory tracking (super admin can view all)
    try {
      await writeLoginHistory({
        userId: cred.user.uid,
        email: cred.user.email || email,
        deviceInfo: getDeviceInfo(),
        ipAddress: null,
        location: null,
      });
    } catch (e) {
      console.warn("Failed to write loginHistory:", e);
    }

    // New: unified audit logs for admin monitoring
    try {
      await writeAuditLog({
        actionType: "LOGIN",
        performedBy: cred.user.uid,
        performedByName: cred.user.displayName || cred.user.email || email,
        targetUser: cred.user.uid,
        details: { deviceInfo: getDeviceInfo() },
      });
    } catch (e) {
      console.warn("Failed to write auditLogs LOGIN entry:", e);
    }

    // Reset client-side failure counter on success
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`login_fail_${email.toLowerCase()}`);
      }
    } catch {
      /* ignore */
    }
    return cred.user;
  };

  // signup: creates auth user, writes Firestore user doc (awaited), then loads profile
  const signup = async (data: SignupData) => {
    const { email, password, firstName, lastName, company, companyDomain, domain, role } = data;

    // Enforce registration enabled (best-effort; requires public read access to system_settings/securitySettings)
    try {
      const settings = await getSecuritySettings();
      if (settings?.registrationEnabled === false) {
        const err: any = new Error("Registrations are currently disabled.");
        err.code = "auth/registration-disabled";
        throw err;
      }
    } catch (e) {
      if ((e as any)?.code === "auth/registration-disabled") throw e;
      // If rules deny reading settings, do not block signup.
    }

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
          status: "active",
          createdAt: serverTimestamp(),
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
        status: "active",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Full profile write failed during signup (non-blocking):", err);
      // Do not rethrow — many projects restrict writes to some fields; we've already written a minimal profile.
    }

    // Load profile into context (non-blocking)
    loadProfile(cred.user.uid).catch((e) => console.warn("loadProfile after signup error:", e));

    // New: audit log for user creation
    try {
      await writeAuditLog({
        actionType: "USER_CREATED",
        performedBy: cred.user.uid,
        performedByName: `${firstName} ${lastName}`.trim() || cred.user.email || email,
        targetUser: cred.user.uid,
        details: { role: safeRole },
      });
    } catch (e) {
      console.warn("Failed to write auditLogs USER_CREATED entry:", e);
    }

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

  // If maintenance mode is enabled, sign out non-superadmins (best-effort)
  useEffect(() => {
    (async () => {
      try {
        if (!currentUser) return;
        const settings = await getSecuritySettings();
        if (!settings?.maintenanceMode) return;
        const pr: any = profile;
        if (!isSuperAdminRole(pr?.role)) {
          await signOut(auth);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [currentUser, profile]);

  return (
    <AuthContext.Provider value={{ currentUser, profile, loading, login, signup, resetPassword, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
