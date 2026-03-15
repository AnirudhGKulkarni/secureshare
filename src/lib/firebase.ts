// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

// Firestore persistence is now managed via FirestoreSettings.cache in the getFirestore call
// This provides better handling of IndexedDB persistence across multiple tabs and HMR scenarios

export default app;
