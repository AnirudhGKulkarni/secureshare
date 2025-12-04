// src/pages/adminSignup.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, User, Briefcase, Mail, Upload, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

const domainOptions = ["IT", "Logistics", "HR", "Finance", "Retail", "Healthcare", "Other"] as const;
const allowedDocumentTypes = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx", ".xlsx", ".xls", ".ppt", ".pptx"];

const AdminSignup: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState<string>("");
  const [customCategory, setCustomCategory] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const navigate = useNavigate();

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    let totalSize = 0;
    for (const file of uploadedDocuments) {
      totalSize += file.size;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      
      if (!allowedDocumentTypes.includes(fileExtension)) {
        toast.error(`File type not allowed: ${file.name}. Allowed types: ${allowedDocumentTypes.join(", ")}`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit per file
        toast.error(`File too large: ${file.name}. Maximum size is 10MB per file.`);
        continue;
      }

      if (totalSize + file.size > 25 * 1024 * 1024) { // 25MB total limit
        toast.error(`Total upload size would exceed 25MB limit.`);
        break;
      }

      totalSize += file.size;
      setUploadedDocuments((prev) => [...prev, file]);
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments((prev) => prev.filter((_, i) => i !== index));
  };

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

    if (uploadedDocuments.length === 0) {
      toast.error("Please upload at least one document for verification");
      return;
    }

    setIsLoading(true);
    try {
      // Upload files to Vercel Blob (signed URL flow) and collect metadata + URLs
      const totalFiles = uploadedDocuments.length;
      const documentData: { fileName: string; fileSize: number; fileType: string; url: string }[] = [];
      let completed = 0;

      const uploadOne = async (file: File) => {
        // Use a nested path for organization in the Blob store
        const path = `admin-approvals/${uname}/${Date.now()}-${file.name}`;

        // Upload the raw file to our API which will store it in Vercel Blob
        const uploadRes = await fetch(`/api/blob-upload?path=${encodeURIComponent(path)}`, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });
        if (!uploadRes.ok) {
          let detail = "";
          try { detail = await uploadRes.text(); } catch {}
          throw new Error(`Upload failed (${uploadRes.status}) ${detail}`);
        }
        const data = await uploadRes.json();
        const fileUrl: string = data?.url;
        if (!fileUrl) throw new Error("Upload succeeded but no URL returned");

        documentData.push({ fileName: file.name, fileSize: file.size, fileType: file.type, url: fileUrl });
        completed += 1;
        setUploadProgress(Math.round((completed / totalFiles) * 100));
      };

      // Limit concurrency to 2
      const concurrency = Math.min(2, totalFiles);
      let index = 0;
      const workers: Promise<void>[] = [];
      for (let c = 0; c < concurrency; c++) {
        workers.push(
          (async () => {
            while (index < uploadedDocuments.length) {
              const current = uploadedDocuments[index++];
              await uploadOne(current);
            }
          })()
        );
      }
      await Promise.all(workers);

      // Save to Firebase "approval_documents" collection
      await addDoc(collection(firestore, "approval_documents"), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: uname,
        email: email.trim(),
        company: company.trim(),
        domain: domain,
        customCategory: customCategory.trim() || null,
        documents: documentData,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      toast.success("Submitted — please wait for approval");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(err?.message ?? "Submission failed");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
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
            <div className="mt-3 text-sm text-muted-foreground">
              Note: Before proceeding with admin registration, you must have a registered username and password. If you haven't created them yet, please use the Signup tab on the login page.
              <span className="ml-1">
                <Link to="/login" className="underline text-primary hover:text-accent-foreground">Go to Login/Signup</Link>
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
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
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 bg-background text-foreground border-border"
                  required
                >
                  <option value="" disabled>Select</option>
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
                <Label>Upload verification documents</Label>
                <a href="/List of Documents that are Accepted.pdf" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline hover:text-accent-foreground">
                  View Accepted Documents List
                </a>
              </div>
              <div className="relative">
                <label className="flex items-center justify-center w-full px-3 py-3 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors bg-background text-foreground border-border">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload or drag and drop</span>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={handleDocumentUpload}
                    accept={allowedDocumentTypes.join(",")}
                    className="hidden"
                    required={uploadedDocuments.length === 0}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Allowed formats: {allowedDocumentTypes.join(", ")} (Max 10MB per file, 25MB total)
              </p>
            </div>

            {uploadedDocuments.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded documents ({uploadedDocuments.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadedDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded-md border border-gray-700">
                      <span className="text-sm truncate flex-1">{doc.name}</span>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="ml-2 p-1 hover:bg-gray-900 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading && uploadProgress > 0 && (
              <div className="w-full h-2 bg-gray-800 rounded-md overflow-hidden mb-2">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
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
