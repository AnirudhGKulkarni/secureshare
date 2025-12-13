import React, { useState, useEffect } from 'react';
// Rendered within the `/client` parent route which provides the layout
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { firestore } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

const ClientSecurity: React.FC = () => {
  const { currentUser } = useAuth();
  const [loginAlerts, setLoginAlerts] = useState<boolean>(true);
  const [alertsLoading, setAlertsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentUser) return;
    const userRef = doc(firestore, 'users', currentUser.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      const data = snap.data() as any;
      setLoginAlerts(data?.loginAlerts ?? true);
      setAlertsLoading(false);
    }, (err) => {
      console.error('user settings snapshot error:', err);
      setAlertsLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security</h2>
        <p className="text-sm text-muted-foreground">Manage security settings for your account</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Login Notifications</Label>
                <div className="text-xs text-muted-foreground">Receive alerts for new device logins</div>
              </div>
              <Switch
                checked={loginAlerts}
                disabled={alertsLoading}
                onCheckedChange={async (v) => {
                  const enabled = Boolean(v);
                  const prev = loginAlerts;
                  // optimistic
                  setLoginAlerts(enabled);
                  if (!currentUser) return;
                  try {
                    // Use setDoc merge to create the field if doc doesn't exist
                    await setDoc(doc(firestore, 'users', currentUser.uid), { loginAlerts: enabled }, { merge: true });
                  } catch (err: any) {
                    console.error('Failed to update loginAlerts:', err);
                    setLoginAlerts(prev);
                    toast.error('Could not update alert settings.');
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline">Reset Defaults</Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

export default ClientSecurity;
