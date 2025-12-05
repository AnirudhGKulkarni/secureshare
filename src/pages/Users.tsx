import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { auth, firestore, firebaseConfig } from '@/lib/firebase';
import { createUserWithEmailAndPassword, getAuth, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { collection, query, where, getDocs, setDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  createdAt?: any;
  tempPassword?: string | null;
}

const roleOptions = [
  { value: 'admin', label: 'Co Admin' },
  { value: 'client', label: 'Client' },
];

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', role: 'client' });
  const [loading, setLoading] = useState(true);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(firestore, 'users'), where('status', '==', 'active'), where('role', 'in', ['admin', 'client']));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((d) => {
        const data = d.data() as any;
        // ensure we always have a uid to use as the document id (fallback to doc.id)
        fetchedUsers.push({
          uid: data?.uid ?? d.id,
          firstName: data?.firstName ?? '',
          lastName: data?.lastName ?? '',
          email: data?.email ?? '',
          role: data?.role ?? '',
          status: data?.status ?? '',
          createdAt: data?.createdAt ?? null,
          tempPassword: data?.tempPassword ?? null,
        });
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const generateTempPassword = () => {
    return `Temp@${Math.random().toString(36).slice(-8)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        // Update role
        const userDocRef = doc(firestore, 'users', editingUser.uid);
        await updateDoc(userDocRef, { role: formData.role });
        toast.success('User role updated successfully');
        fetchUsers();
        setIsEditDialogOpen(false);
        setEditingUser(null);
      } else {
        // Create new user using a secondary app/auth so the admin's session is not replaced
        const tempPass = generateTempPassword();
        const secondaryApp = initializeApp(firebaseConfig as any, `secondary-${Date.now()}`);
        try {
          const secondaryAuth = getAuth(secondaryApp);
          // Use in-memory persistence so the secondary auth doesn't write to local/session storage
          try {
            await setPersistence(secondaryAuth, inMemoryPersistence);
          } catch (persistErr) {
            console.warn('Could not set inMemoryPersistence for secondary auth', persistErr);
          }

          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, tempPass);
          const uid = userCredential.user.uid;

          const newUserDoc = {
            uid,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: formData.role,
            status: 'active',
            tempPassword: tempPass,
            createdAt: serverTimestamp(),
          };

          await setDoc(doc(firestore, 'users', uid), newUserDoc);

          setTempPassword(tempPass);
          // Refresh list and open view dialog showing temp password (stay on admin page)
          await fetchUsers();
          setIsAddDialogOpen(false);
          setEditingUser(newUserDoc as any);
          setIsViewDialogOpen(true);

          // Sign out from secondary auth to clean up (primary auth remains signed in)
          try { await secondaryAuth.signOut(); } catch (e) { /* ignore */ }
        } finally {
          // Delete the secondary app instance
          try { await deleteApp(secondaryApp); } catch (e) { /* ignore */ }
        }

        setTempPassword(tempPass);
        toast.success(`User created successfully. Temporary password: ${tempPass}`);
        fetchUsers();
        setIsAddDialogOpen(false);
      }

      setFormData({ firstName: '', lastName: '', email: '', role: 'client' });
    } catch (error: any) {
      console.error('Error saving user:', error);
      const msg = error?.message || (error?.code === 'auth/email-already-in-use' ? 'Email already in use' : 'Failed to save user');
      toast.error(msg);
      // Do not close dialogs on error, so user can retry
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role });
    setIsEditDialogOpen(true);
  };

  const handleView = (user: User) => {
    setEditingUser(user);
    setFormData({ firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role });
    setIsViewDialogOpen(true);
  };

  const downloadAsPDF = (user: User) => {
    // Build a simple letterhead-styled HTML and open in new window for printing/saving as PDF
    const letterheadHTML = `
      <html>
        <head>
          <title>trustNshare - User Details</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #111827 }
            .header { display:flex; align-items:center; gap:16px; }
            .brand { font-size:24px; color:#0ea5e9; font-weight:700 }
            .subtitle { color:#6b7280 }
            .hr { height:1px; background:#e5e7eb; margin:16px 0 }
            .field { margin:8px 0 }
            .label { color:#6b7280; font-size:12px }
            .value { font-size:16px; margin-top:4px }
            .footer { margin-top:40px; color:#6b7280; font-size:12px }
            .badge { display:inline-block; padding:6px 12px; background:#e0f2fe; color:#0369a1; border-radius:9999px }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">trustNshare</div>
              <div class="subtitle">User Onboarding Details</div>
            </div>
          </div>
          <div class="hr"></div>
          <div>
            <div class="field"><div class="label">Username</div><div class="value">${user.firstName} ${user.lastName}</div></div>
            <div class="field"><div class="label">Email</div><div class="value">${user.email}</div></div>
            <div class="field"><div class="label">Role</div><div class="value">${getRoleDisplay(user.role)}</div></div>
            <div class="field"><div class="label">Joined</div><div class="value">${user['createdAt'] ? new Date(user['createdAt'].seconds ? user['createdAt'].seconds * 1000 : user['createdAt']).toLocaleString() : 'N/A' }</div></div>
            ${user.role === 'client' && (user as any).tempPassword ? `<div class="field"><div class="label">Temporary Password</div><div class="value"><span class="badge">${(user as any).tempPassword}</span></div></div>` : ''}
          </div>
          <div class="footer">This document was generated by trustNshare. Please store temporary credentials securely.</div>
        </body>
      </html>
    `;

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      toast.error('Unable to open print window (blocked by browser)');
      return;
    }
    newWindow.document.open();
    newWindow.document.write(letterheadHTML);
    newWindow.document.close();
    // Give the window a moment to render then trigger print
    setTimeout(() => {
      newWindow.focus();
      newWindow.print();
    }, 500);
  };

  const handleDelete = async (uid: string) => {
    try {
      const userDocRef = doc(firestore, 'users', uid);
      await updateDoc(userDocRef, { status: 'inactive' });
      toast.success('User access revoked successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error revoking access:', error);
      toast.error('Failed to revoke access');
    }
  };

  const getRoleDisplay = (role: string) => {
    const option = roleOptions.find(r => r.value === role);
    return option ? option.label : role;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'client': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>;
  }

  const filteredUsers = users.filter((user) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    const email = (user.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">User & Role Management</h2>
            <p className="text-muted-foreground mt-1">
              Manage active clients and co admins
            </p>
          </div>
          {/* Add User Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90"
                onClick={() => {
                  setEditingUser(null);
                  setFormData({ firstName: '', lastName: '', email: '', role: 'client' });
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with assigned role and temporary password
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

            {/* View Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={(open) => { if (!open) { setEditingUser(null); } setIsViewDialogOpen(open); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>User Details</DialogTitle>
                  <DialogDescription>View user information and download onboarding PDF</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Username</div>
                    <div className="text-base font-medium">{editingUser ? `${editingUser.firstName} ${editingUser.lastName}` : ''}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="text-base">{editingUser?.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Role</div>
                    <div className="text-base">{editingUser ? getRoleDisplay(editingUser.role) : ''}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Joined</div>
                    <div className="text-base">{editingUser?.createdAt ? new Date(editingUser.createdAt.seconds ? editingUser.createdAt.seconds * 1000 : editingUser.createdAt).toLocaleString() : 'N/A'}</div>
                  </div>
                  {editingUser?.role === 'client' && editingUser?.tempPassword && (
                    <div>
                      <div className="text-sm text-muted-foreground">Temporary Password</div>
                      <div className="text-base"><code className="bg-muted px-2 py-1 rounded">{editingUser.tempPassword}</code></div>
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => { setIsViewDialogOpen(false); setEditingUser(null); }}>
                      Close
                    </Button>
                    <Button onClick={() => editingUser && downloadAsPDF(editingUser)}>
                      Download PDF
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

          {/* Edit Role Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { setEditingUser(null); } setIsEditDialogOpen(open); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User Role</DialogTitle>
                <DialogDescription>Update user role</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingUser(null); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    Update
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Clients and Co Admins</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  className="w-[240px]"
                  placeholder="Search name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">{filteredUsers.length} shown</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="border-b border-border hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium">{user.firstName} {user.lastName}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-4">
                        <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleDisplay(user.role)}</Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(user)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.uid)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Users;
