import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { SecuritySettingsDoc } from "../types";

export const SECURITY_SETTINGS_REF = doc(firestore, "system_settings", "securitySettings");

export async function getSecuritySettings(): Promise<SecuritySettingsDoc | null> {
  try {
    const snap = await getDoc(SECURITY_SETTINGS_REF);
    if (!snap.exists()) return null;
    return snap.data() as SecuritySettingsDoc;
  } catch (err) {
    // Best-effort: security settings are used for UX gating only.
    // If rules deny reading this doc, do not block auth flows.
    console.warn("getSecuritySettings failed (non-blocking):", err);
    return null;
  }
}

export function subscribeSecuritySettings(cb: (settings: SecuritySettingsDoc | null) => void): () => void {
  return onSnapshot(
    SECURITY_SETTINGS_REF,
    (snap) => {
      cb(snap.exists() ? (snap.data() as SecuritySettingsDoc) : null);
    },
    (err) => {
      console.warn("securitySettings snapshot error:", err);
      cb(null);
    },
  );
}

export async function upsertSecuritySettings(input: {
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  loginAttemptLimit: number;
  updatedBy: string;
}): Promise<void> {
  const next: Omit<SecuritySettingsDoc, "updatedAt"> & { updatedAt: any } = {
    registrationEnabled: input.registrationEnabled,
    maintenanceMode: input.maintenanceMode,
    loginAttemptLimit: input.loginAttemptLimit,
    updatedAt: serverTimestamp(),
    updatedBy: input.updatedBy,
  };

  await setDoc(SECURITY_SETTINGS_REF, next, { merge: true });
}
