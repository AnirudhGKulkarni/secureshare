import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, User, Shield, Share2, Settings } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

interface AuditLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  status: 'Success' | 'Failed' | 'Warning';
  details: string;
}

const initialAuditLogs: AuditLog[] = [
  {
    id: '1',
    user: 'John Doe',
    action: 'Shared customer data',
    timestamp: '2024-01-15 14:32:15',
    status: 'Success',
    details: 'Shared encrypted file customer_data.csv with Vendor',
  },
  {
    id: '2',
    user: 'Jane Smith',
    action: 'Updated policy #12',
    timestamp: '2024-01-15 13:15:42',
    status: 'Success',
    details: 'Modified Customer PII Protection policy',
  },
  {
    id: '3',
    user: 'Mike Johnson',
    action: 'Added new user',
    timestamp: '2024-01-15 11:28:03',
    status: 'Success',
    details: 'Created account for sarah@company.com',
  },
  {
    id: '4',
    user: 'Sarah Williams',
    action: 'Login attempt',
    timestamp: '2024-01-15 10:45:22',
    status: 'Failed',
    details: 'Invalid credentials from IP 192.168.1.100',
  },
  {
    id: '5',
    user: 'John Doe',
    action: 'Exported audit logs',
    timestamp: '2024-01-15 09:12:35',
    status: 'Success',
    details: 'Downloaded audit logs for December 2023',
  },
  {
    id: '6',
    user: 'Admin System',
    action: 'Policy violation detected',
    timestamp: '2024-01-15 08:55:18',
    status: 'Warning',
    details: 'Unauthorized access attempt to protected data',
  },
  {
    id: '7',
    user: 'Jane Smith',
    action: 'Updated user role',
    timestamp: '2024-01-14 16:42:11',
    status: 'Success',
    details: 'Changed role for mike@audit.com from Vendor to Auditor',
  },
  {
    id: '8',
    user: 'Mike Johnson',
    action: 'Created policy',
    timestamp: '2024-01-14 15:20:45',
    status: 'Success',
    details: 'Created new policy: Vendor Access Control',
  },
];

const getActionIcon = (action: string) => {
  if (action.includes('Shared')) return Share2;
  if (action.includes('policy') || action.includes('Policy')) return Shield;
  if (action.includes('user') || action.includes('User')) return User;
  if (action.includes('Settings')) return Settings;
  return FileText;
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Success': return 'default';
    case 'Failed': return 'destructive';
    case 'Warning': return 'secondary';
    default: return 'outline';
  }
};

const Audit = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  useEffect(() => {
    const q = query(collection(firestore, 'audit_logs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const mapped: AuditLog[] = docs.map((d: any) => {
        const ts = d.timestamp?.toDate ? d.timestamp.toDate() : d.timestamp ? new Date(d.timestamp) : null;
        return {
          id: d.id,
          user: d.user || d.userId || d.actor || d.email || 'Unknown',
          action: d.action || d.type || d.event || String(d.name || '') || 'Event',
          timestamp: ts ? ts.toLocaleString() : String(d.timestamp || ''),
          status: (d.status || (d.success === false ? 'Failed' : 'Success')) as AuditLog['status'],
          details: d.details || d.message || d.reason || JSON.stringify(d || {}),
        };
      });
      setAuditLogs(mapped);
    }, (e) => console.warn('audit_logs listener', e));

    return () => unsub();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
          <p className="text-muted-foreground mt-1">
            Track all system activities and user actions
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop / tablet: fixed table layout with wrapping to avoid horizontal scroll */}
            <div className="hidden md:block">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '48%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">User</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Action & details</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Timestamp</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => {
                    const ActionIcon = getActionIcon(log.action);
                    return (
                      <tr key={log.id} className="border-b border-border hover:bg-secondary/50 transition-colors group">
                        <td className="px-3 py-3 align-top min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium truncate max-w-[10rem] break-words">{log.user}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-start gap-2">
                            <ActionIcon className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{log.action}</p>
                              <p className="text-xs text-muted-foreground mt-1 break-words max-w-full">{log.details}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="text-sm text-muted-foreground font-mono">{log.timestamp}</span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Badge variant={getStatusVariant(log.status)}>{log.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards to avoid horizontal scrolling */}
            <div className="md:hidden space-y-3">
              {auditLogs.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <Card key={log.id} className="shadow-card">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{log.user}</p>
                            <p className="text-sm font-semibold truncate mt-1">{log.action}</p>
                            <p className="text-xs text-muted-foreground mt-1 break-words">{log.details}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground font-mono">{log.timestamp}</span>
                              <Badge variant={getStatusVariant(log.status)}>{log.status}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Total Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{auditLogs.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {Math.round((auditLogs.filter(l => l.status === 'Success').length / auditLogs.length) * 100)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">All operations</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {new Set(auditLogs.map(l => l.user)).size}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Unique users</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Audit;
