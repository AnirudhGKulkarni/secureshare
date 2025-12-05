import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, AlertTriangle, Activity, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type UserRecord = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'admin' | 'client' | 'super_admin';
  status?: 'pending' | 'active' | 'rejected';
  company?: string | null;
  createdAt?: any;
};

const SuperAdminDashboard = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);
  const [recentRequests, setRecentRequests] = useState<Array<{ name: string; company?: string | null; status: 'pending' | 'approved' | 'rejected'; createdAt?: any }>>([]);

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
      list.sort((a, b) => {
        const at = (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.parse(a.createdAt || 0)) || 0;
        const bt = (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.parse(b.createdAt || 0)) || 0;
        return bt - at;
      });
      setUsers(list);
    });
    return () => unsub();
  }, []);

  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: { name: string; year: number; month: number; admins: number; clients: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        name: monthNames[d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth(),
        admins: 0,
        clients: 0,
      });
    }
    users.forEach(u => {
      const ts = u.createdAt;
      let created: Date | null = null;
      if (!ts) return;
      if (ts?.seconds) {
        created = new Date(ts.seconds * 1000);
      } else {
        const parsed = Date.parse(ts);
        created = isNaN(parsed) ? null : new Date(parsed);
      }
      if (!created) return;
      const y = created.getFullYear();
      const m = created.getMonth();
      const bucket = buckets.find(b => b.year === y && b.month === m);
      if (!bucket) return;
      if (u.role === 'admin') bucket.admins += 1;
      else if (u.role === 'client') bucket.clients += 1;
    });
    return buckets.map(b => ({ name: b.name, admins: b.admins, clients: b.clients }));
  }, [users]);

  const relativeTime = (ts: any) => {
    const ms = (ts?.seconds ? ts.seconds * 1000 : Date.parse(ts || 0)) || 0;
    if (!ms) return 'N/A';
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  useEffect(() => {
    const approvalsRef = collection(firestore, 'approval_documents');
    const unsub = onSnapshot(approvalsRef, (snap) => {
      let pending = 0;
      const requests: Array<{ name: string; company?: string | null; status: 'pending' | 'approved' | 'rejected'; createdAt?: any }> = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        const st = data?.status;
        if (st === 'pending') pending += 1;
        requests.push({
          name: data?.firstName ?? data?.adminName ?? data?.name ?? data?.email ?? 'Unknown',
          company: data?.company ?? data?.org ?? null,
          status: (data?.status as any) ?? 'pending',
          createdAt: data?.createdAt ?? null,
        });
      });
      setPendingApprovals(pending);
      requests.sort((a, b) => {
        const at = (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.parse(a.createdAt || 0)) || 0;
        const bt = (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.parse(b.createdAt || 0)) || 0;
        return bt - at;
      });
      setRecentRequests(requests.slice(0, 3));
    });
    return () => unsub();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Manage the entire platform, approve admins, and monitor system-wide activity
          </p>
        </div>

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
                      borderRadius: '8px',
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
                  {recentRequests.map((request, i) => (
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
                        <p className="text-xs text-muted-foreground">{request.company || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            request.status === 'pending'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {request.status}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">{relativeTime(request.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
