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

      // Attempt quick profile read but do not block UI forever
      try {
        const snap = await getDoc(doc(firestore, "users", user.uid));
        const profile = snap.exists() ? snap.data() : null;
        toast.success("Login successful!");
        if (profile?.role === "client") navigate("/client");
        else navigate("/dashboard");
      } catch (err) {
        console.warn("Profile quick-read failed:", err);
        toast.success("Signed in — loading your data...");
        navigate("/dashboard");
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
            <CardTitle className="text-2xl font-bold">{fromSignup ? "Welcome back to SecureShare" : "Welcome to SecureShare"}</CardTitle>
            <CardDescription className="text-base mt-2">
              {fromSignup ? "Please sign in to your SecureShare account" : "Sign in or create an account to get started"}
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

export default Login;