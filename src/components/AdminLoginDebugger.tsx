// Test component to help debug admin login issues
// Add this to any page temporarily to run tests

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { auth, firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getIdTokenResult } from 'firebase/auth';

export const AdminLoginDebugger: React.FC = () => {
  const { currentUser, profile, refreshProfile } = useAuth();

  const runFullDebug = async () => {
    if (!currentUser) {
      console.log("❌ No user logged in");
      return;
    }

    console.log("=== FULL ADMIN DEBUG ===");
    console.log("👤 Current user:", currentUser.uid, currentUser.email);
    console.log("📋 Profile from context:", profile);

    // Test 1: Check token claims
    try {
      const tokenResult = await getIdTokenResult(currentUser, true);
      console.log("🎫 Fresh token claims:", tokenResult.claims);
      console.log("👑 Admin claim:", (tokenResult.claims as any)?.admin);
      console.log("⭐ Super admin claim:", (tokenResult.claims as any)?.super_admin);
    } catch (err) {
      console.error("❌ Token error:", err);
    }

    // Test 2: Direct Firestore read
    try {
      const profileRef = doc(firestore, "users", currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      console.log("📄 Firestore profile exists:", profileSnap.exists());
      if (profileSnap.exists()) {
        console.log("📄 Firestore profile data:", profileSnap.data());
      }
    } catch (err) {
      console.error("❌ Firestore read error:", err);
    }

    // Test 3: Try to refresh profile
    try {
      await refreshProfile();
      console.log("🔄 Profile after refresh:", profile);
    } catch (err) {
      console.error("❌ Profile refresh error:", err);
    }
  };

  const createTestAdminProfile = async () => {
    if (!currentUser) return;

    try {
      const profileData = {
        firstName: "Test",
        lastName: "Admin",
        email: currentUser.email,
        company: "TrustNshare",
        companyDomain: "trustnshare.com",
        domain: "System",
        role: "admin",
        createdAt: new Date().toISOString(),
        status: "active"
      };

      const profileRef = doc(firestore, "users", currentUser.uid);
      await setDoc(profileRef, profileData, { merge: true });
      
      console.log("✅ Created test admin profile");
      await refreshProfile();
      
    } catch (err) {
      console.error("❌ Failed to create test profile:", err);
    }
  };

  if (!currentUser) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Admin Debug - Not Logged In</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in first to use the debug tools.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Admin Login Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p><strong>User:</strong> {currentUser.email}</p>
          <p><strong>UID:</strong> {currentUser.uid}</p>
          <p><strong>Profile Role:</strong> {profile?.role || 'Not loaded'}</p>
        </div>
        
        <div className="space-x-2">
          <Button onClick={runFullDebug}>
            Run Full Debug
          </Button>
          <Button onClick={createTestAdminProfile} variant="outline">
            Create Test Admin Profile
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>Use browser console (F12) to see debug output.</p>
          <p>Also available globally: <code>window.debugAdminAccount()</code></p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminLoginDebugger;