
// src/pages/Signup.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, User, Briefcase, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const domainOptions = ["IT", "Logistics", "HR", "Finance", "Retail", "Healthcare", "Other"] as const;

const Signup: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState<typeof domainOptions[number]>("IT");
  const [customCategory, setCustomCategory] = useState("");
  const [role, setRole] = useState<"admin" | "client">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password should be at least 6 characters");
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

      toast.success("Account created! Please sign in.");

      navigate("/login", { state: { fromSignup: true } });
    } catch (err: any) {
      toast.error(err?.message ?? "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary to-accent p-6">
      <Card className="w-full max-w-lg shadow-elevated">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-foreground shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="text-lg font-semibold">SecureShare</div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-center gap-2 rounded-full bg-muted p-1 w-max mx-auto">
              <Link to="/login" className="px-4 py-1 text-sm rounded-full hover:bg-muted/50">Sign In</Link>
              <div className="px-4 py-1 text-sm rounded-full bg-background font-semibold">Signup</div>
            </div>

            <CardTitle className="text-2xl font-bold mt-4">Welcome to SecureShare</CardTitle>
            <CardDescription className="text-base mt-2">
              Securely create and share files and documents with end-to-end controls.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label>Last name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Name of your company</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Functional category</Label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as typeof domainOptions[number])}
                  className="w-full rounded-md border px-3 py-2"
                >
                  {domainOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Role</Label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="role" value="client" checked={role === "client"} onChange={() => setRole("client")} />
                    <span className="text-sm">Client</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="role" value="admin" checked={role === "admin"} onChange={() => setRole("admin")} />
                    <span className="text-sm">Admin</span>
                  </label>
                </div>
              </div>
            </div>

            {domain === "Other" && (
              <div>
                <Label>Specify functional category</Label>
                <div className="relative">
                  <Input
                    className="pl-3"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter functional category"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-10"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              <div>
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-10"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-3 flex items-center text-muted-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link to="/login" className="underline hover:text-primary">
                  Already have an account?
                </Link>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90 transition-opacity shadow-md">
              {isLoading ? "Creating account..." : "Continue"}
            </Button>

            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <div className="text-sm text-muted-foreground">Or Continue With</div>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="mt-4 flex justify-center">
                <button type="button" className="inline-flex items-center gap-3 rounded-full border px-4 py-2 hover:shadow-sm">
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

            <p className="mt-6 text-center text-sm text-muted-foreground">
              SecureShare helps teams and individuals store, share, and control access to important documents with end-to-end security and audit trails.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export { default } from "./Auth";
