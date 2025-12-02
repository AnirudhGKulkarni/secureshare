// src/pages/ForgotPassword.tsx
import React, { useState } from "react";
import { Mail, Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      toast.success("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6 text-gray-100">
      {/* Back to Home */}
      <Link to="/login" className="absolute top-4 left-4 z-50 inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm hover:bg-gray-800 hover:border-blue-500 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Login
      </Link>
      <Card className="w-full max-w-md shadow-elevated bg-gray-900 text-gray-100 border border-gray-800">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
            <CardDescription className="text-base mt-2">Enter your email and we'll send reset instructions.</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-200">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input className="pl-10 bg-gray-900 border border-gray-700 text-gray-100 placeholder:text-gray-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            {/* Removed inline back-to-login link; top-left button now routes to Login */}

            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send reset email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
