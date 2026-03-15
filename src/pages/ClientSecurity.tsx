import React, { useState, useEffect } from 'react';
// Rendered within the `/client` parent route which provides the layout
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, Shield, Check, Smartphone, Wifi, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { firestore } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

const ClientSecurity: React.FC = () => {
  const { currentUser } = useAuth();
  const [loginAlerts, setLoginAlerts] = useState<boolean>(true);
  const [alertsLoading, setAlertsLoading] = useState<boolean>(true);
  const [deviceId, setDeviceId] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('');

  // Get device identity from localStorage
  useEffect(() => {
    const storedDeviceId = localStorage.getItem('device-id');
    if (storedDeviceId) {
      setDeviceId(storedDeviceId.substring(0, 12) + '...');
    }
  }, []);

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
        <h2 className="text-2xl font-bold text-foreground">Security</h2>
        <p className="text-sm text-muted-foreground dark:text-slate-400">Manage security settings for your account</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* SCDA Device & Session Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> 
              SCDA Security Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-blue-900">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <Label className="font-semibold">Device ID</Label>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-mono bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                  {deviceId || 'Not initialized'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unique identifier for this device</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <Label className="font-semibold">Session Status</Label>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
                  <Check className="h-4 w-4" /> Active & Protected
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">SCDA validation enabled</p>
              </div>
            </div>

            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                Active Protections
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  Role-Based Access Control (RBAC)
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  Session Identity Token Validation
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  Device Fingerprint Verification
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  IP Address Tracking
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  Brute-Force Protection
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Login Notifications</Label>
                <div className="text-xs text-muted-foreground dark:text-slate-400">Receive alerts for new device logins</div>
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

        {/* <div className="flex justify-end gap-2">
          <Button variant="outline">Reset Defaults</Button>
          <Button>Save Changes</Button>
        </div> */}

        <div className="flex justify-end gap-2">
  <Button
    variant="outline"
    className="text-black dark:text-white"
  >
    Reset Defaults
  </Button>

  <Button className="text-white hover:opacity-90" style={{ backgroundColor: '#113738' }}>
    Save Changes
  </Button>
</div>




      </div>
    </div>
  );
};

export default ClientSecurity;
