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
import { Calendar, MapPin, Shield, AlertTriangle, CheckCircle, Clock, Search, Filter, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, limit, getDocs } from 'firebase/firestore';
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
  const [statsState, setStatsState] = useState<any[]>(
    stats.map((s) => ({ ...s, change: '', value: s.title === 'Success Rate' ? '0%' : '0' }))
  );

  // UI state: filters, search, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all-risk');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // helper to process raw docs -> mapped entries & stats
  const processDocs = async (docs: any[]) => {
    // filter incoming docs to those that appear to be login-related so we capture failed logs
    const loginLike = docs.filter((d: any) => {
      try {
        const action = String(d.action || '').toLowerCase();
        if (action.includes('login')) return true;
        if ((d.status || '').toLowerCase() === 'failed') return true;
        if (d.failureReason || d.reason || d.error || d.errorCode || d.errorMessage) return true;
        return false;
      } catch {
        return false;
      }
    });

    docs = loginLike;
    // fetch user profiles for userIds referenced in logs
    const userIds = Array.from(new Set(docs.map((d: any) => d.userId).filter(Boolean)));
    const usersMap: Record<string, any> = {};
    await Promise.all(userIds.map(async (uid) => {
      try {
        const ud = await getDoc(doc(firestore, 'users', uid));
        if (ud.exists()) usersMap[uid] = ud.data();
      } catch (e) { console.warn('user fetch', e); }
    }));

    const mapped = docs.map((d: any) => {
      const u = usersMap[d.userId] || {};
      const tsDate = d.timestamp?.toDate
        ? d.timestamp.toDate()
        : d.timestamp instanceof Date
        ? d.timestamp
        : typeof d.timestamp === 'number'
        ? new Date(d.timestamp)
        : null;

      return {
        id: d.id,
        user: u.email || u.displayName || d.userId,
        timestamp: tsDate ? tsDate.toLocaleString() : (d.timestamp || ''),
        timestampDate: tsDate,
        location: d.location || (u.location || 'Unknown'),
        ipAddress: d.ip || d.ipAddress || '—',
        device: d.device || '—',
        status: d.status || 'success',
        riskLevel: d.riskLevel || 'low',
        // normalize potential failure/reason fields so we can detect incorrect-password failures
        failureReason: d.failureReason || d.reason || d.errorCode || d.errorMessage || d.error || null,
        userRole: u.role || 'unknown',
      };
    });

    // Filter out super_admin role from login history display
    const filteredMapped = mapped.filter((entry: any) => entry.userRole !== 'super_admin');

    setLoginHistory(filteredMapped);

    // compute basic stats (using filtered data without super_admin)
    const total = filteredMapped.length;
    const today = new Date();
    const totalToday = filteredMapped.filter((m) => {
      try { return m.timestampDate && m.timestampDate.toDateString() === today.toDateString(); } catch { return false; }
    }).length;
    // Count failed attempts only when failure indicates an incorrect password
    const isIncorrectPasswordFailure = (m: any) => {
      if (!m || !m.failureReason) return false;
      const r = String(m.failureReason).toLowerCase();
      // common error codes / messages
      if (r.includes('wrong-password') || r.includes('auth/wrong-password') || r.includes('incorrect password') || r.includes('wrong password') || r.includes('invalid password')) return true;
      // generic heuristics: mention both 'password' and ('incorrect'|'wrong'|'invalid')
      if (r.includes('password') && (r.includes('incorrect') || r.includes('wrong') || r.includes('invalid') || r.includes('bad'))) return true;
      return false;
    };

    const failed = filteredMapped.filter(m => m.status === 'failed' && isIncorrectPasswordFailure(m)).length;
    const blocked = filteredMapped.filter(m => m.status === 'blocked').length;
    const success = total - failed - blocked;
    const successRate = total ? Math.round((success / total) * 1000) / 10 : 0;

    setStatsState([
      { title: 'Total Logins Today', value: String(totalToday), icon: Clock, change: '', changeType: 'increase' },
      { title: 'Failed Attempts', value: String(failed), icon: AlertTriangle, change: '', changeType: failed > 0 ? 'increase' : 'decrease' },
      { title: 'Blocked', value: String(blocked), icon: Shield, change: '', changeType: blocked > 0 ? 'increase' : 'decrease' },
      { title: 'Success Rate', value: `${successRate}%`, icon: CheckCircle, change: '', changeType: 'increase' }
    ]);
  };

  // realtime listener: audit_logs where action == 'LOGIN'
  useEffect(() => {
    // fetch a recent batch and filter client-side for anything login-related (includes failed attempts)
    const q = query(collection(firestore, 'audit_logs'), orderBy('timestamp', 'desc'), limit(500));
    const unsub = onSnapshot(q, async (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      await processDocs(docs);
    }, (e) => console.warn('audit_logs listener', e));

    return () => unsub();
  }, []);

  // manual refresh using a one-time getDocs
  const refreshNow = async () => {
    try {
      const q = query(collection(firestore, 'audit_logs'), orderBy('timestamp', 'desc'), limit(500));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      await processDocs(docs);
    } catch (e) {
      console.warn('refresh failed', e);
    }
  };

  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // derive filtered + paged data
  const filtered = loginHistory.filter((e) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q
      ? ((e.user || '').toLowerCase().includes(q) || (e.ipAddress || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q))
      : true;
    const matchesStatus = statusFilter === 'all' ? true : (e.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesRisk = riskFilter === 'all-risk' ? true : (e.riskLevel || '').toLowerCase() === riskFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const filteredCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = filteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(filteredCount, currentPage * pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
                  {stat.change ? (
                    <p className={`text-xs ${
                      stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </p>
                  ) : null}
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
                  <Input
                    className="pl-10"
                    placeholder="Search by email, location..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery((e.target as HTMLInputElement).value); setPage(1); }}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
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
                <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setPage(1); }}>
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

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setRiskFilter('all-risk'); setPage(1); }}>
                    Clear
                  </Button>
                  <Button variant="ghost" size="sm" onClick={refreshNow}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>

            {/* Login History Table */}
            <div className="rounded-md border">
              <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((entry, idx) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{startIndex + idx}</TableCell>
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
                {filteredCount === 0 ? (
                  <>No login attempts</>
                ) : (
                  <>Showing {startIndex}-{endIndex} of {filteredCount} login attempts</>
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(Math.max(1, page - 1))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages || filteredCount === 0} onClick={() => setPage(Math.min(totalPages, page + 1))}>
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