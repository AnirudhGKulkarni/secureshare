import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, 
  Key, 
  Bell, 
  Users, 
  Settings, 
  Lock, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

const SecuritySettings = () => {
  const [settings, setSettings] = useState({
    twoFactorAuth: true,
    passwordExpiry: true,
    loginNotifications: true,
    suspiciousActivityAlerts: true,
    sessionTimeout: '30',
    maxLoginAttempts: '5',
    passwordMinLength: '8',
    requireSpecialChars: true,
    requireNumbers: true,
    requireUppercase: true,
    autoLockout: true,
    ipWhitelisting: false,
    auditLogging: true,
    encryptionLevel: 'aes-256'
  });

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Security Settings</h2>
          <p className="text-muted-foreground mt-1">
            Configure security policies and authentication settings
          </p>
        </div>

        <Tabs defaultValue="authentication" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="password">Password Policy</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="access">Access Control</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Authentication Settings */}
          <TabsContent value="authentication">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Multi-Factor Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Require 2FA for all user accounts
                      </p>
                    </div>
                    <Switch
                      checked={settings.twoFactorAuth}
                      onCheckedChange={(checked) => handleSettingChange('twoFactorAuth', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Session Management</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                        <Select 
                          value={settings.sessionTimeout} 
                          onValueChange={(value) => handleSettingChange('sessionTimeout', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                            <SelectItem value="480">8 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max-attempts">Max Login Attempts</Label>
                        <Select 
                          value={settings.maxLoginAttempts}
                          onValueChange={(value) => handleSettingChange('maxLoginAttempts', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 attempts</SelectItem>
                            <SelectItem value="5">5 attempts</SelectItem>
                            <SelectItem value="10">10 attempts</SelectItem>
                            <SelectItem value="unlimited">Unlimited</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Account Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Auto Account Lockout</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically lock accounts after failed login attempts
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoLockout}
                      onCheckedChange={(checked) => handleSettingChange('autoLockout', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Password Policy */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Password Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Password Expiry</Label>
                    <p className="text-sm text-muted-foreground">
                      Force users to change passwords regularly
                    </p>
                  </div>
                  <Switch
                    checked={settings.passwordExpiry}
                    onCheckedChange={(checked) => handleSettingChange('passwordExpiry', checked)}
                  />
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-length">Minimum Password Length</Label>
                    <Select 
                      value={settings.passwordMinLength}
                      onValueChange={(value) => handleSettingChange('passwordMinLength', value)}
                    >
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 characters</SelectItem>
                        <SelectItem value="8">8 characters</SelectItem>
                        <SelectItem value="12">12 characters</SelectItem>
                        <SelectItem value="16">16 characters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Character Requirements</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Require uppercase letters</Label>
                        <Switch
                          checked={settings.requireUppercase}
                          onCheckedChange={(checked) => handleSettingChange('requireUppercase', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Require numbers</Label>
                        <Switch
                          checked={settings.requireNumbers}
                          onCheckedChange={(checked) => handleSettingChange('requireNumbers', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Require special characters</Label>
                        <Switch
                          checked={settings.requireSpecialChars}
                          onCheckedChange={(checked) => handleSettingChange('requireSpecialChars', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Security Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Login Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify users of successful logins from new devices
                    </p>
                  </div>
                  <Switch
                    checked={settings.loginNotifications}
                    onCheckedChange={(checked) => handleSettingChange('loginNotifications', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Suspicious Activity Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert administrators of potentially malicious activity
                    </p>
                  </div>
                  <Switch
                    checked={settings.suspiciousActivityAlerts}
                    onCheckedChange={(checked) => handleSettingChange('suspiciousActivityAlerts', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Access Control */}
          <TabsContent value="access">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Access Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">IP Whitelisting</Label>
                    <p className="text-sm text-muted-foreground">
                      Restrict access to specific IP addresses
                    </p>
                  </div>
                  <Switch
                    checked={settings.ipWhitelisting}
                    onCheckedChange={(checked) => handleSettingChange('ipWhitelisting', checked)}
                  />
                </div>
                {settings.ipWhitelisting && (
                  <div className="space-y-2">
                    <Label>Allowed IP Addresses</Label>
                    <Input placeholder="192.168.1.0/24, 10.0.0.0/8" />
                    <p className="text-xs text-muted-foreground">
                      Enter IP addresses or CIDR blocks separated by commas
                    </p>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all security-related events
                    </p>
                  </div>
                  <Switch
                    checked={settings.auditLogging}
                    onCheckedChange={(checked) => handleSettingChange('auditLogging', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Advanced Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Data Encryption Level</Label>
                    <Select 
                      value={settings.encryptionLevel}
                      onValueChange={(value) => handleSettingChange('encryptionLevel', value)}
                    >
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aes-128">AES-128</SelectItem>
                        <SelectItem value="aes-256">AES-256</SelectItem>
                        <SelectItem value="rsa-2048">RSA-2048</SelectItem>
                        <SelectItem value="rsa-4096">RSA-4096</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">SSL/TLS encryption enabled</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Firewall protection active</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">Security certificate expires in 30 days</span>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">Warning</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Settings */}
        <div className="flex justify-end gap-2">
          <Button variant="outline">Reset to Defaults</Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SecuritySettings;