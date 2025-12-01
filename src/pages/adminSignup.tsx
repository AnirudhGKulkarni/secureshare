// src/pages/adminSignup.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, User, Briefcase, Mail, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

const domainOptions = ["IT", "Logistics", "HR", "Finance", "Retail", "Healthcare", "Other"] as const;
const allowedDocumentTypes = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx", ".xlsx", ".xls", ".ppt", ".pptx"];

const AdminSignup: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState<typeof domainOptions[number]>("IT");
  const [customCategory, setCustomCategory] = useState("");
  const [email, setEmail] = useState("");
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
        toast.error(`File too large: ${file.name}. Maximum size is 5MB per file.`);
        continue;
      }

      if (totalSize + file.size > 5 * 1024 * 1024) { // 5MB total limit
        toast.error(`Total upload size would exceed 5MB limit.`);
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

    if (uploadedDocuments.length === 0) {
      toast.error("Please upload at least one document for verification");
      return;
    }

    setIsLoading(true);
    try {
      // Convert files to base64 for storage
      const documentData: { fileName: string; fileSize: number; fileType: string; base64: string }[] = [];

      for (const file of uploadedDocuments) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        documentData.push({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          base64: base64,
        });
      }

      // Save to Firebase "approval_documents" collection
      await addDoc(collection(firestore, "approval_documents"), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        company: company.trim(),
        domain: domain,
        customCategory: customCategory.trim() || null,
        documents: documentData,
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
            <CardTitle className="text-2xl font-bold">Welcome to SecureShare</CardTitle>
            <CardTitle className="text-xl font-semibold mt-2">Admin Registration</CardTitle>
            <CardDescription className="text-base mt-2">
              Register as an admin. Please verify your identity with supporting documents.
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
                  <Input className="pl-10" value={company} onChange={(e) => setCompany(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
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

            <div>
              <div className="flex items-center justify-between">
                <Label>Upload verification documents</Label>
                <a href="/List of Documents that are Accepted.pdf" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline hover:text-accent-foreground">
                  View Accepted Documents List
                </a>
              </div>
              <div className="relative">
                <label className="flex items-center justify-center w-full px-3 py-3 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors">
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
                Allowed formats: {allowedDocumentTypes.join(", ")} (Max 5MB total)
              </p>
            </div>

            {uploadedDocuments.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded documents ({uploadedDocuments.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadedDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm truncate flex-1">{doc.name}</span>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="ml-2 p-1 hover:bg-background rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90 transition-opacity shadow-md">
              {isLoading ? "Submitting..." : "Submit for Approval"}
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              SecureShare helps teams and individuals store, share, and control access to important documents with end-to-end security and audit trails.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSignup;
