// src/pages/Signup.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, User, Briefcase, Globe, Mail, Lock } from "lucide-react";
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
  const [companyDomain, setCompanyDomain] = useState("");
  const [domain, setDomain] = useState<typeof domainOptions[number]>("IT");
  const [role, setRole] = useState<"admin" | "client">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
      await signup({
        email: email.trim(),
        password,
        firstName,
        lastName,
        company,
        companyDomain,
        domain,
        role,
      });
      toast.success("Account created! Redirecting...");
      navigate(role === "client" ? "/client" : "/dashboard");
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-foreground shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription className="text-base mt-2">
              Register SecureShare — fast and secure
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Company</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Company domain</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={companyDomain} onChange={(e) => setCompanyDomain(e.target.value)} placeholder="example.com" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Domain</Label>
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
                  <Input className="pl-10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label>Confirm</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
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
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
