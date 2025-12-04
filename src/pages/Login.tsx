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
import { getDoc, doc } from "firebase/firestore";
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
          toast.success("Welcome Admin!");
          navigate("/dashboard");
          return;
        }

        if (profile && profile.role === "client") {
          toast.success("Login successful!");
          navigate("/client");
          return;
        }

        // If profile missing or ambiguous, fall back to token claims
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
            navigate("/dashboard");
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
          else if ((id.claims as any)?.admin) navigate("/dashboard");
          else navigate("/client");
        } catch (err2) {
          console.warn("Could not read token claims after profile read failure:", err2);
          navigate("/client");
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-3 flex items-center text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <Link to="/forgot-password" className="underline hover:text-primary">Forgot password?</Link>
              </div>
              <div className="text-sm">
                <Link to="/signup" className="underline hover:text-primary">Create an account</Link>
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90 transition-opacity shadow-md" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">Demo: Use any email and password to login (if dev mode)</p>
        </CardContent>
      </Card>
    </div>
  );
};

export { default } from "./Auth";