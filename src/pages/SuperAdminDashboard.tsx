import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, AlertTriangle, Activity, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
// toast not needed after removing inline user management

// Stats are now computed from Firestore in real-time below.

const chartData = [
  { name: 'Jan', admins: 8, clients: 180 },
  { name: 'Feb', admins: 9, clients: 195 },
  { name: 'Mar', admins: 10, clients: 210 },
  { name: 'Apr', admins: 11, clients: 225 },
  { name: 'May', admins: 11, clients: 235 },
  { name: 'Jun', admins: 12, clients: 248 },
];

const SuperAdminDashboard = () => {
  type UserRecord = {
    id: string; // Firestore doc id (uid for most users)
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: 'admin' | 'client' | 'super_admin';
    status?: 'pending' | 'active' | 'rejected';
    company?: string | null;
    createdAt?: any;
  };

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);
  // User management moved to All Users page; dashboard keeps overview only

  // Real-time users subscription
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
          company: data?.company ?? null,
          createdAt: data?.createdAt ?? null,
        });
      });
      // Sort newest first when timestamp available
      list.sort((a, b) => {
        const at = (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.parse(a.createdAt || 0)) || 0;
        const bt = (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.parse(b.createdAt || 0)) || 0;
        return bt - at;
      });
      setUsers(list);
    });
    return () => unsub();
  }, []);

  // Real-time pending approvals count
  useEffect(() => {
    const approvalsRef = collection(firestore, 'approval_documents');
    const unsub = onSnapshot(approvalsRef, (snap) => {
      let pending = 0;
      snap.forEach((d) => {
        const st = (d.data() as any)?.status;
        if (st === 'pending') pending += 1;
      });
      setPendingApprovals(pending);
    });
    return () => unsub();
  }, []);

  // No local filtering; user list is for stats only

  // Inline add/delete handlers removed

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Manage the entire platform, approve admins, and monitor system-wide activity
          </p>
        </div>

        {/* Real-time Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'Total Admins', value: String(users.filter(u => u.role === 'admin').length), icon: Shield },
            { name: 'Total Clients', value: String(users.filter(u => u.role === 'client').length), icon: Users },
            { name: 'Pending Approvals', value: String(pendingApprovals), icon: AlertTriangle },
            (() => {
              const total = users.length || 1;
              const active = users.filter(u => u.status === 'active').length;
              const percent = Math.min(100, Math.round((active / total) * 100));
              return { name: 'System Activity', value: `${percent}%`, icon: Activity };
            })(),
          ].map((stat, i) => (
            <Card key={i} className="overflow-hidden transition-all hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs mt-1 text-muted-foreground">Live</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dashboard content only; user management moved to All Users page */}
        <div className="space-y-6">

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Platform Growth Overview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monthly growth of admins and clients across the platform
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-sm" />
                    <YAxis className="text-sm" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="admins" fill="hsl(var(--primary))" name="Admins" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="clients" fill="hsl(var(--accent))" name="Clients" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Recent Admin Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: 'John Doe', company: 'TechCorp Inc.', status: 'pending', time: '2 hours ago' },
                      { name: 'Jane Smith', company: 'DataSys Ltd.', status: 'pending', time: '5 hours ago' },
                      { name: 'Mike Johnson', company: 'SecureNet', status: 'approved', time: '1 day ago' },
                    ].map((request, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          {request.status === 'pending' ? (
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{request.name}</p>
                          <p className="text-xs text-muted-foreground">{request.company}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded ${
                            request.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {request.status}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">{request.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {[
                      { title: 'Review Admin Approvals', desc: 'View pending admin requests', icon: Shield, badge: '5' },
                      { title: 'View Audit Logs', desc: 'Monitor system activity', icon: Activity, badge: null },
                      { title: 'Manage Users', desc: 'View all admins and clients', icon: Users, badge: null },
                    ].map((action, i) => (
                      <button
                        key={i}
                        className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-secondary to-accent hover:shadow-md transition-all text-left relative"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <action.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{action.title}</p>
                          <p className="text-sm text-muted-foreground">{action.desc}</p>
                        </div>
                        {action.badge && (
                          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                            {action.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Database</p>
                      <p className="text-xs text-muted-foreground">Operational</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Authentication</p>
                      <p className="text-xs text-muted-foreground">Operational</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Storage</p>
                      <p className="text-xs text-muted-foreground">Operational</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* end users+content grid */}
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
