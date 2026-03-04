// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase config on load
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, v]) => !v)
  .map(([k]) => k);

if (missingKeys.length > 0) {
  console.error("❌ FIREBASE CONFIG ERROR: Missing env vars:", missingKeys);
  console.error("Check your .env file for VITE_FIREBASE_* variables");
} else {
  console.log("✅ FIREBASE CONFIG LOADED");
  console.log("  Auth Domain:", firebaseConfig.authDomain);
  console.log("  Project ID:", firebaseConfig.projectId);
  console.log("  API Key present:", !!firebaseConfig.apiKey);
}

if (typeof window !== "undefined") {
  console.log("  Current URL Origin:", window.location.origin);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Enable IndexedDB persistence (try once; guard against HMR / multiple-initializations)
if (typeof window !== "undefined") {
  try {
    const g = window as any;
    if (!g.__FIRESTORE_PERSISTENCE_TRIED__) {
      g.__FIRESTORE_PERSISTENCE_TRIED__ = true;
      enableIndexedDbPersistence(firestore).catch((err) => {
        const msg = String(err?.message ?? err?.code ?? err);
        // Ignore expected failures: multiple tabs, unimplemented, or already-started
        if (/failed-precondition|unimplemented|already been started/i.test(msg)) {
          console.warn("Could not enable persistence (non-fatal):", msg);
        } else {
          console.warn("Could not enable persistence:", err);
        }
      });
    }
  } catch (e) {
    console.warn("Could not initialize persistence guard:", e);
  }
}

export default app;
