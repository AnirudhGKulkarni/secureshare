// src/pages/adminSignup.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, User, Briefcase, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

const domainOptions = ["IT", "Logistics", "HR", "Finance", "Retail", "Healthcare", "Other"] as const;

const AdminSignup: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState<typeof domainOptions[number]>("IT");
  const [customCategory, setCustomCategory] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [googleDriveLink, setGoogleDriveLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !company.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate and verify registered username exists in Firestore
    const uname = username.trim().toLowerCase();
    if (!uname) {
      toast.error("Please enter your registered username");
      return;
    }
    // No strict format rules for admin username; only require non-empty and existence
    try {
      const unameSnap = await getDoc(doc(firestore, "usernames", uname));
      if (!unameSnap.exists()) {
        toast.error("Username not found. Please use the username you registered during signup.");
        return;
      }
    } catch (checkErr) {
      console.warn("Username verification failed:", checkErr);
      toast.error("Could not verify username. Please try again.");
      return;
    }

    if (!googleDriveLink.trim()) {
      toast.error("Please provide a Google Drive link for verification documents");
      return;
    }

    // Basic Google Drive link validation
    if (!googleDriveLink.includes('drive.google.com') && !googleDriveLink.includes('docs.google.com')) {
      toast.error("Please provide a valid Google Drive link");
      return;
    }

    setIsLoading(true);
    try {
      // Save to Firebase "approval_documents" collection
      await addDoc(collection(firestore, "approval_documents"), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: uname,
        email: email.trim(),
        company: company.trim(),
        domain: domain,
        customCategory: customCategory.trim() || null,
        googleDriveLink: googleDriveLink.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      toast.success("Please wait for the approval");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(err?.message ?? "Submission failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6 text-gray-100">
      {/* Back to Home */}
      <Link to="/" className="absolute top-4 left-4 z-50 inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm hover:bg-gray-800 hover:border-blue-500 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Home
      </Link>
      <Card className="w-full max-w-lg shadow-elevated bg-gray-900 text-gray-100 border border-gray-800">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="text-lg font-semibold">trustNshare</div>
          </div>

          <div className="pt-2">
            <CardTitle className="text-2xl font-bold">Welcome to trustNshare</CardTitle>
            <CardTitle className="text-xl font-semibold mt-2">Admin Registration</CardTitle>
            <CardDescription className="text-base mt-2">
              Register as an admin. Please verify your identity with supporting documents.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* Prerequisite note with link to Login */}
          <div className="mb-4 p-3 rounded-md border border-blue-800/50 bg-blue-950/30 text-sm">
            <p className="text-blue-200">
              <strong>Note:</strong> Before proceeding with the registration, you must have a registered username and password. Please create one via the signup page if you haven't already done so.
              {" "}
              <Link to="/login" className="underline text-primary hover:text-accent-foreground ml-1">Go to Login/Signup</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 bg-background text-foreground border-border placeholder:text-muted-foreground" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label>Last name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 bg-background text-foreground border-border placeholder:text-muted-foreground" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* Registered Username directly below Last name */}
            <div>
              <Label>Your registered username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10 bg-background text-foreground border-border placeholder:text-muted-foreground"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username used during signup"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Name of your company</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 bg-background text-foreground border-border placeholder:text-muted-foreground" value={company} onChange={(e) => setCompany(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Functional category</Label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as typeof domainOptions[number])}
                  className="w-full rounded-md border px-3 py-2 bg-background text-foreground border-border"
                >
                  {domainOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {domain === "Other" && (
              <div>
                <Label>Specify functional category</Label>
                <div className="relative">
                  <Input
                    className="pl-3 bg-background text-foreground border-border placeholder:text-muted-foreground"
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
                <Input className="pl-10 bg-background text-foreground border-border placeholder:text-muted-foreground" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Google Drive link for verification documents</Label>
                <a href="/List of Documents that are Accepted.pdf" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline hover:text-accent-foreground">
                  View Accepted Documents List
                </a>
              </div>
              <div className="relative">
                <Input
                  className="bg-background text-foreground border-border placeholder:text-muted-foreground"
                  type="url"
                  value={googleDriveLink}
                  onChange={(e) => setGoogleDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  required
                />
              </div>
              <div className="mt-2 p-3 bg-blue-950/30 border border-blue-800/50 rounded-md">
                <p className="text-xs text-blue-200">
                  <strong>Instructions:</strong>
                  <br />1. Upload your verification documents to Google Drive
                  <br />2. Set sharing permissions to "Anyone with the link can view"
                  <br />3. Copy and paste the sharing link in the above text box
                </p>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90 transition-opacity shadow-md">
              {isLoading ? "Submitting..." : "Submit for Approval"}
            </Button>

            <p className="mt-6 text-center text-sm text-gray-400">
              trustNshare helps teams and individuals store, share, and control access to important documents with end-to-end security and audit trails.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSignup;
