import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Eye, FileText, Download, User, Mail, Briefcase, Calendar } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { firestore, auth } from '@/lib/firebase';
import { toast } from 'sonner';

interface DocumentMeta {
  fileName: string;
  fileSize: number;
  fileType: string;
  base64?: string;
  url?: string;
}

interface AdminRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  domain: string;
  customCategory: string | null;
  username?: string;
  googleDriveLink?: string;
  documents?: DocumentMeta[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

const AdminApproval = () => {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const [viewingDocument, setViewingDocument] = useState<DocumentMeta | null>(null);
  const [processing, setProcessing] = useState(false);
  // Pricing invites/email removed; pricing page will be shown on login for approved-but-unpaid admins

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const q = query(collection(firestore, 'approval_documents'));
      const querySnapshot = await getDocs(q);
      
      const requestsData: AdminRequest[] = [];
      querySnapshot.forEach((d) => {
        const data = d.data() as any;
        const documents: DocumentMeta[] = Array.isArray(data.documents) ? data.documents : [];
        requestsData.push({
          id: d.id,
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          email: data.email ?? '',
          company: data.company ?? '',
          domain: data.domain ?? '',
          customCategory: data.customCategory ?? null,
          username: data.username,
          googleDriveLink: data.googleDriveLink,
          documents,
          status: data.status ?? 'pending',
          createdAt: data.createdAt,
        });
      });

      // Sort by status priority (pending first), then by createdAt (newest first)
      requestsData.sort((a, b) => {
        // Define status priority: pending > approved > rejected
        const statusPriority: Record<string, number> = {
          'pending': 1,
          'approved': 2,
          'rejected': 3
        };
        
        const aPriority = statusPriority[a.status] || 999;
        const bPriority = statusPriority[b.status] || 999;
        
        // First sort by status priority
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Within same status, sort by createdAt (newest first)
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load admin requests');
    } finally {
      setLoading(false);
    }
  };

  // No invite lookup needed

  // Invite/email disabled

  const handleApprove = async (request: AdminRequest) => {
    if (!confirm(`Approve admin and send Pricing invite to ${request.firstName} ${request.lastName}?`)) {
      return;
    }

    setProcessing(true);
    try {
      // Generate temporary password (used only if creating a new auth user)
      let tempPassword: string | undefined = `Admin@${Math.random().toString(36).slice(-8)}`;

      // Check if a user doc already exists for this email
      const existingUsersQ = query(collection(firestore, 'users'), where('email', '==', request.email));
      const existingUsersSnap = await getDocs(existingUsersQ);

      let uid: string | undefined = undefined;
      if (existingUsersSnap.empty) {
        // No user doc found — try creating an Auth user
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, request.email, tempPassword!);
          uid = userCredential.user.uid;
          // Create user profile with doc id = uid (so login lookup works)
          const { doc: fDoc, setDoc } = await import('firebase/firestore');
          await setDoc(fDoc(firestore, 'users', uid), {
            uid,
            email: request.email,
            firstName: request.firstName,
            lastName: request.lastName,
            company: request.company,
            domain: request.domain,
            customCategory: request.customCategory,
            role: 'admin',
            status: 'active',
            tempPassword,
            paid: false,
            createdAt: serverTimestamp(),
            approvedAt: serverTimestamp(),
          });
        } catch (createErr: any) {
          // If the email already exists in Auth, continue by upgrading Firestore profile
          if (createErr?.code === 'auth/email-already-in-use') {
            console.warn('Auth user already exists for email, promoting to admin without creating:', request.email);
            tempPassword = undefined; // don't send temp password for existing accounts
          } else {
            throw createErr;
          }
        }
      }

      // Ensure Firestore profile is updated/promoted to admin
      try {
        const userQuery = query(collection(firestore, 'users'), where('email', '==', request.email));
        const userSnap = await getDocs(userQuery);
        if (!userSnap.empty) {
          uid = uid ?? (userSnap.docs[0].data() as any)?.uid;
          const userDocRef = userSnap.docs[0].ref;
          await updateDoc(userDocRef, {
            status: 'active',
            role: 'admin',
            approvedAt: serverTimestamp(),
            adminRequestSubmitted: false,
            paid: false,
          });
        } else if (uid) {
          // If we have an Auth user but no profile (rare), create the profile at uid doc id
          const { doc: fDoc, setDoc } = await import('firebase/firestore');
          await setDoc(fDoc(firestore, 'users', uid), {
            uid,
            email: request.email,
            firstName: request.firstName,
            lastName: request.lastName,
            company: request.company,
            domain: request.domain,
            customCategory: request.customCategory,
            role: 'admin',
            status: 'active',
            paid: false,
            createdAt: serverTimestamp(),
            approvedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn('Could not update/create user profile status:', err);
      }

      // Update approval document status
      await updateDoc(doc(firestore, 'approval_documents', request.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: 'super_admin',
      });
      // Mark user unpaid so Pricing page appears on next login
      try {
        const userQuery = query(collection(firestore, 'users'), where('email', '==', request.email));
        const userSnap = await getDocs(userQuery);
        if (!userSnap.empty) {
          await updateDoc(userSnap.docs[0].ref, {
            paid: false,
          });
        }
      } catch (e) {
        console.warn('Could not set paid=false after approval:', e);
      }

      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      console.error('Error approving admin:', error);
      toast.error(error.message || 'Failed to approve admin');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (request: AdminRequest) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setProcessing(true);
    try {
      await updateDoc(doc(firestore, 'approval_documents', request.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: 'super_admin',
        rejectionReason: reason,
      });

      toast.success('Admin request rejected');
      fetchRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error rejecting admin:', error);
      toast.error('Failed to reject admin request');
    } finally {
      setProcessing(false);
    }
  };

  // Delete user from Firestore and remove approval document. Optionally delete Auth via admin endpoint.
  const handleDeleteUser = async (request: AdminRequest) => {
    if (!confirm(`Delete user ${request.email} and remove their approval request?`)) {
      return;
    }
    setProcessing(true);
    try {
      // Delete matching user documents by email
      try {
        const usersQ = query(collection(firestore, 'users'), where('email', '==', request.email));
        const usersSnap = await getDocs(usersQ);
        for (const userDoc of usersSnap.docs) {
          await deleteDoc(userDoc.ref);
        }
      } catch (e) {
        console.warn('User deletion (users collection) warning:', e);
      }

      // Delete approval document
      try {
        await deleteDoc(doc(firestore, 'approval_documents', request.id));
      } catch (e) {
        console.warn('Approval document deletion warning:', e);
      }

      // Optional: request backend to delete Firebase Auth user (requires Admin SDK)
      try {
        const deleteEndpoint = import.meta.env.VITE_ADMIN_DELETE_USER_URL as string | undefined;
        if (deleteEndpoint) {
          const res = await fetch(deleteEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: request.email }),
          });
          if (!res.ok) {
            console.warn('Auth deletion endpoint returned non-OK:', res.status);
          }
        }
      } catch (e) {
        console.warn('Auth user deletion call failed:', e);
      }

      toast.success('User deleted successfully');
      // Refresh list
      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error?.message || 'Failed to delete user');
    } finally {
      setProcessing(false);
    }
  };

  const downloadDocument = (doc: DocumentMeta) => {
    const link = window.document.createElement('a');
    link.href = doc.url || doc.base64 || '#';
    link.download = doc.fileName;
    link.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'approved': return 'bg-green-100 text-green-700 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Resend invite/email disabled

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Approvals</h2>
          <p className="text-muted-foreground mt-1">
            Review and approve admin registration requests with document verification
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-10">
              <div className="text-center text-muted-foreground">Loading requests...</div>
            </CardContent>
          </Card>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="text-center text-muted-foreground">No admin requests found</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <Card key={request.id} className="hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {request.firstName} {request.lastName}
                      </CardTitle>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {request.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {request.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(request.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Domain:</span> <span className="text-muted-foreground">{request.domain}</span>
                      </div>
                      {request.customCategory && (
                        <div>
                          <span className="font-medium">Category:</span> <span className="text-muted-foreground">{request.customCategory}</span>
                        </div>
                      )}
                      {request.googleDriveLink && (
                        <div className="col-span-2">
                          <span className="font-medium">Drive Link:</span>{' '}
                          <a href={request.googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                            Open verification documents
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <>
                        {request.status === 'pending' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(request)}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        )}
                        {request.status === 'pending' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(request)}
                            disabled={processing}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(request)}
                          disabled={processing}
                          className="bg-red-700 hover:bg-red-800"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Delete User
                        </Button>
                      </>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Request Details Dialog */}
        <Dialog open={selectedRequest !== null} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Admin Request Details</DialogTitle>
              <DialogDescription>
                Review the complete information and uploaded documents
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">First Name</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Name</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.company}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Domain</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.domain}</p>
                  </div>
                  {selectedRequest.customCategory && (
                    <div>
                      <label className="text-sm font-medium">Custom Category</label>
                      <p className="text-sm text-muted-foreground">{selectedRequest.customCategory}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm">
                      <Badge className={getStatusColor(selectedRequest.status)}>
                        {selectedRequest.status.toUpperCase()}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Submitted</label>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                  {selectedRequest.googleDriveLink && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Drive Link</label>
                      <p className="text-sm">
                        <a
                          href={selectedRequest.googleDriveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Open verification documents
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                {/* Invite section removed */}

                <div className="flex gap-3 pt-4 border-t">
                  {selectedRequest.status === 'pending' && (
                    <Button
                      onClick={() => handleApprove(selectedRequest)}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Admin
                    </Button>
                  )}
                  {selectedRequest.status === 'pending' && (
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedRequest)}
                      disabled={processing}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Request
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => selectedRequest && handleDeleteUser(selectedRequest)}
                    disabled={processing}
                    className="bg-red-700 hover:bg-red-800"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Delete User
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Document Viewer Dialog */}
        <Dialog open={viewingDocument !== null} onOpenChange={() => setViewingDocument(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{viewingDocument?.fileName}</DialogTitle>
              <DialogDescription>
                {viewingDocument?.fileType} • {viewingDocument && formatFileSize(viewingDocument.fileSize)}
              </DialogDescription>
            </DialogHeader>

            {viewingDocument && (
              <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4 min-h-[500px]">
                {viewingDocument.fileType.startsWith('image/') ? (
                  <img
                    src={viewingDocument.url || viewingDocument.base64 || ''}
                    alt={viewingDocument.fileName}
                    className="max-w-full max-h-[600px] object-contain"
                  />
                ) : viewingDocument.fileType === 'application/pdf' ? (
                  <iframe
                    src={viewingDocument.url || viewingDocument.base64 || ''}
                    className="w-full h-[600px] border-0"
                    title={viewingDocument.fileName}
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Preview not available for this file type
                    </p>
                    <Button onClick={() => downloadDocument(viewingDocument)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminApproval;
