import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users as UsersIcon, UserPlus, Trash2 } from 'lucide-react';
import { firestore } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

// Manage all users (admins + clients) in real-time for Super Admin

type Role = 'admin' | 'client' | 'super_admin';

type UserRecord = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: Role;
  status?: 'pending' | 'active' | 'rejected' | 'inactive';
  createdAt?: any;
  tempPassword?: string;
};

const roleFilters = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admins' },
  { value: 'client', label: 'Clients' },
  { value: 'super_admin', label: 'Super Admins' },
] as const;

const SuperUsers = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [newUser, setNewUser] = useState<{ firstName: string; lastName: string; email: string; role: Role }>(
    { firstName: '', lastName: '', email: '', role: 'client' }
  );
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [viewUser, setViewUser] = useState<UserRecord | null>(null);
  const [editUser, setEditUser] = useState<{ firstName: string; lastName: string; email: string; role: Role; status: 'pending' | 'active' | 'rejected' | 'inactive'; tempPassword?: string } | null>(null);

  useEffect(() => {
    const ref = collection(firestore, 'users');
    const unsub = onSnapshot(ref, (snap) => {
      const list: UserRecord[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        list.push({
          id: d.id,
          firstName: data?.firstName ?? '',
          lastName: data?.lastName ?? '',
          email: data?.email ?? '',
          role: data?.role ?? 'client',
          status: data?.status ?? 'active',
          createdAt: data?.createdAt ?? null,
          tempPassword: data?.tempPassword ?? '',
        });
      });
      // sort newest first when possible
      list.sort((a, b) => {
        const at = (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.parse(a.createdAt || 0)) || 0;
        const bt = (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.parse(b.createdAt || 0)) || 0;
        return bt - at;
      });
      setUsers(list);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    return list;
  }, [users, roleFilter, searchQuery]);

  const getRoleBadgeVariant = (role?: Role) => {
    switch (role) {
      case 'admin':
        return 'default' as const;
      case 'client':
        return 'secondary' as const;
      case 'super_admin':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  // Slightly brighter styling for client badges
  const getRoleBadgeClass = (role?: Role) => {
    if (role === 'client') {
      return 'bg-blue-100 text-blue-700';
    }
    return '';
  };

  const formatDate = (ts: any) => {
    if (!ts) return 'N/A';
    const ms = ts?.seconds ? ts.seconds * 1000 : Date.parse(ts) || undefined;
    if (!ms) return 'N/A';
    return new Date(ms).toLocaleString();
  };

  const openView = (u: UserRecord) => {
    setViewUser(u);
    setEditUser({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: (u as any).email || '',
      role: (u.role as Role) || 'client',
      status: (u.status as any) || 'active',
      tempPassword: (u as any).tempPassword || '',
    });
  };

  // Edits are disabled: no save handler

  const handleAddUser = async () => {
    if (!newUser.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!newUserPassword.trim()) {
      toast.error('Password is required');
      return;
    }
    setAdding(true);
    try {
      let createdUid: string | undefined;

      // 1) Try secure backend (Admin SDK) if configured
      const endpoint = import.meta.env.VITE_ADMIN_CREATE_USER_URL as string | undefined;
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newUser.email.trim().toLowerCase(),
            password: newUserPassword,
            displayName: `${newUser.firstName} ${newUser.lastName}`.trim(),
            role: newUser.role,
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Auth user creation failed: ${res.status} ${text}`);
        }
        const data = await res.json().catch(() => ({}));
        createdUid = data.uid as string | undefined;
      } else {
        // 2) Fallback: Firebase Identity Toolkit (client REST). Keeps current session intact.
        const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
        if (!apiKey) throw new Error('Missing VITE_FIREBASE_API_KEY');
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newUser.email.trim().toLowerCase(),
            password: newUserPassword,
            returnSecureToken: true,
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Auth signUp failed: ${res.status} ${text}`);
        }
        const data = await res.json();
        createdUid = data.localId;
      }

      // 3) Create/merge Firestore profile with uid doc id
      const uid = createdUid || crypto.randomUUID();
      await (await import('firebase/firestore')).setDoc(
        (await import('firebase/firestore')).doc(firestore, 'users', uid),
        {
          uid,
          firstName: newUser.firstName.trim(),
          lastName: newUser.lastName.trim(),
          email: newUser.email.trim().toLowerCase(),
          role: newUser.role,
          status: 'active',
          createdAt: serverTimestamp(),
          tempPassword: newUserPassword,
        },
        { merge: true }
      );
      setNewUser({ firstName: '', lastName: '', email: '', role: 'client' });
      setNewUserPassword('');
      toast.success('User profile created (Firestore)');
    } catch (e: any) {
      console.error('Add user failed:', e);
      toast.error(e?.message || 'Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUser = async (u: UserRecord) => {
    if (!confirm(`Delete ${u.email}? This removes their profile document.`)) return;
    try {
      await deleteDoc(doc(firestore, 'users', u.id));
      toast.success('User profile deleted');
    } catch (e: any) {
      console.error('Delete user failed:', e);
      toast.error(e?.message || 'Failed to delete user');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">All Users</h2>
            <p className="text-muted-foreground mt-1">Real-time users across admins, clients, and super admins</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent-foreground hover:opacity-90">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User (Firestore)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User Profile</DialogTitle>
                <DialogDescription>Create a user profile document in Firestore</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={newUser.firstName} onChange={(e) => setNewUser(s => ({...s, firstName: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={newUser.lastName} onChange={(e) => setNewUser(s => ({...s, lastName: e.target.value}))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={newUser.email} onChange={(e) => setNewUser(s => ({...s, email: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUser.role} onValueChange={(v: Role) => setNewUser(s => ({...s, role: v}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddUser} disabled={adding}>
                  {adding ? 'Adding…' : 'Create Profile'}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Note: Creating a Firebase Auth account requires a secure backend. This page updates Firestore profiles only.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><UsersIcon className="h-5 w-5"/> Users</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleFilters.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Input
                    className="w-[220px]"
                    placeholder="Search name or email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {filtered.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : (u.email || 'Unnamed')}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs"><Badge variant={getRoleBadgeVariant(u.role)} className={getRoleBadgeClass(u.role)}>{u.role}</Badge> <span className="ml-2 text-muted-foreground">{u.status}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openView(u)}>View</Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteUser(u)} aria-label="Delete user">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground">No users found for this filter.</div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* View User Dialog */}
        <Dialog open={!!viewUser} onOpenChange={(o) => { if (!o) { setViewUser(null); setEditUser(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>View user profile and password</DialogDescription>
            </DialogHeader>
            {viewUser && editUser && (
              <div className="space-y-4">
                {/* Read-only mode presented as text, not inputs */}
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">First Name</div>
                    <div className="text-sm font-medium">{editUser.firstName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Last Name</div>
                    <div className="text-sm font-medium">{editUser.lastName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-sm">{editUser.email || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Role</div>
                    <div className="text-sm"><Badge variant={getRoleBadgeVariant(editUser.role)} className={getRoleBadgeClass(editUser.role)}>{editUser.role}</Badge></div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="text-sm">{editUser.status}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Password (stored in Firestore as tempPassword)</div>
                    <div className="text-sm break-all">{editUser.tempPassword || '-'}</div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setViewUser(null); setEditUser(null); }}>Close</Button>
                </div>
                <div className="text-xs text-muted-foreground">Created At: {formatDate(viewUser.createdAt)}</div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SuperUsers;

