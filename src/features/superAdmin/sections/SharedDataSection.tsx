import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { collection, onSnapshot, query, where, doc, getDoc, addDoc, serverTimestamp, getDocs, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { FileText, Calendar, Lock, Download, Upload, CheckCircle, Shield, Share2 } from "lucide-react";
import type { SharedDataDoc, UserProfile } from "../types";
import { deleteSharedFile, uploadAndShareFile } from "../services/sharedDataService";
import { writeAuditLog } from "../services/auditLogsService";
import { isSuperAdminRole } from "../services/superAdminGuards";
import policiesData from "@/data/policies.json";
import {
  generateDataFingerprint,
  generateSessionIdentityToken,
  generateSecureTrustSignature,
  verifyFileAccessMiddleware,
  logAccessEvent,
} from "@/lib/scda";

type SharedRow = SharedDataDoc & { id: string };

interface ReceivedData {
  id: string;
  fileName: string;
  sharedBy: string;
  sharedByEmail: string;
  receivedAt: any;
}

interface Policy {
  policyName: string;
  policyDescription: string;
  policyCategory: string;
  status: string;
  id?: string;
}

export function SharedDataSection() {
  const { currentUser, profile } = useAuth();
  const [adminUsers, setAdminUsers] = React.useState<UserProfile[]>([]);
  const [sharedByMe, setSharedByMe] = React.useState<SharedRow[]>([]);
  const [receivedData, setReceivedData] = React.useState<ReceivedData[]>([]);
  const [file, setFile] = React.useState<File | null>(null);
  const [selectedAdmins, setSelectedAdmins] = React.useState<string[]>([]);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = React.useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = React.useState(false);
  const [viewPolicy, setViewPolicy] = React.useState<Policy | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [selectedPolicy, setSelectedPolicy] = React.useState<Policy | null>(null);
  const [policies, setPolicies] = React.useState<Policy[]>([]);

  const canAccess = isSuperAdminRole(profile?.role);

  // Fetch only admin users (not clients)
  React.useEffect(() => {
    const unsub = onSnapshot(
      query(collection(firestore, "users"), where("role", "in", ["admin", "super_admin", "superadmin"])),
      (snap) => {
        const list: UserProfile[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((u) => u.id !== currentUser?.uid)
          .sort((a, b) => String(a.email ?? "").localeCompare(String(b.email ?? "")));
        setAdminUsers(list);
      }
    );
    return () => unsub();
  }, [currentUser?.uid]);

  // Fetch files shared by super admin
  React.useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      query(collection(firestore, "sharedData"), where("uploadedBy", "==", currentUser.uid)),
      (snap) => {
        const list: SharedRow[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .sort((a, b) => {
            const at = (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : 0;
            const bt = (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : 0;
            return bt - at;
          });
        setSharedByMe(list);
      }
    );
    return () => unsub();
  }, [currentUser?.uid]);

  // Load policies
  React.useEffect(() => {
    const activePolicies = (policiesData as Policy[]).filter((p) => p.status === "Active");
    setPolicies(activePolicies);
    if (activePolicies.length > 0) {
      setSelectedPolicy(activePolicies[0]);
    }
  }, []);

  // Fetch received files (only from admins/super admins, NOT from admin-client shares)
  React.useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      query(collection(firestore, "sharedData"), where("sharedWithUserIds", "array-contains", currentUser.uid)),
      async (snap) => {
        const data: ReceivedData[] = [];
        for (const d of snap.docs) {
          const docData = d.data() as any;
          
          // IMPORTANT: Filter out files shared between admins and clients
          // Only show files where BOTH uploader and recipients are admins
          if (docData.uploadedBy) {
            const uploaderDoc = await getDoc(doc(firestore, "users", docData.uploadedBy));
            if (uploaderDoc.exists()) {
              const uploaderRole = uploaderDoc.data().role;
              // Only include if uploader is admin or super_admin (not client)
              if (["admin", "super_admin", "superadmin"].includes(uploaderRole)) {
                data.push({
                  id: d.id,
                  fileName: docData.fileName,
                  sharedBy: uploaderDoc.data().firstName || uploaderDoc.data().email || "Unknown",
                  sharedByEmail: uploaderDoc.data().email || "unknown@example.com",
                  receivedAt: docData.createdAt || d.createdAt,
                });
              }
            }
          }
        }
        setReceivedData(data.sort((a, b) => {
          const aTime = a.receivedAt?.toMillis?.() ?? new Date(a.receivedAt).getTime() ?? 0;
          const bTime = b.receivedAt?.toMillis?.() ?? new Date(b.receivedAt).getTime() ?? 0;
          return bTime - aTime;
        }));
      }
    );
    return () => unsub();
  }, [currentUser?.uid]);

  const toggleAdminSelection = (uid: string) => {
    setSelectedAdmins((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const handleShare = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }
    if (!selectedPolicy) {
      toast.error("Please select a security policy before sharing");
      return;
    }
    if (selectedAdmins.length === 0) {
      toast.error("Please choose one or more recipients before sharing");
      return;
    }
    if (!currentUser) {
      toast.error("User not authenticated");
      return;
    }

    setBusy(true);
    try {
      // Get user profile for role information
      const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        toast.error('User profile not found');
        setBusy(false);
        return;
      }
      const userProfile = userDoc.data() as any;
      const userRole = userProfile.role || 'super_admin';
      
      const uploaderName = userProfile?.firstName || userProfile?.email || currentUser.email || "Super Admin";
      
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Generate SCDA security signatures (same as admin page)
      const dfp = generateDataFingerprint(
        file.size,
        file.type || 'application/octet-stream',
        currentUser.uid,
        Date.now()
      );

      const sit = generateSessionIdentityToken(
        currentUser.uid,
        'device-id',
        currentUser.email,
        24 * 60 * 60 * 1000 // 24 hour expiry
      );

      const roleLevel = 
        userRole === 'super_super_admin' ? 4 :
        userRole === 'super_admin' ? 3 :
        userRole === 'admin' ? 2 : 1;

      const sts = generateSecureTrustSignature(
        roleLevel,
        userProfile.industryId || 'general',
        currentUser.uid,
        dfp.hash,
        sit.hash
      );

      // Prepare shared data for recipients (admin names/emails)
      const sharedWithData = adminUsers
        .filter(a => selectedAdmins.includes(a.id))
        .map((a) => ({
          userId: a.id,
          email: a.email,
          name: `${a.firstName} ${a.lastName}`,
          addedAt: new Date(),
        }));

      // Create file metadata with all required fields
      const fileMetadata = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        fileData: base64Data,
        ownerId: currentUser.uid,
        ownerRole: userRole,
        uploadedBy: currentUser.uid,
        uploadedByName: uploaderName,
        uploadedByEmail: currentUser.email,
        uploadedByRole: userRole,
        uploadTimestamp: Date.now(),
        timestamp: serverTimestamp(),
        policy: selectedPolicy?.policyName || selectedPolicy?.id,
        status: 'active',
        sharedWith: sharedWithData,
        sharedWithUserIds: selectedAdmins,
        industryId: userProfile.industryId || 'general',
        organizationId: userProfile.organizationId || 'default',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days

        // SCDA fields
        dataFingerprint: {
          hash: dfp.hash,
          uploadTimestamp: dfp.uploadTimestamp,
          nonce: dfp.nonce,
        },
        sessionIdentityToken: {
          hash: sit.hash,
          expiresAt: sit.expiresAt,
        },
        secureTrustSignature: {
          signature: sts.signature,
        },
        accessLog: [
          {
            timestamp: Date.now(),
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userRole,
            action: 'file_uploaded',
            ipAddress: 'unknown',
            deviceId: 'device-id',
          },
        ],
      };

      // Add to Firestore
      const fileRef = collection(firestore, 'sharedData');
      const docRef = await addDoc(fileRef, fileMetadata);

      // Add the fileId to the document
      await updateDoc(doc(firestore, 'sharedData', docRef.id), {
        fileId: docRef.id,
      });

      await writeAuditLog({
        actionType: "FILE_UPLOADED",
        performedBy: currentUser.uid,
        performedByName: uploaderName,
        targetUser: null,
        details: { 
          fileId: docRef.id,
          fileName: file.name, 
          sharedWithCount: selectedAdmins.length,
          policy: selectedPolicy?.policyName 
        },
      });

      toast.success(`Data shared securely to ${selectedAdmins.length} admin(s)`);
      setFile(null);
      setSelectedAdmins([]);
      setSelectedPolicy(null);
      setIsAdminDialogOpen(false);
      const input = document.getElementById("super-admin-file-upload") as HTMLInputElement;
      if (input) input.value = "";
    } catch (error) {
      console.error("Error sharing file:", error);
      toast.error("Failed to share file. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    if (!currentUser) {
      toast.error("User not authenticated");
      return;
    }

    try {
      // Verify access using SCDA middleware
      const sessionToken = await currentUser.getIdToken();

      const accessResult = await verifyFileAccessMiddleware(
        currentUser.uid,
        fileId,
        sessionToken,
        'device-id',
        'unknown'
      );

      if (!accessResult.allowed) {
        toast.error(accessResult.reason || "Access denied");
        return;
      }

      // Retrieve file document to get the fileData
      const fileDocRef = doc(firestore, "sharedData", fileId);
      const fileDocSnap = await getDoc(fileDocRef);

      if (!fileDocSnap.exists()) {
        toast.error("File not found");
        return;
      }

      const fileData = fileDocSnap.data() as any;
      const base64Data = fileData.fileData;

      if (!base64Data) {
        toast.error("This file needs to be re-shared to download. Old file format doesn't support direct downloads.");
        return;
      }

      // Convert base64 to blob and download
      downloadBase64File(base64Data, fileName);
      
      // Log the access event
      await logAccessEvent({
        timestamp: Date.now(),
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userRole: profile?.role || 'super_admin',
        fileId: fileId,
        fileName: fileName,
        action: 'file_downloaded',
        reason: 'File downloaded by super admin',
        accessLevel: 'full',
        ipAddress: 'unknown',
        deviceId: 'device-id',
      });

      toast.success(`Downloading ${fileName}`);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Error downloading file. Please try again.");
    }
  };

  const downloadBase64File = (base64Data: string, fileName: string) => {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      throw error;
    }
  };

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shared Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Access denied.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="share" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="share">Share</TabsTrigger>
          <TabsTrigger value="shared">Shared by Me</TabsTrigger>
          <TabsTrigger value="received">Received</TabsTrigger>
        </TabsList>

        <TabsContent value="share" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT COLUMN: Upload & Policy */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                    <input
                      type="file"
                      id="super-admin-file-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setFile(e.target.files[0]);
                          toast.success("File selected successfully");
                        }
                      }}
                      accept="*/*"
                    />
                    <label htmlFor="super-admin-file-upload" className="cursor-pointer">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm font-medium mb-2">
                        {file ? file.name : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-xs text-muted-foreground">All file types accepted</p>
                    </label>
                  </div>

                  {file && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                      <div className="font-medium text-base">Security Policy</div>
                      <p className="text-sm text-muted-foreground">Create or select a security policy for this share</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        className="text-white" 
                        style={{ backgroundColor: '#113738' }}
                        onClick={() => toast.info("Create Policy feature coming soon")}
                      >
                        Create Policy
                      </Button>
                      <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
                        <Button 
                          variant="outline"
                          onClick={() => setIsPolicyDialogOpen(true)}
                        >
                          Select Policy
                        </Button>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Select Security Policy</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 mt-2">
                            {policies.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No active policies available</p>
                            ) : (
                              policies.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border rounded">
                                  <div>
                                    <div className="font-medium">{p.policyName}</div>
                                    <div className="text-xs text-muted-foreground">{p.policyCategory}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedPolicy(p);
                                        setIsPolicyDialogOpen(false);
                                        toast.success(`${p.policyName} selected`);
                                      }}
                                    >
                                      Select
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => setViewPolicy(p)}
                                    >
                                      View
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {selectedPolicy ? (
                    <>
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex gap-3">
                          <Shield className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{selectedPolicy.policyName}</p>
                            <p className="text-xs text-muted-foreground mt-1">{selectedPolicy.policyDescription}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => setIsAdminDialogOpen(true)}
                          disabled={!file}
                        >
                          Choose Recipients
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div />
                  )}
                </div>

                <Button
                  onClick={handleShare}
                  disabled={!file || !selectedPolicy || selectedAdmins.length === 0 || busy}
                  className="w-full text-white hover:opacity-90"
                  style={{ backgroundColor: '#113738' }}
                >
                  {busy ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Data Securely
                    </>
                  )}
                </Button>

                {selectedAdmins.length > 0 && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          Data Shared Successfully!
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Your data has been securely shared with the authorized party
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Policy View Dialog */}
                <Dialog open={Boolean(viewPolicy)} onOpenChange={(v) => { if (!v) setViewPolicy(null); }}>
                  <DialogContent className="w-full sm:w-[640px] max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>{viewPolicy?.policyName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4 max-h-[60vh] overflow-auto pr-2">
                      {viewPolicy && (
                        <>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Description</p>
                            <div className="mt-2 text-sm">{viewPolicy.policyDescription}</div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Protected Fields</p>
                            <div className="mt-2 space-y-2">
                              {(viewPolicy as any).protectedFields?.map((pf: any, i: number) => (
                                <div key={i} className="p-2 border rounded">
                                  <div className="font-medium">{pf.field}</div>
                                  {pf.reason && <div className="text-xs text-muted-foreground">{pf.reason}</div>}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Allowed Actions</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              {(viewPolicy as any).allowedActions && Object.entries((viewPolicy as any).allowedActions).map(([k, v]: any) => (
                                <div key={k} className="p-2 border rounded">
                                  <div className="font-medium">{k}</div>
                                  <div className="text-xs text-muted-foreground">{v.allowed ? 'Allowed' : 'Not allowed'}</div>
                                  {v.notes && <div className="text-xs text-muted-foreground mt-1">{v.notes}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                      <Button variant="outline" onClick={() => setViewPolicy(null)}>Close</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* RIGHT COLUMN: Sharing Preview */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Sharing Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="bg-secondary px-4 py-2 border-b border-border">
                      <p className="text-sm font-medium">Sharing Preview</p>
                    </div>
                    <div className="p-4 space-y-3">
                      {selectedAdmins.length > 0 ? (
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">Data sharing to:</div>
                          {adminUsers
                            .filter((a) => selectedAdmins.includes(a.id))
                            .map((a) => (
                              <div key={a.id} className="grid grid-cols-2 gap-x-4 text-sm">
                                <div className="text-muted-foreground">Name:</div>
                                <div className="font-medium">{a.firstName} {a.lastName}</div>
                                <div className="text-muted-foreground">Email:</div>
                                <div className="font-mono">{a.email}</div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div className="text-muted-foreground">Name:</div>
                          <div className="font-mono">&nbsp;</div>
                          <div className="text-muted-foreground">Email:</div>
                          <div className="font-mono">&nbsp;</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-accent border border-primary/20">
                    <p className="text-sm font-medium mb-2">Encryption Status</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span>End-to-end encryption active</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium mb-3">Security Features</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        256-bit AES encryption
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Audit trail enabled
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Time-limited access
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Automatic PII detection
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="shared" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Files Shared by Me</CardTitle>
            </CardHeader>
            <CardContent>
              {sharedByMe.length === 0 ? (
                <div className="flex justify-center py-8">
                  <p className="text-muted-foreground">No files shared yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedByMe.map((item) => {
                    const sharedDate = item.createdAt?.toDate
                      ? item.createdAt.toDate()
                      : new Date(item.createdAt);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">{item.fileName}</p>
                              <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs flex-shrink-0 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Admin Only
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              {sharedDate.toLocaleDateString()} {sharedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            {Array.isArray(item.sharedWith) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Shared with {item.sharedWith.length} admin{item.sharedWith.length !== 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Received Data</CardTitle>
            </CardHeader>
            <CardContent>
              {receivedData.length === 0 ? (
                <div className="flex justify-center py-8">
                  <p className="text-muted-foreground">No data received yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedData.map((item) => {
                    const receivedDate = item.receivedAt?.toDate
                      ? item.receivedAt.toDate()
                      : new Date(item.receivedAt);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">{item.fileName}</p>
                              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs flex-shrink-0 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Admin Shared
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              From: <span className="font-medium">{item.sharedBy}</span> ({item.sharedByEmail})
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              {receivedDate.toLocaleDateString()} {receivedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadFile(item.id, item.fileName)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Admin(s) to Share With</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {adminUsers.length === 0 && <div className="text-sm text-muted-foreground">No admins found</div>}
              {adminUsers.map((admin) => (
                <label key={admin.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">
                      {admin.firstName} {admin.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{admin.email}</div>
                    {admin.role && <div className="text-xs text-muted-foreground capitalize">Role: {admin.role}</div>}
                  </div>
                  <div>
                    <Checkbox 
                      checked={selectedAdmins.includes(admin.id)} 
                      onCheckedChange={() => toggleAdminSelection(admin.id)} 
                    />
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsAdminDialogOpen(false); setSelectedAdmins([]); }}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setIsAdminDialogOpen(false);
                  toast.success(`${selectedAdmins.length} admin(s) selected`);
                }} 
                disabled={busy || adminUsers.length === 0 || selectedAdmins.length === 0}
                style={{ backgroundColor: '#113738' }} 
                className="text-white hover:opacity-90"
              >
                {busy ? 'Sharing...' : 'Share to Selected'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
