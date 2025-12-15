import { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
 
import { User, Lock, Bell, Moon } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const { currentUser, profile, refreshProfile } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    // initialize from profile if available
    if (profile) {
      setName(profile.firstName ? `${profile.firstName} ${profile.lastName || ''}` : (currentUser?.displayName || ''));
      setRole(profile.role || '');
      setEmailNotifications(Boolean((profile as any).emailNotifications ?? true));
      setSecurityAlerts(Boolean((profile as any).securityAlerts ?? true));
      setDarkMode(Boolean((profile as any).darkMode ?? false));
    }
  }, [profile, currentUser]);

  useEffect(() => {
    // listen to user doc for realtime updates
    if (!currentUser?.uid) return;
    const userRef = doc(firestore, 'users', currentUser.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      const data = snap.data() || {};
      setName(data.firstName ? `${data.firstName} ${data.lastName || ''}` : (currentUser.displayName || ''));
      setRole(data.role || data.roleName || '');
      setEmailNotifications(Boolean(data.emailNotifications ?? true));
      setSecurityAlerts(Boolean(data.securityAlerts ?? true));
      setDarkMode(Boolean(data.darkMode ?? false));
    }, (e) => console.warn('users listener', e));

    return () => unsub();
  }, [currentUser]);

  const updateUserSettings = async (updates: any) => {
    if (!currentUser?.uid) {
      toast.error('Not signed in');
      return;
    }
    try {
      await updateDoc(doc(firestore, 'users', currentUser.uid), updates);
      toast.success('Settings saved');
      if (refreshProfile) refreshProfile();
    } catch (e) {
      console.error('update user settings failed', e);
      toast.error('Failed to save settings');
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser?.uid) {
      toast.error('Not signed in');
      return;
    }
    const [firstName, ...rest] = String(name || '').trim().split(' ');
    const lastName = rest.join(' ');
    try {
      await updateDoc(doc(firestore, 'users', currentUser.uid), { firstName: firstName || '', lastName: lastName || '', displayName: name });
      toast.success('Profile updated');
      if (refreshProfile) refreshProfile();
    } catch (e) {
      console.error('save profile failed', e);
      toast.error('Failed to save profile');
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    // Simulate password change
    toast.success('Password changed successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    document.documentElement.classList.toggle('dark', checked);
    toast.success(`${checked ? 'Dark' : 'Light'} mode enabled`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and security
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={currentUser?.email} disabled />
                <p className="text-xs text-muted-foreground">
                  Contact admin to change your email address
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={role} disabled />
              </div>
              <Button className="w-full" onClick={handleSaveProfile}>Save Changes</Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Manage notification preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-base">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={(v: boolean) => {
                    setEmailNotifications(!!v);
                    updateUserSettings({ emailNotifications: !!v });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="security-alerts" className="text-base">
                    Security Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about security events
                  </p>
                </div>
                <Switch
                  id="security-alerts"
                  checked={securityAlerts}
                  onCheckedChange={(v: boolean) => {
                    setSecurityAlerts(!!v);
                    updateUserSettings({ securityAlerts: !!v });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Moon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize how the app looks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode" className="text-base">
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle dark theme
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={(v: boolean) => {
                    handleDarkModeToggle(!!v);
                    updateUserSettings({ darkMode: !!v });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
