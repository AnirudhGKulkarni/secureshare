import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, MapPin, Shield, AlertTriangle, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

// loginHistory will be loaded from Firestore `audit_logs` (action: LOGIN)

const stats = [
  {
    title: 'Total Logins Today',
    value: '147',
    icon: Clock,
    change: '+12%',
    changeType: 'increase'
  },
  {
    title: 'Failed Attempts',
    value: '23',
    icon: AlertTriangle,
    change: '+5%',
    changeType: 'increase'
  },
  {
    title: 'Blocked IPs',
    value: '8',
    icon: Shield,
    change: '-2%',
    changeType: 'decrease'
  },
  {
    title: 'Success Rate',
    value: '94.2%',
    icon: CheckCircle,
    change: '+1.2%',
    changeType: 'increase'
  }
];

const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'blocked':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Blocked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return <Badge variant="outline" className="text-green-600 border-green-600">Low</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Medium</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-red-600 border-red-600">High</Badge>;
      default:
        return <Badge variant="outline">{risk}</Badge>;
    }
  };

const LoginHistory = () => {
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [statsState, setStatsState] = useState<any[]>(stats);

  // realtime listener: audit_logs where action == 'LOGIN'
  useEffect(() => {
    const q = query(collection(firestore, 'audit_logs'), where('action', '==', 'LOGIN'), orderBy('timestamp', 'desc'), limit(200));
    const unsub = onSnapshot(q, async (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      // fetch user profiles for userIds referenced in logs
      const userIds = Array.from(new Set(docs.map((d: any) => d.userId).filter(Boolean)));
      const usersMap: Record<string, any> = {};
      await Promise.all(userIds.map(async (uid) => {
        try {
          const ud = await getDoc(doc(firestore, 'users', uid));
          if (ud.exists()) usersMap[uid] = ud.data();
        } catch (e) { console.warn('user fetch', e); }
      }));

      // map docs to table entries
      const mapped = docs.map((d: any, idx: number) => {
        const u = usersMap[d.userId] || {};
        return {
          id: d.id,
          user: u.email || u.displayName || d.userId,
          timestamp: d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString() : (d.timestamp || ''),
          location: d.location || (u.location || 'Unknown'),
          ipAddress: d.ip || d.ipAddress || '—',
          device: d.device || '—',
          status: d.status || 'success',
          riskLevel: d.riskLevel || 'low',
        };
      });

      setLoginHistory(mapped);

      // compute basic stats
      const total = mapped.length;
      const today = new Date();
      const totalToday = mapped.filter((m) => {
        try { return new Date(m.timestamp).toDateString() === today.toDateString(); } catch { return false; }
      }).length;
      const failed = mapped.filter(m => m.status === 'failed').length;
      const blocked = mapped.filter(m => m.status === 'blocked').length;
      const success = total - failed - blocked;
      const successRate = total ? Math.round((success / total) * 1000) / 10 : 0;

      setStatsState([
        { title: 'Total Logins Today', value: String(totalToday), icon: Clock, change: '', changeType: 'increase' },
        { title: 'Failed Attempts', value: String(failed), icon: AlertTriangle, change: '', changeType: failed > 0 ? 'increase' : 'decrease' },
        { title: 'Blocked', value: String(blocked), icon: Shield, change: '', changeType: blocked > 0 ? 'increase' : 'decrease' },
        { title: 'Success Rate', value: `${successRate}%`, icon: CheckCircle, change: '', changeType: 'increase' }
      ]);
    }, (e) => console.warn('audit_logs listener', e));

    return () => unsub();
  }, []);

  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Login History</h2>
          <p className="text-muted-foreground mt-1">
            Monitor user authentication activities and security events
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsState.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className={`text-xs ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change} from yesterday
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Login Activity</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" placeholder="Search by user, IP, or location..." />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all-risk">
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-risk">All Risk Levels</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Login History Table */}
            <div className="rounded-md border">
              <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.user}</TableCell>
                      <TableCell>{entry.timestamp}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {entry.location}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>{getRiskBadge(entry.riskLevel)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedEntry(entry); setIsDialogOpen(true); }}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing 1-{Math.min(loginHistory.length, 50)} of {loginHistory.length} login attempts
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Details dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setSelectedEntry(null); setIsDialogOpen(open); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Login details</DialogTitle>
              <DialogDescription>Details for the selected login event</DialogDescription>
            </DialogHeader>
            {selectedEntry ? (
              <div className="space-y-4 mt-2">
                <div><strong>User:</strong> {selectedEntry.user}</div>
                <div><strong>Timestamp:</strong> {selectedEntry.timestamp}</div>
                <div><strong>Location:</strong> {selectedEntry.location}</div>
                <div><strong>IP Address:</strong> {selectedEntry.ipAddress || '—'}</div>
                <div><strong>Device:</strong> {selectedEntry.device || '—'}</div>
                <div><strong>Status:</strong> {selectedEntry.status}</div>
                <div><strong>Risk Level:</strong> {selectedEntry.riskLevel}</div>
              </div>
            ) : (
              <div>Loading...</div>
            )}
            <DialogFooter className="mt-6">
              <div className="flex justify-end w-full">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Close</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default LoginHistory;