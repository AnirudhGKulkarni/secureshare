import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, User, Briefcase, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getDoc, doc, setDoc } from "firebase/firestore";
import { firestore, auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, getIdTokenResult } from "firebase/auth";

const domainOptions = ["IT", "Logistics", "HR", "Finance", "Retail", "Healthcare", "Other"] as const;

const Auth: React.FC = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // shared login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // signup fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [domain, setDomain] = useState<string>("");
  const [customCategory, setCustomCategory] = useState("");
  const [role, setRole] = useState<"admin" | "client">("client");
  const [confirm, setConfirm] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const googleInProgressRef = useRef(false);

  // Carousel items for right-hand illustration
  const carouselItems = [
    {
      title: "Secure vault",
      svg: (
        <svg viewBox="0 0 200 200" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Secure vault illustration">
          <defs>
            <linearGradient id="g1a" x1="0" x2="1">
              <stop offset="0%" stopColor="#e6f0ff" />
              <stop offset="100%" stopColor="#eaf6ff" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="200" height="200" rx="12" fill="url(#g1a)" />
          <g transform="translate(40 35)">
            <rect x="0" y="10" width="120" height="90" rx="14" fill="#dff0ff" />
            <rect x="8" y="18" width="104" height="74" rx="10" fill="#fff" />
            <circle cx="84" cy="56" r="18" fill="#e6f2ff" />
            <circle cx="84" cy="56" r="10" fill="#2b6ef6" />
            <g transform="translate(80 52)" fill="#fff">
              <rect x="-1" y="-1" width="2" height="12" rx="1" />
              <rect x="6" y="-1" width="2" height="12" rx="1" transform="rotate(60)" />
              <rect x="-7" y="-1" width="2" height="12" rx="1" transform="rotate(-60)" />
            </g>
            <rect x="20" y="30" width="60" height="8" rx="4" fill="#f3f7ff" />
            <rect x="20" y="44" width="36" height="8" rx="4" fill="#f3f7ff" />
          </g>
        </svg>
      ),
    },
    {
      title: "Encrypted sharing",
      svg: (
        <svg viewBox="0 0 200 200" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Encrypted sharing illustration">
          <defs>
            <linearGradient id="g2a" x1="0" x2="1">
              <stop offset="0%" stopColor="#fff7e6" />
              <stop offset="100%" stopColor="#eef9f7" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="200" height="200" rx="12" fill="url(#g2a)" />
          <g transform="translate(30 30)">
            <rect x="10" y="20" width="120" height="80" rx="10" fill="#fff" stroke="#e6eefb" />
            <path d="M40 60h40v10H40z" fill="#2b6ef6" />
            <circle cx="100" cy="40" r="18" fill="#f3f7ff" stroke="#cfe6ff" />
            <path d="M96 36h8v8h-8z" fill="#2b6ef6" />
          </g>
        </svg>
      ),
    },
    {
      title: "Audit & control",
      svg: (
        <svg viewBox="0 0 200 200" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Audit illustration">
          <defs>
            <linearGradient id="g3a" x1="0" x2="1">
              <stop offset="0%" stopColor="#eef7ff" />
              <stop offset="100%" stopColor="#f2fbf9" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="200" height="200" rx="12" fill="url(#g3a)" />
          <g transform="translate(30 30)">
            <rect x="6" y="10" width="120" height="80" rx="8" fill="#fff" stroke="#e6eefb" />
            <rect x="16" y="22" width="36" height="8" rx="4" fill="#2b6ef6" />
            <rect x="16" y="34" width="84" height="8" rx="4" fill="#f3f7ff" />
            <circle cx="110" cy="60" r="14" fill="#fff" stroke="#cfe6ff" />
            <path d="M106 56h8v8h-8z" fill="#2b6ef6" />
          </g>
        </svg>
      ),
    },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % carouselItems.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Real-time username availability check with debounce
  useEffect(() => {
    const uname = username.trim().toLowerCase();
    if (!uname) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const snap = await getDoc(doc(firestore, "usernames", uname));
        setUsernameStatus(snap.exists() ? "taken" : "available");
      } catch (err) {
        console.warn("Username check failed:", err);
        setUsernameStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(email.trim(), password);
      try {
        const snap = await getDoc(doc(firestore, "users", user.uid));
        const profile = snap.exists() ? snap.data() : null;
        toast.success("Login successful!");

        // Prefer authoritative Firestore profile when available.
        if (profile && profile.role === "client") {
          navigate("/client");
          return;
        }

        if (profile && profile.role === "admin") {
          navigate("/dashboard");
          return;
        }

        // If profile is missing or role unknown, check token claims (server-side) as fallback.
        try {
          const id = await getIdTokenResult(user);
          if ((id.claims as any)?.admin) {
            // ensure Firestore reflects admin role if possible
            try {
              const ref = doc(firestore, "users", user.uid);
              await setDoc(ref, { role: "admin" }, { merge: true });
            } catch (err) {
              console.warn("Could not sync admin role to Firestore:", err);
            }
            navigate("/dashboard");
            return;
          }
        } catch (err) {
          console.warn("Could not read token claims after login (fallback):", err);
        }

        // Default to client for safety when role not known.
        navigate("/client");
      } catch (err) {
        console.warn("Profile quick-read failed:", err);
        toast.success("Signed in — loading your data...");
        // If profile read fails (often due to Firestore rules), prefer client routing
        // unless token claims explicitly mark user as admin.
        try {
          const id = await getIdTokenResult(user);
          if ((id.claims as any)?.admin) navigate("/dashboard");
          else navigate("/client");
        } catch (err2) {
          console.warn("Could not read token claims after profile read failure:", err2);
          // Default to client to avoid sending new users to admin dashboard.
          navigate("/client");
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err?.code ? `${err.code}: ${err.message}` : err?.message ?? "Login failed. Please check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (googleInProgressRef.current) return;
    googleInProgressRef.current = true;
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Ensure a Firestore user doc exists; if not, create a default one.
      const ref = doc(firestore, "users", user.uid);
      let snap = null as any;
      try {
        snap = await getDoc(ref);
      } catch (err: any) {
        const isPermDenied = err && (err.code === "permission-denied" || String(err).toLowerCase().includes("permission"));
        console.warn("Could not read user doc during Google sign-in (non-blocking):", err);
        if (!isPermDenied) throw err; // rethrow unexpected errors
        snap = null;
      }

      if (!snap || !snap.exists()) {
        // Try to split displayName into first/last
        const displayName = user.displayName ?? "";
        const [firstName = "", ...rest] = displayName.split(" ");
        const lastName = rest.join(" ") || "";

        // Infer role from token claims if possible (so older admins without a profile aren't created as clients)
        let inferredRole: "admin" | "client" = "client";
        try {
          const id = await getIdTokenResult(user);
          if ((id.claims as any)?.admin) inferredRole = "admin";
        } catch (err) {
          console.warn("Could not read token claims while creating user doc:", err);
        }

        try {
          await setDoc(ref, {
            firstName,
            lastName,
            email: user.email ?? "",
            company: null,
            companyDomain: null,
            domain: "Other",
            role: inferredRole,
            createdAt: new Date().toISOString(),
          });
        } catch (err: any) {
          const isPermDenied = err && (err.code === "permission-denied" || String(err).toLowerCase().includes("permission"));
          console.warn("Could not create user doc during Google sign-in (non-blocking):", err);
          if (!isPermDenied) {
            // If it's an unexpected error, rethrow so outer catch can handle it.
            throw err;
          }
          // Permission errors are expected under strict rules; continue without failing sign-in.
        }
      }

      // After successful Google sign-in, try a quick read to decide where to navigate.
      try {
        const snap2 = await getDoc(doc(firestore, "users", user.uid));
        const profile = snap2.exists() ? snap2.data() : null;
        toast.success("Signed in with Google");

        // Check token claims (authoritative for admin)
        let isAdminClaim2 = false;
        try {
          const id = await getIdTokenResult(user);
          if ((id.claims as any)?.admin) isAdminClaim2 = true;
        } catch (err) {
          console.warn("Could not read token claims after Google sign-in:", err);
        }

        // Prefer profile role if available
        if (profile && profile.role === "client") {
          navigate("/client");
          return;
        }

        if (profile && profile.role === "admin") {
          navigate("/dashboard");
          return;
        }

        // Fallback to token claims for Google-signins
        if (isAdminClaim2) {
          try {
            if (!profile || profile.role !== "admin") {
              await setDoc(doc(firestore, "users", user.uid), { role: "admin" }, { merge: true });
            }
          } catch (err) {
            console.warn("Could not sync admin role to Firestore (google):", err);
          }
          navigate("/dashboard");
          return;
        }

        // Default to client
        navigate("/client");
      } catch (err) {
        console.warn("Post-Google quick profile read failed:", err);
        // Prefer client routing when profile read fails during Google sign-in,
        // but check token claims first to respect any admin claims.
        try {
          const id = await getIdTokenResult(user);
          if ((id.claims as any)?.admin) navigate("/dashboard");
          else navigate("/client");
        } catch (err2) {
          console.warn("Could not read token claims after Google profile read failure:", err2);
          navigate("/client");
        }
      }
    } catch (err: any) {
      // Many browsers / flows may fire a cancelled-popup-request when a popup
      // was programmatically closed because another auth request took precedence.
      // This is noisy but not actionable if the sign-in actually completed.
      const code = err?.code ?? err?.message;
      if (code === "auth/cancelled-popup-request") {
        console.debug("Google sign-in cancelled-popup-request ignored");
      } else if (code === "auth/popup-closed-by-user") {
        toast.error("Google sign-in popup closed before completing.");
      } else {
        console.error("Google sign-in error:", err);
        toast.error(err?.message ?? "Google sign-in failed");
      }
    } finally {
      googleInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password should be at least 6 characters");
      return;
    }
    const uname = username.trim().toLowerCase();
    if (!uname) {
      toast.error("Please choose a username");
      return;
    }
    if (usernameStatus === "taken") {
      toast.error("Username already taken");
      return;
    }
    setIsLoading(true);
    try {

      const user = await signup({
        email: email.trim(),
        password,
        firstName,
        lastName,
        company,
        domain,
        role,
      });

      // Reserve the username and attach to user profile
      try {
        await setDoc(doc(firestore, "usernames", uname), {
          uid: user.uid,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Could not reserve username:", err);
      }

      try {
        await setDoc(doc(firestore, "users", user.uid), { username: uname }, { merge: true });
      } catch (err) {
        console.warn("Could not save username to user profile:", err);
      }

      toast.success("Account created! Please sign in.");
      setMode("signin");
      setShowWelcomeBack(true);
      // Clear shared login fields so the login toggle shows empty inputs
      setEmail("");
      setPassword("");
      setConfirm("");
      setUsername("");
    } catch (err: any) {
      toast.error(err?.message ?? "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-stretch bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100">
      {/* Back to Home */}
      <Link to="/" className="absolute top-4 left-4 z-50 inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm hover:bg-gray-800 hover:border-blue-500 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Home
      </Link>

      <Card className="w-full max-w-none min-h-screen md:rounded-xl md:shadow-elevated rounded-none shadow-none bg-gray-900 text-gray-100 border border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-full">
          <div className="p-6 md:p-10 flex flex-col justify-center items-center">
            <div className="w-full max-w-md">
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-sm">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="text-lg font-semibold">trustNshare</div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-center gap-2 rounded-full bg-gray-800/80 border border-gray-700 p-1 w-max mx-auto">
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setShowWelcomeBack(false); }}
                    className={`px-4 py-1 text-sm rounded-full transition-colors ${
                      mode === 'signin' ? 'bg-gray-900 text-gray-100 border border-blue-500/40 shadow-sm' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className={`px-4 py-1 text-sm rounded-full transition-colors ${
                      mode === 'signup' ? 'bg-gray-900 text-gray-100 border border-blue-500/40 shadow-sm' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    Signup
                  </button>
                </div>

                <CardTitle className="text-2xl font-bold mt-4">{mode === 'signin' ? (showWelcomeBack ? 'Welcome back to trustNshare' : 'Welcome to trustNshare') : 'Welcome to trustNshare'}</CardTitle>
                <CardDescription className="text-base mt-2">
                  {mode === 'signin'
                    ? (showWelcomeBack ? 'Welcome back — please sign in to your trustNshare account' : 'Sign in or create an account to get started')
                    : 'Securely create an account to store and share files with end-to-end controls.'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {mode === 'signin' ? (
                <form onSubmit={(e) => { handleLogin(e); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input id="email" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500"
                        required
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-3 flex items-center text-gray-400"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <a href="/forgot-password" className="underline hover:text-primary">Forgot password?</a>
                    </div>
                    <div className="text-sm">
                      <button type="button" onClick={() => setMode('signup')} className="underline hover:text-primary">Create an account</button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90 transition-opacity shadow-md" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Login"}
                  </Button>

                  <div className="mt-6 text-center">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <div className="text-sm text-muted-foreground">Or Continue With</div>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="mt-4 flex justify-center">
                      <button type="button" onClick={handleGoogle} disabled={isLoading} aria-busy={isLoading} className="inline-flex items-center gap-3 rounded-full border px-4 py-2 hover:shadow-sm disabled:opacity-60">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.64 9.2045c0-.638-.0576-1.2525-.1656-1.8473H9v3.497h4.844c-.208 1.12-.84 2.07-1.7976 2.71v2.25h2.9052c1.7-1.566 2.688-3.88 2.688-6.61z" fill="#4285F4"/>
                          <path d="M9 18c2.43 0 4.47-.806 5.96-2.186l-2.9052-2.25C11.46 13.086 10.27 13.5 9 13.5c-2.31 0-4.27-1.56-4.97-3.66H1.072v2.3C2.56 15.78 5.54 18 9 18z" fill="#34A853"/>
                          <path d="M4.03 10.84a5.41 5.41 0 01-.29-1.84c0-.64.11-1.26.29-1.84V4.86H1.072A9 9 0 000 9c0 1.46.36 2.84 1.072 4.14L4.03 10.84z" fill="#FBBC05"/>
                          <path d="M9 3.6c1.32 0 2.5.45 3.43 1.34l2.57-2.57C13.46.99 11.43 0 9 0 5.54 0 2.56 2.22 1.072 4.86L4.03 7.6C4.73 5.5 6.69 3.6 9 3.6z" fill="#EA4335"/>
                        </svg>
                        <span className="text-sm">Continue with Google</span>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>First name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input className="pl-10 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                      </div>
                    </div>
                    <div>
                      <Label>Last name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input className="pl-10 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                      </div>
                    </div>
                  </div>

                  {/* Username field directly under Last name */}
                  <div>
                    <Label>Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-10 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a unique username"
                        required
                      />
                    </div>
                    {usernameStatus === "checking" && (
                      <p className="mt-1 text-xs text-blue-400">Checking availability...</p>
                    )}
                    {usernameStatus === "available" && (
                      <p className="mt-1 text-xs text-green-400">✓ Username is available</p>
                    )}
                    {usernameStatus === "taken" && (
                      <p className="mt-1 text-xs text-red-400">✗ Username already taken</p>
                    )}
                    {usernameStatus === "idle" && (
                      <p className="mt-1 text-xs text-muted-foreground">Your username will be used for admin verification.</p>
                    )}
                  </div>

                  <div>
                    <Label>Name of your company</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input className="pl-10 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500" value={company} onChange={(e) => setCompany(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label>Functional category</Label>
                      <select
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className="w-full rounded-md border px-3 py-2 bg-gray-900 border-gray-700 text-gray-100"
                        required
                      >
                        <option value="" disabled>Select</option>
                        {domainOptions.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {domain === "Other" && (
                    <div>
                      <Label>Specify functional category</Label>
                      <div className="relative">
                        <Input className="pl-3 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Enter functional category" />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input className="pl-10 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          className="pl-10 pr-10 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-3 flex items-center text-gray-400">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label>Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input className="pl-10 pr-10 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500" type={showPassword ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <button type="button" onClick={() => setMode('signin')} className="underline hover:text-primary">Already have an account?</button>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90 transition-opacity shadow-md">
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>

                  <div className="mt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <div className="text-sm text-muted-foreground">Or Continue With</div>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="mt-4 flex justify-center">
                      <button type="button" onClick={handleGoogle} disabled={isLoading} aria-busy={isLoading} className="inline-flex items-center gap-3 rounded-full border px-4 py-2 hover:shadow-sm disabled:opacity-60">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.64 9.2045c0-.638-.0576-1.2525-.1656-1.8473H9v3.497h4.844c-.208 1.12-.84 2.07-1.7976 2.71v2.25h2.9052c1.7-1.566 2.688-3.88 2.688-6.61z" fill="#4285F4"/>
                          <path d="M9 18c2.43 0 4.47-.806 5.96-2.186l-2.9052-2.25C11.46 13.086 10.27 13.5 9 13.5c-2.31 0-4.27-1.56-4.97-3.66H1.072v2.3C2.56 15.78 5.54 18 9 18z" fill="#34A853"/>
                          <path d="M4.03 10.84a5.41 5.41 0 01-.29-1.84c0-.64.11-1.26.29-1.84V4.86H1.072A9 9 0 000 9c0 1.46.36 2.84 1.072 4.14L4.03 10.84z" fill="#FBBC05"/>
                          <path d="M9 3.6c1.32 0 2.5.45 3.43 1.34l2.57-2.57C13.46.99 11.43 0 9 0 5.54 0 2.56 2.22 1.072 4.86L4.03 7.6C4.73 5.5 6.69 3.6 9 3.6z" fill="#EA4335"/>
                        </svg>
                        <span className="text-sm">Continue with Google</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 text-center text-sm text-muted-foreground">
                    trustNshare helps teams and individuals store, share, and control access to important documents with end-to-end security and audit trails.
                  </div>
                </form>
              )}
            </CardContent>
            </div>
          </div>

          <div className="flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-6 md:sticky md:top-0 md:h-screen">
            <div className="p-4 md:p-8 w-full flex items-center justify-center h-full">
              <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 flex items-center justify-center w-full h-full max-w-5xl">
                <div className="w-full h-full flex items-center justify-center relative">
                  <div className="overflow-hidden rounded-md w-full h-full flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-full h-full flex items-center justify-center px-6">
                        <div className="w-full h-full">
                          {/* SVGs scale to fill the available height while preserving aspect ratio */}
                          <div className="w-full h-full">{carouselItems[current].svg}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                    <button onClick={() => setCurrent((c) => (c - 1 + carouselItems.length) % carouselItems.length)} className="bg-gray-800 text-gray-100 rounded-full p-3 shadow border border-gray-700 hover:border-blue-500">
                      ‹
                    </button>
                  </div>

                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
                    <button onClick={() => setCurrent((c) => (c + 1) % carouselItems.length)} className="bg-gray-800 text-gray-100 rounded-full p-3 shadow border border-gray-700 hover:border-blue-500">
                      ›
                    </button>
                  </div>

                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 z-10">
                    {carouselItems.map((_, i) => (
                      <button key={i} onClick={() => setCurrent(i)} className={`w-3 h-3 rounded-full ${i === current ? 'bg-blue-500' : 'bg-gray-700'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
