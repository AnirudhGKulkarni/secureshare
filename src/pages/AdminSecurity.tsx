import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Shield, Lock, AlertTriangle, CheckCircle, Eye, Users, Activity, 
  TrendingUp, Clock, Download, Smartphone, Wifi, Key 
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { firestore } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { toast } from 'sonner';

interface SCDAAccessLog {
  id: string;
  userId: string;
  userName: string;
  fileId: string;
  fileName: string;
  action: string;
  accessLevel: string;
  allowed: boolean;
  reason: string;
  timestamp: any;
  deviceId: string;
  ipAddress: string;
  roleLevel: number;
}

interface SCDAStats {
  totalFilesProtected: number;
  totalAccessAttempts: number;
  allowedAccess: number;
  deniedAccess: number;
  failedLoginAttempts: number;
  activeDevices: number;
  uniqueUsers: number;
  averageResponseTime: string;
}

const AdminSecurity: React.FC = () => {
  const [accessLogs, setAccessLogs] = useState<SCDAAccessLog[]>([]);
  const [stats, setStats] = useState<SCDAStats>({
    totalFilesProtected: 0,
    totalAccessAttempts: 0,
    allowedAccess: 0,
    deniedAccess: 0,
    failedLoginAttempts: 0,
    activeDevices: 0,
    uniqueUsers: 0,
    averageResponseTime: '124ms',
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  // Mock data for charts
  const accessTrendData = [
    { day: 'Mon', allowed: 145, denied: 12 },
    { day: 'Tue', allowed: 158, denied: 8 },
    { day: 'Wed', allowed: 142, denied: 15 },
    { day: 'Thu', allowed: 167, denied: 10 },
    { day: 'Fri', allowed: 173, denied: 6 },
    { day: 'Sat', allowed: 98, denied: 4 },
    { day: 'Sun', allowed: 85, denied: 3 },
  ];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Get SCDA access logs from Firestore
        const logsQuery = query(
          collection(firestore, 'scda_access_logs'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        const logsSnapshot = await getDocs(logsQuery);
        const logs: SCDAAccessLog[] = [];
        logsSnapshot.forEach((doc) => {
          const data = doc.data() as any;
          logs.push({
            id: doc.id,
            userId: data.userId || '',
            userName: data.userName || 'Unknown',
            fileId: data.fileId || '',
            fileName: data.fileName || 'Unknown File',
            action: data.action || 'ACCESS',
            accessLevel: data.accessLevel || 'READ',
            allowed: data.allowed !== false,
            reason: data.reason || 'No reason provided',
            timestamp: data.timestamp,
            deviceId: data.deviceId || 'N/A',
            ipAddress: data.ipAddress || 'N/A',
            roleLevel: data.roleLevel || 1,
          });
        });
        setAccessLogs(logs);

        // Calculate stats from logs
        const allowedCount = logs.filter((l) => l.allowed).length;
        const deniedCount = logs.filter((l) => !l.allowed).length;
        const uniqueDevices = new Set(logs.map((l) => l.deviceId)).size;
        const uniqueUsersSet = new Set(logs.map((l) => l.userId));

        setStats({
          totalFilesProtected: logs.length > 0 ? new Set(logs.map((l) => l.fileId)).size : 0,
          totalAccessAttempts: logs.length,
          allowedAccess: allowedCount,
          deniedAccess: deniedCount,
          failedLoginAttempts: deniedCount,
          activeDevices: uniqueDevices,
          uniqueUsers: uniqueUsersSet.size,
          averageResponseTime: '124ms',
        });
      } catch (error) {
        console.error('Error loading SCDA data:', error);
        toast.error('Failed to load security data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getAccessLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'WRITE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'READ':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getRoleColor = (level: number) => {
    switch (level) {
      case 4:
        return 'bg-red-500';
      case 3:
        return 'bg-purple-500';
      case 2:
        return 'bg-orange-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SCDA Security Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Secure Contextual Data Authorization - Advanced access control monitoring
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">Loading security data...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-900 to-blue-800 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-100">
                    <Shield className="h-5 w-5" />
                    Protected Files
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalFilesProtected}</div>
                  <p className="text-xs text-blue-200 mt-2">Active with SCDA signatures</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-green-900 to-green-800 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-100">
                    <CheckCircle className="h-5 w-5" />
                    Allowed Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.allowedAccess}</div>
                  <p className="text-xs text-green-200 mt-2">Verified & authorized</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-red-900 to-red-800 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-100">
                    <AlertTriangle className="h-5 w-5" />
                    Denied Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.deniedAccess}</div>
                  <p className="text-xs text-red-200 mt-2">Failed attempts blocked</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-purple-900 to-purple-800 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-100">
                    <Users className="h-5 w-5" />
                    Active Devices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.activeDevices}</div>
                  <p className="text-xs text-purple-200 mt-2">Currently tracked</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Logs */}
            <Tabs defaultValue="trends" className="space-y-4">
              <TabsList>
                <TabsTrigger value="trends">Access Trends</TabsTrigger>
                <TabsTrigger value="logs">Recent Activity</TabsTrigger>
                <TabsTrigger value="devices">Device Tracking</TabsTrigger>
              </TabsList>

              <TabsContent value="trends">
                <Card>
                  <CardHeader>
                    <CardTitle>Access Attempt Trends</CardTitle>
                    <CardDescription>Allowed vs. denied access attempts over the past 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={accessTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="allowed" fill="#22c55e" name="Allowed" />
                        <Bar dataKey="denied" fill="#ef4444" name="Denied" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs">
                <Card>
                  <CardHeader>
                    <CardTitle>SCDA Access Logs</CardTitle>
                    <CardDescription>Real-time access verification and authorization events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {accessLogs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No access logs available</p>
                      ) : (
                        accessLogs.map((log) => (
                          <div key={log.id} className="p-4 border rounded-lg hover:bg-secondary/50 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm">{log.fileName}</p>
                                  <Badge className={getAccessLevelColor(log.accessLevel)}>
                                    {log.accessLevel}
                                  </Badge>
                                  <Badge className={log.allowed ? 'bg-green-100 text-green-800 dark:bg-green-900' : 'bg-red-100 text-red-800 dark:bg-red-900'}>
                                    {log.allowed ? 'Allowed' : 'Denied'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  User: <span className="font-medium">{log.userName}</span> • 
                                  Device: <span className="font-mono text-xs">{log.deviceId.substring(0, 8)}...</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Reason: {log.reason}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="devices">
                <Card>
                  <CardHeader>
                    <CardTitle>Device Tracking</CardTitle>
                    <CardDescription>Active devices and their security context</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...new Set(accessLogs.map((l) => l.deviceId))]
                        .slice(0, 10)
                        .map((deviceId, idx) => {
                          const deviceLogs = accessLogs.filter((l) => l.deviceId === deviceId);
                          const lastAccess = deviceLogs[0];
                          const successRate = Math.round(
                            (deviceLogs.filter((l) => l.allowed).length / deviceLogs.length) * 100
                          );

                          return (
                            <div key={idx} className="p-4 border rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium text-sm font-mono break-all">{deviceId}</p>
                                    <p className="text-xs text-muted-foreground">
                                      IP: {lastAccess?.ipAddress || 'N/A'} • User: {lastAccess?.userName}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900">
                                    {successRate}% Success
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                                <span>Attempts: {deviceLogs.length}</span>
                                <span>Allowed: {deviceLogs.filter((l) => l.allowed).length}</span>
                                <span>Denied: {deviceLogs.filter((l) => !l.allowed).length}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* SCDA Features Overview */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  SCDA Algorithm Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-border">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      4-Tier Role Hierarchy
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      SuperSuperAdmin (4) → SuperAdmin (3) → Admin (2) → Client (1) with granular permission inheritance
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-border">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-purple-600" />
                      Cryptographic Signatures
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      DFP (Data Fingerprinting), SIT (Session Identity Token), STS (Secure Trust Signature) with SHA-256
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-border">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-green-600" />
                      9-Step Verification
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Role validation, session verification, device fingerprinting, IP tracking, and anomaly detection
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-border">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Brute-Force Protection
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      5 failed attempts trigger 15-minute lockout with automatic unblock by admin
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-border">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-600" />
                      Real-Time Audit Logs
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      All access attempts logged to Firestore with 90-day retention and compliance reporting
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-border">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-cyan-600" />
                      Device & IP Tracking
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Persistent device identification and IP address logging for enhanced session validation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminSecurity;
