// Debug utility to help with admin account setup
// This can be run in the browser console to check/create admin profiles

import { auth, firestore } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getIdTokenResult } from 'firebase/auth';

export const debugAdminAccount = async () => {
  if (!auth.currentUser) {
    console.log("❌ No user logged in");
    return;
  }

  const user = auth.currentUser;
  console.log("=== ADMIN DEBUG UTILITY ===");
  console.log("🔍 User UID:", user.uid);
  console.log("📧 User email:", user.email);

  // Check token claims
  try {
    const tokenResult = await getIdTokenResult(user, true);
    console.log("🎫 Token claims:", tokenResult.claims);
    console.log("👑 Has admin claim:", !!(tokenResult.claims as any)?.admin);
    console.log("⭐ Has super_admin claim:", !!(tokenResult.claims as any)?.super_admin);
  } catch (err) {
    console.log("❌ Token claims error:", err);
  }

  // Check Firestore profile
  try {
    const profileRef = doc(firestore, "users", user.uid);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      console.log("📄 Firestore profile exists:", profileData);
      console.log("👤 Profile role:", profileData.role);
      
      if (profileData.role !== 'admin' && profileData.role !== 'super_admin') {
        console.log("⚠️  WARNING: Profile role is not admin/super_admin");
      }
    } else {
      console.log("❌ No Firestore profile found");
      
      // Offer to create admin profile
      const shouldCreate = confirm("No profile found. Create admin profile for this user?");
      if (shouldCreate) {
        await createAdminProfile(user.uid, user.email || '');
      }
    }
  } catch (err) {
    console.log("❌ Firestore profile error:", err);
  }
};

export const createAdminProfile = async (uid: string, email: string, isSuper = false) => {
  try {
    const profileData = {
      firstName: isSuper ? "Super" : "Admin",
      lastName: isSuper ? "Admin" : "User", 
      email: email,
      company: "TrustNshare",
      companyDomain: "trustnshare.com",
      domain: "System",
      role: isSuper ? "super_admin" : "admin",
      createdAt: new Date().toISOString(),
      status: "active"
    };

    const profileRef = doc(firestore, "users", uid);
    await setDoc(profileRef, profileData);
    
    console.log("✅ Created admin profile:", profileData);
    console.log("🔄 Please refresh the page and try logging in again");
    
    return profileData;
  } catch (err) {
    console.log("❌ Failed to create admin profile:", err);
    throw err;
  }
};

// Make available globally for console use
if (typeof window !== 'undefined') {
  (window as any).debugAdminAccount = debugAdminAccount;
  (window as any).createAdminProfile = createAdminProfile;
}