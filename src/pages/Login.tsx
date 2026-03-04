// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Shield, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getDoc, doc, getDocs, query, where, collection } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { getIdTokenResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
// Import debug utility for admin account troubleshooting
import "@/lib/debugAdmin";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromSignup = Boolean((location.state as any)?.fromSignup);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(email.trim(), password);

      // Wait a bit for profile to load in AuthContext, then check again
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("Login - About to check Firestore profile for UID:", user.uid);

      // Attempt to read profile from Firestore
      try {
        const snap = await getDoc(doc(firestore, "users", user.uid));
        const profile = snap.exists() ? snap.data() : null;

        console.log("=== LOGIN DEBUG ===");
        console.log("Login - User UID:", user.uid);
        console.log("Login - User email:", user.email);
        console.log("Login - Firestore snap exists:", snap.exists());
        console.log("Login - User profile:", profile);
        console.log("Login - Profile role:", profile?.role);
        console.log("Login - Profile data keys:", profile ? Object.keys(profile) : 'no profile');

        if (profile && profile.role === "super_admin") {
          toast.success("Welcome Super Admin!");
          navigate("/super-admin");
          return;
        }

        if (profile && profile.role === "admin") {
          // If approved admin has not paid, send to pricing first
          const isActive = profile.status === "active";
          const isPaid = !!profile.paid;
          toast.success("Welcome Admin!");
          if (isActive && !isPaid) {
            navigate("/pricing", { state: { fromLogin: true } });
          } else {
            navigate("/dashboard");
          }
          return;
        }

        if (profile && (profile.approved === false || profile.status === "pending")) {
          toast.message("Your account is waiting for Super Admin approval.");
          navigate("/waiting-for-approval", { replace: true });
          return;
        }

        if (profile && profile.role === "client") {
          toast.success("Login successful!");
          navigate("/client");
          return;
        }

        // If profile missing: block access and sign out
        if (!profile) {
          toast.error("User not registered. Please contact support.");
          try { await auth.signOut(); } catch {}
          navigate("/");
          return;
        }

        // If profile ambiguous, fall back to token claims
        console.log("Profile not found or role unclear, checking token claims...");
        try {
          const id = await getIdTokenResult(auth.currentUser!, true); // Force refresh
          console.log("Token claims (refreshed):", id.claims);
          console.log("Has admin claim:", (id.claims as any)?.admin);
          console.log("Has super_admin claim:", (id.claims as any)?.super_admin);
          
          if ((id.claims as any)?.super_admin) {
            toast.success("Welcome Super Admin!");
            navigate("/super-admin");
          } else if ((id.claims as any)?.admin) {
            toast.success("Welcome Admin!");
            // Fallback: attempt to read paid flag via UID mapping
            try {
              const usersQ = await getDocs(query(collection(firestore, "users"), where("uid", "==", auth.currentUser!.uid)));
              if (!usersQ.empty) {
                const u = usersQ.docs[0].data() as any;
                const isActive = u?.status === "active";
                const isPaid = !!u?.paid;
                if (isActive && !isPaid) {
                  navigate("/pricing", { state: { fromLogin: true } });
                } else {
                  navigate("/dashboard");
                }
              } else {
                navigate("/dashboard");
              }
            } catch {
              navigate("/dashboard");
            }
          } else {
            toast.success("Login successful!");
            navigate("/client");
          }
        } catch (err) {
          console.warn("Could not read token claims after profile read failure:", err);
          toast.success("Login successful!");
          navigate("/client");
        }
      } catch (err) {
        console.warn("Profile quick-read failed:", err);
        toast.success("Signed in — loading your data...");
        // Prefer client routing when profile read fails, unless token claims indicate admin.
        try {
          const id = await getIdTokenResult(user);
          if ((id.claims as any)?.super_admin) navigate("/super-admin");
          else if ((id.claims as any)?.admin) {
            // On error path, still try pricing redirect
            try {
              const usersQ = await getDocs(query(collection(firestore, "users"), where("uid", "==", user.uid)));
              if (!usersQ.empty) {
                const u = usersQ.docs[0].data() as any;
                const isActive = u?.status === "active";
                const isPaid = !!u?.paid;
                if (isActive && !isPaid) {
                  navigate("/pricing", { state: { fromLogin: true } });
                } else {
                  navigate("/dashboard");
                }
              } else {
                navigate("/dashboard");
              }
            } catch {
              navigate("/dashboard");
            }
          }
          else navigate("/client");
        } catch (err2) {
          console.warn("Could not read token claims after profile read failure:", err2);
          navigate("/client");
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err?.code === "auth/network-request-failed") {
        console.error("🔴 FIREBASE AUTH NETWORK ERROR");
        console.error("Fix steps:");
        console.error("1. Go to → https://console.firebase.google.com");
        console.error("2. Select your project: share-650dc");
        console.error("3. Click 'Authentication' in left menu");
        console.error("4. Click 'Sign-in method' tab");
        console.error("5. Enable 'Email/Password'");
        console.error("6. Go to 'Settings' → 'Authorized domains'");
        console.error("7. Add 'localhost' to the list");
        toast.error("Firebase Auth network error. Check browser console for fix steps.");
        return;
      }
      // Show clearer error description
      toast.error(err?.code ? `${err.code}: ${err.message}` : err?.message ?? "Login failed. Please check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary to-accent p-6">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-foreground shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{fromSignup ? "Welcome back to trustNshare" : "Welcome to trustNshare"}</CardTitle>
            <CardDescription className="text-base mt-2">
              {fromSignup ? "Please sign in to your trustNshare account" : "Sign in or create an account to get started"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Welcome back! Enter your credentials to continue.
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Demo: Use any email and password to login (if dev mode)
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export { default } from "./Auth";