import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Shield, Share2, CheckCircle, Download, FileText, Calendar, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import policiesJson from '@/data/policies.json';
import { auth, firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, addDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDeviceIdentity } from '@/hooks/useDeviceIdentity';
import {
  generateDataFingerprint,
  generateSessionIdentityToken,
  generateSecureTrustSignature,
  verifyFileAccessMiddleware,
  logAccessEvent,
} from '@/lib/scda';

interface SharedData {
  id: string;
  fileName: string;
  sharedWith: Array<{ userId: string; email: string; name: string }>;
  sharedAt: any;
  policy?: string;
  status: string;
}

interface ReceivedData {
  id: string;
  fileName: string;
  sharedBy: string;
  sharedByEmail: string;
  receivedAt: any;
  status: string;
}

const Share = () => {
  const { currentUser } = useAuth();
  const { deviceId, ipAddress } = useDeviceIdentity();
  const [activeTab, setActiveTab] = useState('share');
  const [file, setFile] = useState<File | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [policy, setPolicy] = useState<any | null>(null);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [availablePolicies, setAvailablePolicies] = useState<any[]>([]);
  const [viewPolicy, setViewPolicy] = useState<any | null>(null);
  const navigate = useNavigate();

  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<any[]>([]);
  const [recipientType, setRecipientType] = useState<'admin' | 'client' | 'mixed'>('mixed');
  const [userRole, setUserRole] = useState<string | null>(null);

  // New state for shared and received data
  const [sharedData, setSharedData] = useState<SharedData[]>([]);
  const [receivedData, setReceivedData] = useState<ReceivedData[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);
  const [loadingReceived, setLoadingReceived] = useState(false);

  const loadSharedData = async () => {
    if (!currentUser) return;
    setLoadingShared(true);
    try {
      const unsubscribe = onSnapshot(
        query(
          collection(firestore, 'sharedData'),
          where('uploadedBy', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        ),
        (snapshot) => {
          console.log('Recently Shared query result:', snapshot.docs.length, 'documents');
          const data: SharedData[] = [];
          snapshot.forEach((doc) => {
            const d = doc.data() as any;
            console.log('Shared data item:', d.fileName, 'uploadedBy:', d.uploadedBy, 'timestamp:', d.timestamp);
            data.push({
              id: doc.id,
              fileName: d.fileName || d.name || 'Untitled',
              sharedWith: d.sharedWith || [],
              sharedAt: d.timestamp,
              policy: d.policy,
              status: d.status || 'active',
            });
          });
          setSharedData(data);
          setLoadingShared(false);
        },
        (error) => {
          console.error('Error loading shared data:', error);
          setLoadingShared(false);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.error('Error setting up shared data listener:', e);
      setLoadingShared(false);
    }
  };

  const loadReceivedData = async () => {
    if (!currentUser) return;
    setLoadingReceived(true);
    try {
      const unsubscribe = onSnapshot(
        query(
          collection(firestore, 'sharedData'),
          where('sharedWithUserIds', 'array-contains', currentUser.uid),
          orderBy('timestamp', 'desc')
        ),
        (snapshot) => {
          console.log('Received data query result:', snapshot.docs.length, 'documents');
          const data: ReceivedData[] = [];
          snapshot.forEach((doc) => {
            const d = doc.data() as any;
            data.push({
              id: doc.id,
              fileName: d.fileName || d.name || 'Untitled',
              sharedBy: d.uploadedByName || 'Unknown',
              sharedByEmail: d.uploadedByEmail || '',
              receivedAt: d.timestamp,
              status: d.status || 'active',
            });
          });
          setReceivedData(data);
          setLoadingReceived(false);
        },
        (error) => {
          console.error('Error loading received data:', error);
          setLoadingReceived(false);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.error('Error setting up received data listener:', e);
      setLoadingReceived(false);
    }
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    if (!currentUser) {
      toast.error('User not authenticated');
      return;
    }

    try {
      // Verify access using SCDA middleware
      const sessionToken = await currentUser.getIdToken();

      const accessResult = await verifyFileAccessMiddleware(
        currentUser.uid,
        fileId,
        sessionToken,
        deviceId || 'unknown',
        ipAddress || 'unknown'
      );

      if (!accessResult.allowed) {
        toast.error(accessResult.reason || 'Access denied');
        return;
      }

      // Retrieve file document to get the fileData
      const fileDocRef = doc(firestore, 'sharedData', fileId);
      const fileDocSnap = await getDoc(fileDocRef);

      if (!fileDocSnap.exists()) {
        toast.error('File not found');
        return;
      }

      const fileData = fileDocSnap.data() as any;
      console.log('File document data:', fileData);
      
      const base64Data = fileData.fileData;

      if (!base64Data) {
        console.error('File data not available. Document data:', fileData);
        toast.error(`This file needs to be re-shared to download. Old file format doesn't support direct downloads.`);
        return;
      }

      // Convert base64 to blob and download
      downloadBase64File(base64Data, fileName);
      toast.success(`Downloading ${fileName}`);
      console.log(`File download initiated: ${fileName}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error downloading file. Please try again.');
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
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setShared(false);
      toast.success('File selected successfully');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleShare = async () => {
    if (!file) {
      toast.error('Please upload a file first');
      return;
    }
    if (!policy) {
      toast.error('Please create or select a security policy before sharing');
      return;
    }
    if (selectedClients.length === 0) {
      toast.error('Please choose one or more recipients before sharing');
      return;
    }

    if (!currentUser) {
      toast.error('User not authenticated');
      return;
    }

    setIsSharing(true);
    try {
      // Get user profile for role information
      const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        toast.error('User profile not found');
        setIsSharing(false);
        return;
      }
      const userProfile = userDoc.data() as any;
      const userRole = userProfile.role || 'admin';

      // Generate SCDA security signatures
      const dfp = generateDataFingerprint(
        file.size,
        file.type || 'application/octet-stream',
        currentUser.uid,
        Date.now()
      );

      const sit = generateSessionIdentityToken(
        currentUser.uid,
        deviceId || 'unknown',
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

      // Prepare shared data document
      const sharedWithData = selectedClients.map((c) => ({
        userId: c.uid,
        email: c.email,
        name: `${c.firstName} ${c.lastName}`,
        addedAt: new Date(),
      }));

      // Check file size
      if (file.size > 1024 * 1024) {
        toast.warning('File is larger than 1MB. Storage efficiency may vary.');
      }

      // Convert file to base64
      toast.info('Processing file...');
      const base64Data = await fileToBase64(file);
      toast.info('File processed successfully');

      // Save file metadata to Firestore with SCDA protection
      const fileMetadata = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        fileData: base64Data, // Store base64-encoded file data
        ownerId: currentUser.uid,
        ownerRole: userRole,
        uploadedBy: currentUser.uid,
        uploadedByName: userProfile.firstName || 'Unknown',
        uploadedByEmail: currentUser.email,
        uploadTimestamp: Date.now(),
        timestamp: serverTimestamp(),
        policy: policy.id || policy.policyName,
        status: 'active',
        sharedWith: sharedWithData,
        sharedWithUserIds: selectedClientIds, // For easy array-contains queries
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
            ipAddress: ipAddress || 'unknown',
            deviceId: deviceId || 'unknown',
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

      // Log the access event
      await logAccessEvent({
        timestamp: Date.now(),
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userRole,
        fileId: docRef.id,
        fileName: file.name,
        action: 'file_shared',
        reason: 'File shared with SCDA protection',
        accessLevel: 'full',
        ipAddress: ipAddress || 'unknown',
        deviceId: deviceId || 'unknown',
      });

      setShared(true);
      setFile(null);
      setSelectedClients([]);
      setSelectedClientIds([]);
      setPolicy(null);

      toast.success(`Data shared securely to ${selectedClients.length} client(s) with SCDA protection`);

      // Reload shared data
      setTimeout(() => {
        loadSharedData();
      }, 500);
    } catch (error) {
      console.error('Error sharing file:', error);
      toast.error('Failed to share file. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const loadPolicies = () => {
    try {
      const raw = localStorage.getItem('policies_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAvailablePolicies(parsed);
        return;
      }
    } catch (e) {
      // ignore
    }
    // fallback to static JSON
    setAvailablePolicies((policiesJson as any) || []);
  };

  useEffect(() => {
    loadPolicies();
    // Setup real-time listeners on mount
    if (currentUser) {
      // Set up listeners for shared data (without orderBy to avoid needing composite index)
      const unsubscribeShared = onSnapshot(
        query(
          collection(firestore, 'sharedData'),
          where('uploadedBy', '==', currentUser.uid)
        ),
        (snapshot) => {
          console.log('Recently Shared - Real-time update:', snapshot.docs.length, 'documents');
          const data: SharedData[] = [];
          snapshot.forEach((doc) => {
            const d = doc.data() as any;
            data.push({
              id: doc.id,
              fileName: d.fileName || d.name || 'Untitled',
              sharedWith: d.sharedWith || [],
              sharedAt: d.timestamp,
              policy: d.policy,
              status: d.status || 'active',
            });
          });
          // Sort client-side by timestamp descending
          data.sort((a, b) => {
            const aTime = a.sharedAt?.toMillis?.() ?? new Date(a.sharedAt).getTime() ?? 0;
            const bTime = b.sharedAt?.toMillis?.() ?? new Date(b.sharedAt).getTime() ?? 0;
            return bTime - aTime;
          });
          setSharedData(data);
        },
        (error) => {
          console.error('Error listening to shared data:', error);
        }
      );

      // Set up listeners for received data (without orderBy to avoid needing composite index)
      const unsubscribeReceived = onSnapshot(
        query(
          collection(firestore, 'sharedData'),
          where('sharedWithUserIds', 'array-contains', currentUser.uid)
        ),
        (snapshot) => {
          console.log('Received data - Real-time update:', snapshot.docs.length, 'documents');
          const data: ReceivedData[] = [];
          snapshot.forEach((doc) => {
            const d = doc.data() as any;
            data.push({
              id: doc.id,
              fileName: d.fileName || d.name || 'Untitled',
              sharedBy: d.uploadedByName || 'Unknown',
              sharedByEmail: d.uploadedByEmail || '',
              receivedAt: d.timestamp,
              status: d.status || 'active',
            });
          });
          // Sort client-side by timestamp descending
          data.sort((a, b) => {
            const aTime = a.receivedAt?.toMillis?.() ?? new Date(a.receivedAt).getTime() ?? 0;
            const bTime = b.receivedAt?.toMillis?.() ?? new Date(b.receivedAt).getTime() ?? 0;
            return bTime - aTime;
          });
          setReceivedData(data);
        },
        (error) => {
          console.error('Error listening to received data:', error);
        }
      );

      // Clean up listeners on unmount
      return () => {
        unsubscribeShared();
        unsubscribeReceived();
      };
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchRecipients = async () => {
      if (!currentUser) return;

      try {
        // Get current user profile
        const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          toast.error('User profile not found');
          return;
        }

        const userProfile = userDoc.data() as any;
        const currentUserRole = userProfile.role || 'client';
        setUserRole(currentUserRole);

        const fetched: any[] = [];

        // Super admin can share with all admins
        if (currentUserRole === 'super_admin' || currentUserRole === 'super_super_admin') {
          console.log('Fetching admins for super admin');
          const q = query(
            collection(firestore, 'users'),
            where('role', '==', 'admin'),
            where('status', '==', 'active')
          );
          const snapshot = await getDocs(q);
          snapshot.forEach((d) => {
            const data = d.data() as any;
            fetched.push({
              uid: data?.uid ?? d.id,
              firstName: data?.firstName ?? '',
              lastName: data?.lastName ?? '',
              email: data?.email ?? '',
              role: data?.role,
            });
          });
          setRecipientType('admin');
        }
        // Admin can share with their created clients + all super admins
        else if (currentUserRole === 'admin') {
          console.log('Fetching clients and super admins for admin');
          // Fetch clients created by this admin
          const q1 = query(
            collection(firestore, 'users'),
            where('createdBy', '==', currentUser.uid),
            where('status', '==', 'active')
          );
          const snapshot1 = await getDocs(q1);
          snapshot1.forEach((d) => {
            const data = d.data() as any;
            fetched.push({
              uid: data?.uid ?? d.id,
              firstName: data?.firstName ?? '',
              lastName: data?.lastName ?? '',
              email: data?.email ?? '',
              role: 'client',
              relationshipLabel: '(Your Client)',
            });
          });

          // Fetch all super admins
          const q2 = query(
            collection(firestore, 'users'),
            where('role', 'in', ['super_admin', 'super_super_admin']),
            where('status', '==', 'active')
          );
          const snapshot2 = await getDocs(q2);
          snapshot2.forEach((d) => {
            const data = d.data() as any;
            fetched.push({
              uid: data?.uid ?? d.id,
              firstName: data?.firstName ?? '',
              lastName: data?.lastName ?? '',
              email: data?.email ?? '',
              role: data?.role,
              relationshipLabel: '(Super Admin)',
            });
          });
          setRecipientType('mixed');
        }
        // Client can only share with the admin who created them
        else if (currentUserRole === 'client') {
          console.log('Fetching parent admin for client');
          const createdBy = userProfile?.createdBy;

          if (createdBy) {
            const adminDoc = await getDoc(doc(firestore, 'users', createdBy));
            if (adminDoc.exists()) {
              const adminData = adminDoc.data() as any;
              fetched.push({
                uid: adminData?.uid ?? createdBy,
                firstName: adminData?.firstName ?? '',
                lastName: adminData?.lastName ?? '',
                email: adminData?.email ?? '',
                role: adminData?.role,
                relationshipLabel: '(Your Admin)',
              });
            }
          }
          setRecipientType('admin');
        }

        setRecipients(fetched);
        console.log('Fetched recipients:', fetched);
      } catch (e) {
        console.error('Failed to fetch recipients', e);
        toast.error('Failed to load recipients');
      }
    };

    if (isClientDialogOpen) {
      fetchRecipients();
    }
  }, [isClientDialogOpen, currentUser]);

  const toggleClientSelection = (uid: string) => {
    setSelectedClientIds((prev) => {
      if (prev.includes(uid)) return prev.filter((p) => p !== uid);
      return [...prev, uid];
    });
  };

  const confirmClientShare = async () => {
    if (selectedClientIds.length === 0) {
      toast.error('Select one or more recipients to share with');
      return;
    }
    const chosen = recipients.filter((c) => selectedClientIds.includes(c.uid));
    setSelectedClients(chosen);
    setIsClientDialogOpen(false);
    toast.success(`${chosen.length} recipient(s) selected`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Share Data Securely</h2>
          <p className="text-muted-foreground mt-1">
            Upload and share data with controlled third-party access
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="shared">Recently Shared</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Upload File</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="*/*"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-2">
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      All file types accepted
                    </p>
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
                    <Label className="text-base font-medium">Security Policy</Label>
                    <p className="text-sm text-muted-foreground">Create or select a security policy for this share</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button className="text-white" style={{ backgroundColor: '#113738' }} onClick={() => navigate('/policies?openCreate=true')}>Create Policy</Button>
                    <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline">Select Policy</Button>
                        </DialogTrigger>
                        <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Select Security Policy</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 mt-2">
                          {availablePolicies.map((p: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <div className="font-medium">{p.policyName}</div>
                                <div className="text-xs text-muted-foreground">{p.policyCategory}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => {
                                    setPolicy(p);
                                    setIsPolicyDialogOpen(false);
                                    toast.success(`${p.policyName} selected`);
                                  }}
                                >
                                  Select
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setViewPolicy(p)}>View</Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                    </div>
                </div>

                {policy ? (
                  <>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex gap-3">
                        <Shield className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{policy.policyName}</p>
                          <p className="text-xs text-muted-foreground mt-1">{policy.policyDescription}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => setIsClientDialogOpen(true)}>Choose Recipients</Button>
                    </div>
                  </>
                ) : (
                  // intentionally blank when no policy selected
                  <div />
                )}
              </div>

              <Button
                onClick={handleShare}
                disabled={!file || isSharing}
                className="w-full text-white hover:opacity-90"
                style={{ backgroundColor: '#113738' }}
              >
                {isSharing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Data Securely
                  </>
                )}
              </Button>

              {shared && (
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
              {/* Policy view dialog (reuses policy detail display similar to Policies page) */}
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
                            {(viewPolicy.protectedFields || []).map((pf: any, i: number) => (
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
                            {viewPolicy.allowedActions && Object.entries(viewPolicy.allowedActions).map(([k, v]: any) => (
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

          <Card className="shadow-card">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Sharing Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-secondary px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium">Sharing Preview</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {selectedClients.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">Data sharing to:</div>
                        {selectedClients.map((c) => (
                          <div key={c.uid} className="grid grid-cols-2 gap-x-4 text-sm">
                            <div className="text-muted-foreground">Name:</div>
                            <div className="font-medium">{c.firstName} {c.lastName}</div>
                            <div className="text-muted-foreground">Email:</div>
                            <div className="font-mono">{c.email}</div>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recently Shared Data</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => loadSharedData()}
                  disabled={loadingShared}
                >
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {loadingShared ? (
                  <div className="flex justify-center py-8">
                    <p className="text-muted-foreground">Loading shared data...</p>
                  </div>
                ) : sharedData.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <p className="text-muted-foreground">No shared data yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sharedData.map((item) => {
                      const sharedDate = item.sharedAt?.toDate ? item.sharedAt.toDate() : new Date(item.sharedAt);
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">{item.fileName}</p>
                                <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs flex-shrink-0 flex items-center gap-1">
                                  <Lock className="h-3 w-3" />
                                  SCDA Protected
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3" />
                                {sharedDate.toLocaleDateString()} {sharedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {item.sharedWith.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Shared with {item.sharedWith.length} recipient{item.sharedWith.length !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenFile(item.id, item.fileName)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Open
                          </Button>
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
                {loadingReceived ? (
                  <div className="flex justify-center py-8">
                    <p className="text-muted-foreground">Loading received data...</p>
                  </div>
                ) : receivedData.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <p className="text-muted-foreground">No data received yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedData.map((item) => {
                      const receivedDate = item.receivedAt?.toDate ? item.receivedAt.toDate() : new Date(item.receivedAt);
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">{item.fileName}</p>
                                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs flex-shrink-0 flex items-center gap-1">
                                  <Lock className="h-3 w-3" />
                                  SCDA Verified
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3" />
                                {receivedDate.toLocaleDateString()} {receivedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        
        <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {recipientType === 'admin' ? 'Select Admin(s) to Share With' : 'Select Recipient(s) to Share With'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {recipients.length === 0 && <div className="text-sm text-muted-foreground">No recipients found</div>}
                {recipients.map((c) => (
                  <label key={c.uid} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">
                        {c.firstName} {c.lastName}
                        {c.relationshipLabel && <span className="text-xs text-muted-foreground ml-2">{c.relationshipLabel}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                      {c.role && <div className="text-xs text-muted-foreground capitalize">Role: {c.role}</div>}
                    </div>
                    <div>
                      <Checkbox checked={selectedClientIds.includes(c.uid)} onCheckedChange={() => toggleClientSelection(c.uid)} />
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setIsClientDialogOpen(false); setSelectedClientIds([]); }}>
                  Cancel
                </Button>
                <Button onClick={confirmClientShare} disabled={isSharing || recipients.length === 0} style={{ backgroundColor: '#113738' }} className="text-white hover:opacity-90">
                  {isSharing ? 'Sharing...' : 'Share to Selected'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Share;
