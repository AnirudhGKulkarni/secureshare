// src/pages/adminSignup.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, User, Briefcase, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { doc as fdoc, getDoc as fgetDoc } from "firebase/firestore";

const domainOptions = ["IT", "Logistics", "HR", "Finance", "Retail", "Healthcare", "Other"] as const;

const AdminSignup: React.FC = () => {
  const { currentUser, profile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState<typeof domainOptions[number] | "">("");
  const [customCategory, setCustomCategory] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [googleDriveLink, setGoogleDriveLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-preference');
      if (saved === 'light' || saved === 'dark') {
        return saved === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  // Apply theme to document root
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDarkMode);
      document.documentElement.classList.toggle('light', !isDarkMode);
    }
  }, [isDarkMode]);
    // Autofill from signed-up user profile (except Drive link)
    useEffect(() => {
      const fillFromProfile = async () => {
        try {
          // Check if profile is available from context
          const p = profile;
          
          if (p && typeof p === 'object') {
            // Profile exists - autofill available fields
            console.log("Autofill: Loaded profile data:", {
              firstName: p.firstName,
              lastName: p.lastName,
              email: p.email,
              company: p.company,
              domain: p.domain,
            });
            
            setFirstName(p.firstName || "");
            setLastName(p.lastName || "");
            setEmail(p.email || "");
            setCompany(p.company || "");
            setCustomCategory(p.customCategory || "");
            
            if (p.domain && (domainOptions as readonly string[]).includes(p.domain)) {
              setDomain(p.domain as typeof domainOptions[number]);
            }
            
            return;
          }
          
          // If profile is still loading or null, log it
          if (profile === undefined) {
            console.log("Autofill: Profile still loading (undefined)");
          } else if (profile === null) {
            console.log("Autofill: Profile is explicitly null");
          }
        } catch (e) {
          console.warn("Autofill error:", e);
        }
      };
      
      fillFromProfile();
    }, [profile]);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !company.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate and verify registered username exists in Firestore.
    // If the `usernames` collection is not readable due to rules or eventual consistency,
    // fall back to checking the signed-in user's `users/{uid}` profile for the username.
    const uname = username.trim().toLowerCase();
    if (!uname) {
      toast.error("Please enter your registered username");
      return;
    }

    let verified = false;
    try {
      const unameSnap = await getDoc(doc(firestore, "usernames", uname));
      if (unameSnap.exists()) {
        verified = true;
      }
    } catch (checkErr) {
      console.warn("Username verification (primary) failed:", checkErr);
      // Do not return immediately — we'll attempt a fallback below.
    }

    // Fallback: if the user is signed in, check their users/{uid} doc for the username.
    if (!verified && currentUser) {
      try {
        const uSnap = await fgetDoc(fdoc(firestore, "users", currentUser.uid));
        if (uSnap.exists()) {
          const u: any = uSnap.data();
          if ((u.username ?? "").toLowerCase() === uname) {
            verified = true;
          }
        }
      } catch (fbErr) {
        console.warn("Username verification (fallback) failed:", fbErr);
      }
    }

    if (!verified) {
      toast.error("Could not verify username. If you just signed up, please wait a moment and try again. If the problem persists, contact support.");
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

    // Ensure user is signed in (required to write to Firestore)
    if (!currentUser) {
      toast.error("You must sign up first before submitting an admin request. Please sign up to continue.");
      navigate("/signup", { replace: true });
      return;
    }

    setIsLoading(true);
    try {
      // Save to Firebase "approval_documents" collection
      const docData: any = {
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
      };

      console.log("Submitting admin request with data:", docData);

      const docRef = await addDoc(collection(firestore, "approval_documents"), docData);

      console.log("Admin request submitted successfully:", docRef.id);

      // Update user profile to mark admin request submitted
      try {
        const userRef = doc(firestore, "users", currentUser.uid);
        await updateDoc(userRef, {
          adminRequestSubmitted: true,
          adminRequestSubmittedAt: serverTimestamp(),
        });
        console.log("User profile marked with admin request submission");
        
        // Refresh profile to load the updated adminRequestSubmitted flag
        await refreshProfile();
        console.log("Profile refreshed with admin request status");
      } catch (profileErr: any) {
        console.warn("Could not update user profile:", profileErr?.message || profileErr);
        // Don't fail submission if profile update fails
      }

      toast.success("Admin request submitted! Please wait for super admin approval.");
      // Redirect to waiting approval page
      setTimeout(() => {
        navigate("/waiting-approval", { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error("Submission error details:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
      });
      
      // Provide specific error messages based on error code
      if (err?.code === "permission-denied") {
        toast.error("Permission denied. Please ensure you are signed in and try again.");
      } else {
        toast.error(err?.message ?? "Submission failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative flex min-h-screen items-center justify-center p-6 transition-colors duration-300 ${
      isDarkMode
        ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100"
        : "bg-gradient-to-br from-blue-50 via-white to-gray-50 text-gray-900"
    }`}>
      {/* Back to Home */}
      <Link to="/" className={`absolute top-4 left-4 z-50 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
        isDarkMode
          ? "border-gray-700 bg-gray-900/70 hover:bg-gray-800 text-gray-100"
          : "border-gray-300 bg-white/70 hover:bg-gray-100 text-gray-900"
      }`} style={{
        boxShadow: '0 0 0 2px rgba(10, 157, 176, 0.3)',
        borderColor: 'rgba(10, 157, 176, 0.5)'
      }}>
        <ArrowLeft className="w-4 h-4" />
        Home
      </Link>
      <Card className={`w-full max-w-lg shadow-elevated border transition-colors duration-300 ${
        isDarkMode
          ? "bg-gray-900 text-gray-100 border-gray-800"
          : "bg-white text-gray-900 border-gray-200"
      }`}>
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex items-center gap-3">
            <img src="/lbg.png" alt="trustNshare light" className="h-12 md:h-16 object-contain block dark:hidden" />
            <img src="/bg.png" alt="trustNshare" className="h-12 md:h-16 object-contain hidden dark:block" />
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

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={isDarkMode ? "text-gray-200" : "text-gray-700"}>First name</Label>
                <div className="relative">
                  <User className={`absolute left-3 top-3 h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                  <Input className={`pl-10 border rounded-md transition-all focus:outline-none ${
                    isDarkMode
                      ? "bg-gray-900 text-gray-100 border-gray-700 placeholder-gray-500"
                      : "bg-white text-gray-900 border-gray-300 placeholder-gray-400"
                  }`} value={firstName} onChange={(e) => setFirstName(e.target.value)} onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 157, 176, 0.3)';
                    e.currentTarget.style.borderColor = '#0a9db0';
                  }} onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                  }} required />
                </div>
              </div>
              <div>
                <Label className={isDarkMode ? "text-gray-200" : "text-gray-700"}>Last name</Label>
                <div className="relative">
                  <User className={`absolute left-3 top-3 h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                  <Input className={`pl-10 border rounded-md transition-all focus:outline-none ${
                    isDarkMode
                      ? "bg-gray-900 text-gray-100 border-gray-700 placeholder-gray-500"
                      : "bg-white text-gray-900 border-gray-300 placeholder-gray-400"
                  }`} value={lastName} onChange={(e) => setLastName(e.target.value)} onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 157, 176, 0.3)';
                    e.currentTarget.style.borderColor = '#0a9db0';
                  }} onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                  }} required />
                </div>
              </div>
            </div>

            {/* Registered Username directly below Last name */}
            <div>
              <Label className={isDarkMode ? "text-gray-200" : "text-gray-700"}>Your registered username</Label>
              <div className="relative">
                <User className={`absolute left-3 top-3 h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                <Input
                  className={`pl-10 border rounded-md transition-all focus:outline-none ${
                    isDarkMode
                      ? "bg-gray-900 text-gray-100 border-gray-700 placeholder-gray-500"
                      : "bg-white text-gray-900 border-gray-300 placeholder-gray-400"
                  }`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username used during signup"
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 157, 176, 0.3)';
                    e.currentTarget.style.borderColor = '#0a9db0';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                  }}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className={isDarkMode ? "text-gray-200" : "text-gray-700"}>Name of your company</Label>
                <div className="relative">
                  <Briefcase className={`absolute left-3 top-3 h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                  <Input className={`pl-10 border rounded-md transition-all focus:outline-none ${
                    isDarkMode
                      ? "bg-gray-900 text-gray-100 border-gray-700 placeholder-gray-500"
                      : "bg-white text-gray-900 border-gray-300 placeholder-gray-400"
                  }`} value={company} onChange={(e) => setCompany(e.target.value)} onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 157, 176, 0.3)';
                    e.currentTarget.style.borderColor = '#0a9db0';
                  }} onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                  }} required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className={isDarkMode ? "text-gray-200" : "text-gray-700"}>Functional category</Label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as typeof domainOptions[number])}
                  className={`w-full rounded-md border px-3 py-2 transition-all focus:outline-none ${
                    isDarkMode
                      ? "bg-gray-900 text-gray-100 border-gray-700"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 157, 176, 0.3)';
                    e.currentTarget.style.borderColor = '#0a9db0';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                  }}
                  required
                >
                  <option value="" disabled>Select Functional Category</option>
                  {domainOptions.map((d) => (
                    <option key={d} value={d} className={isDarkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {domain === "Other" && (
              <div>
                <Label className={isDarkMode ? "text-gray-200" : "text-gray-700"}>Specify functional category</Label>
                <div className="relative">
                  <Input
                    className={`pl-3 border rounded-md transition-all focus:outline-none ${
                      isDarkMode
                        ? "bg-gray-900 text-gray-100 border-gray-700 placeholder-gray-500"
                        : "bg-white text-gray-900 border-gray-300 placeholder-gray-400"
                    }`}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter functional category"
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 157, 176, 0.3)';
                      e.currentTarget.style.borderColor = '#0a9db0';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <Label className={isDarkMode ? "text-gray-200" : "text-gray-700"}>Email</Label>
              <div className="relative">
                <Mail className={`absolute left-3 top-3 h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                <Input className={`pl-10 border rounded-md transition-all focus:outline-none ${
                  isDarkMode
                    ? "bg-gray-900 text-gray-100 border-gray-700 placeholder-gray-500"
                    : "bg-white text-gray-900 border-gray-300 placeholder-gray-400"
                }`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 157, 176, 0.3)';
                  e.currentTarget.style.borderColor = '#0a9db0';
                }} onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                }} required />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className={isDarkMode ? "text-gray-200" : "text-gray-700"}>Google Drive link for verification documents</Label>
                <a href="/List of Documents that are Accepted.pdf" target="_blank" rel="noopener noreferrer" className={`text-xs underline ${isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}>
                  View Accepted Documents List
                </a>
              </div>
              <div className="relative">
                <Input
                  className={`border rounded-md transition-all focus:outline-none ${
                    isDarkMode
                      ? "bg-gray-900 text-gray-100 border-gray-700 placeholder-gray-500"
                      : "bg-white text-gray-900 border-gray-300 placeholder-gray-400"
                  }`}
                  type="url"
                  value={googleDriveLink}
                  onChange={(e) => setGoogleDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 157, 176, 0.3)';
                    e.currentTarget.style.borderColor = '#0a9db0';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                  }}
                  required
                />
              </div>
              <div className={`mt-2 p-3 border rounded-md ${
                isDarkMode
                  ? "bg-gradient-to-r from-teal-950/30 to-cyan-950/30 border-teal-700/50"
                  : "bg-gradient-to-r from-teal-50/50 to-cyan-50/50 border-teal-300/50"
              }`}>
                <p className={`text-xs ${isDarkMode ? "text-teal-200" : "text-teal-800"}`}>
                  <strong>Instructions:</strong>
                  <br />1. Upload your verification documents to Google Drive
                  <br />2. Set sharing permissions to "Anyone with the link can view"
                  <br />3. Copy and paste the sharing link in the above text box
                  <br />4. The Super admin will review your documents and get back to you
                </p>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95" style={{ backgroundColor: isDarkMode ? '#0F5080' : '#113738' }}>
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
