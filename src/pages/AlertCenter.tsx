import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle, 
  Shield, 
  Info, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter,
  Bell,
  X,
  Eye,
  Archive
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, addDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

// Alerts are loaded from Firestore and classified into: critical, neutral, basic

const AlertCenter = () => {
  const [selectedTab, setSelectedTab] = useState('all');

  const getAlertIcon = (type: string) => {
    const t = String(type || '').toLowerCase();
    if (t === 'critical') return <AlertTriangle className="h-4 w-4" />;
    if (t === 'neutral' || t === 'warning' || t === 'warn') return <Shield className="h-4 w-4" />;
    if (t === 'basic' || t === 'info' || t === 'notice') return <Info className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  const getAlertBadge = (type: string) => {
    const t = String(type || '').toLowerCase();
    if (t === 'critical') return <Badge variant="destructive">Critical</Badge>;
    if (t === 'neutral' || t === 'warning' || t === 'warn') return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Neutral</Badge>;
    if (t === 'basic' || t === 'info' || t === 'notice') return <Badge variant="outline" className="text-blue-600 border-blue-600">Basic</Badge>;
    return <Badge variant="outline">{type}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Active</Badge>;
      case 'investigating':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Investigating</Badge>;
      case 'acknowledged':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Acknowledged</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Resolved</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // runtime alerts state
  const [alertsState, setAlertsState] = useState<any[]>([]);
  const [statsState, setStatsState] = useState<any[]>([]);
  const [auditAlerts, setAuditAlerts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [showNotificationsConfig, setShowNotificationsConfig] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState(() => ({
    email: true,
    slack: false,
    inApp: true,
    severityThreshold: 'neutral',
  }));

  const classify = (a: any) => {
    // Normalize existing types to classification categories: critical, neutral, basic
    const t = String(a?.type || '').toLowerCase();
    if (t.includes('critical')) return 'critical';
    if (t.includes('warn') || t.includes('warning')) return 'neutral';
    if (t.includes('info') || t.includes('notice') || t === '') return 'basic';
    // fallback based on category or severity
    const c = String(a?.category || '').toLowerCase();
    if (c.includes('security') || c.includes('authentication')) return 'critical';
    return 'basic';
  };

  useEffect(() => {
    const q = query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const mapped = docs.map((d: any) => {
        const ts = d.timestamp?.toDate ? d.timestamp.toDate() : d.timestamp ? new Date(d.timestamp) : null;
        const classification = classify(d);
        return {
          ...d,
          timestamp: ts ? ts.toLocaleString() : (d.timestamp || ''),
          timestampDate: ts,
          classification,
        };
      });
      setAlertsState(mapped);
      // stats will be computed from combined alerts in separate effect
    }, (e) => console.warn('alerts listener', e));

    return () => unsub();
  }, []);

  // Listen to audit_logs for login, policy, sharing, plan events and map to alerts
  useEffect(() => {
    const q = query(collection(firestore, 'audit_logs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const mapped = docs
        .map((d: any) => {
          const action = String(d.action || d.type || '').toLowerCase();
          const ts = d.timestamp?.toDate ? d.timestamp.toDate() : d.timestamp ? new Date(d.timestamp) : null;
          let classification = 'basic';
          let title = d.action || d.type || 'Event';
          let description = d.message || d.details || d.reason || '';
          // classify
          if (action.includes('login')) {
            if ((d.status || '').toLowerCase() === 'failed') classification = 'critical';
            else classification = 'neutral';
            title = (d.status === 'failed' ? 'Failed login' : 'Login') + ` — ${d.userId || d.user || d.email || ''}`;
          } else if (action.includes('policy') || action.includes('policy_created') || action.includes('policy_shared')) {
            classification = 'basic';
            if (action.includes('create') || action.includes('created')) title = `Policy created — ${d.policyName || d.name || ''}`;
            else if (action.includes('share') || action.includes('shared')) title = `Policy shared — ${d.policyName || d.name || ''}`;
            else title = `Policy event — ${d.policyName || d.name || ''}`;
          } else if (action.includes('data_share') || action.includes('share') || action.includes('shared')) {
            classification = 'neutral';
            title = `Data shared — ${d.dataset || d.resource || ''}`;
          } else if (action.includes('plan') || action.includes('subscription')) {
            if (action.includes('expire') || action.includes('expired') || action.includes('overdue')) classification = 'critical';
            else classification = 'neutral';
            title = `Plan notice — ${d.userId || d.company || ''}`;
          } else if ((d.severity || '').toLowerCase() === 'critical') {
            classification = 'critical';
          }

          return {
            id: `audit_${d.id}`,
            title,
            description: description || JSON.stringify(d || {}),
            timestamp: ts ? ts.toLocaleString() : (d.timestamp || ''),
            timestampDate: ts,
            classification,
            status: d.status || 'active',
            source: 'audit_logs',
            raw: d,
          };
        })
        // only keep relevant events we can surface
        .filter((a: any) => {
          const t = String(a.title || '').toLowerCase();
          return (
            t.includes('login') || t.includes('policy') || t.includes('data') || t.includes('shared') || t.includes('plan') || (a.raw && a.raw.action)
          );
        });
      setAuditAlerts(mapped);
    }, (e) => console.warn('audit_logs listener', e));

    return () => unsub();
  }, []);

  // Combine alerts from explicit 'alerts' collection and mapped audit logs
  const combinedAlerts = useMemo(() => {
    // prefer firestore alerts first (they may have richer fields)
    const byId = new Map<string, any>();
    alertsState.forEach(a => byId.set(a.id, a));
    // add auditAlerts but avoid id collision
    auditAlerts.forEach(a => {
      if (!byId.has(a.id)) byId.set(a.id, a);
    });
    // return sorted by timestampDate desc if available
    const arr = Array.from(byId.values());
    arr.sort((x: any, y: any) => {
      const tx = x.timestampDate ? new Date(x.timestampDate).getTime() : 0;
      const ty = y.timestampDate ? new Date(y.timestampDate).getTime() : 0;
      return (ty - tx) || 0;
    });
    return arr;
  }, [alertsState, auditAlerts]);

  // recompute stats from combined alerts
  useEffect(() => {
    const mapped = combinedAlerts;
    const active = mapped.filter((m:any) => m.status === 'active').length;
    const critical = mapped.filter((m:any) => m.classification === 'critical').length;
    const neutral = mapped.filter((m:any) => m.classification === 'neutral').length;
    const basic = mapped.filter((m:any) => m.classification === 'basic').length;
    setStatsState([
      { title: 'Active Alerts', value: String(active), icon: AlertTriangle, color: 'text-red-600' },
      { title: 'Critical', value: String(critical), icon: Shield, color: 'text-red-700' },
      { title: 'Neutral', value: String(neutral), icon: Eye, color: 'text-yellow-600' },
      { title: 'Basic', value: String(basic), icon: Info, color: 'text-blue-600' },
    ]);
  }, [combinedAlerts]);

  // Reset page when filters/search change or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedTab, alertsState.length, pageSize]);

  const filteredAlerts = combinedAlerts.filter(alert => {
    // selectedTab can be a classification or 'active' status
    if (selectedTab === 'all') return true;
    if (selectedTab === 'active') return alert.status === 'active';
    if (selectedTab === 'critical') return alert.classification === 'critical';
    if (selectedTab === 'neutral') return alert.classification === 'neutral';
    if (selectedTab === 'basic') return alert.classification === 'basic';
    return true;
  });

  // apply search and status filter
  const searchedAlerts = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    return filteredAlerts.filter((a:any) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(a.title || '').toLowerCase().includes(q) ||
        String(a.description || '').toLowerCase().includes(q) ||
        String(a.category || '').toLowerCase().includes(q) ||
        String(a.affectedUser || '').toLowerCase().includes(q)
      );
    });
  }, [filteredAlerts, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(searchedAlerts.length / pageSize));
  const paginatedAlerts = searchedAlerts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Clamp current page if pageSize or total changes
  useEffect(() => {
    const tp = Math.max(1, Math.ceil(searchedAlerts.length / pageSize));
    setCurrentPage(p => Math.min(p, tp));
  }, [pageSize, searchedAlerts.length]);

  // Firestore actions
  const handleResolve = async (a: any) => {
    try {
      if (String(a.id || '').startsWith('audit_')) {
        alert('Cannot resolve audit log entries from this UI');
        return;
      }
      await updateDoc(doc(firestore, 'alerts', a.id), { status: 'resolved', resolvedAt: serverTimestamp() });
      setSelectedAlert(null);
    } catch (e) {
      console.error('resolve failed', e);
      alert('Failed to resolve alert');
    }
  };

  const handleDelete = async (a: any) => {
    if (!confirm('Delete this alert? This cannot be undone.')) return;
    try {
      if (String(a.id || '').startsWith('audit_')) {
        const rawId = String(a.id).replace(/^audit_/, '');
        await deleteDoc(doc(firestore, 'audit_logs', rawId));
      } else {
        await deleteDoc(doc(firestore, 'alerts', a.id));
      }
      setSelectedAlert(null);
    } catch (e) {
      console.error('delete failed', e);
      alert('Failed to delete alert');
    }
  };

  const handleArchiveResolved = async () => {
    if (!confirm('Archive all resolved alerts?')) return;
    const resolved = alertsState.filter(a => a.status === 'resolved');
    try {
      for (const r of resolved) {
        const copy = { ...r };
        delete copy.id;
        copy.archivedAt = serverTimestamp();
        await addDoc(collection(firestore, 'alerts_archive'), copy);
        await deleteDoc(doc(firestore, 'alerts', r.id));
      }
      alert(`Archived ${resolved.length} alert(s)`);
    } catch (e) {
      console.error('archive failed', e);
      alert('Failed to archive resolved alerts');
    }
  };

  const handleView = (a: any) => {
    setSelectedAlert(a);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-screen-xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8 overflow-x-hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alert Center</h2>
          <p className="text-muted-foreground mt-1">
            Monitor and manage security alerts and system notifications
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {statsState.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent className="p-2 sm:p-3">
                  <div className="text-xl sm:text-2xl font-semibold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Alert Management */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Security Alerts</CardTitle>
              {/* header actions removed per UX request */}
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                />
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded px-2 py-1 text-sm w-full md:w-auto"
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="investigating">Investigating</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                  <option value="pending">Pending</option>
                </select>
                <Button variant="outline" className="w-full md:w-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Filter</span>
                </Button>
              </div>
            </div>

            {/* Classification dropdown */}
            <div className="flex items-center justify-between flex-col md:flex-row gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={selectedTab} onValueChange={setSelectedTab}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Alerts</SelectItem>
                    <SelectItem value="active">Active (status)</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {paginatedAlerts.map((alert) => (
                <Card key={alert.id} className="hover:shadow-md transition-shadow w-full">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-1 ${alert.classification === 'critical' ? 'text-red-600' : alert.classification === 'neutral' ? 'text-yellow-600' : 'text-blue-600'}`}>
                          {getAlertIcon(alert.classification || alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 min-w-0">
                            <h3 className="font-semibold truncate text-base">{alert.title}</h3>
                            {getAlertBadge(alert.classification || alert.type)}
                            {getStatusBadge(alert.status)}
                          </div>
                          <p className="text-muted-foreground text-sm mb-1 break-all whitespace-pre-wrap max-h-28 overflow-auto text-sm">
                            {alert.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {alert.timestamp}
                            </div>
                            <span>Category: {alert.category}</span>
                            {alert.affectedUser && (<span>User: {alert.affectedUser}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleView(alert)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {alert.status === 'active' && (
                          <Button variant="outline" size="sm" onClick={() => handleResolve(alert)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => { if (alert.source === 'alerts') handleDelete(alert); else alert('Cannot delete audit log entry from UI'); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-3">
              <p className="text-sm text-muted-foreground">Showing {(paginatedAlerts || []).length} of {searchedAlerts.length} matching alerts</p>
              <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</Button>
                <div className="text-sm text-muted-foreground hidden sm:inline">Page {currentPage} / {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Modal */}
        {selectedAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedAlert.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {selectedAlert.status === 'active' && (
                      <Button size="sm" onClick={() => handleResolve(selectedAlert)}>Resolve</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleDelete(selectedAlert)}>Delete</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedAlert(null)}>Close</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{selectedAlert.description}</p>
                <div className="text-xs text-muted-foreground">
                  <div>Category: {selectedAlert.category}</div>
                  <div>Status: {selectedAlert.status}</div>
                  <div>Occurred: {selectedAlert.timestamp}</div>
                  {selectedAlert.affectedUser && <div>User: {selectedAlert.affectedUser}</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configure Notifications Dialog */}
        {showNotificationsConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="max-w-lg w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Notification Settings</CardTitle>
                  <div>
                    <Button size="sm" variant="ghost" onClick={() => setShowNotificationsConfig(false)}>Close</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-xs text-muted-foreground">Receive alerts via email</div>
                    </div>
                    <input type="checkbox" checked={notificationConfig.email} onChange={(e) => setNotificationConfig({...notificationConfig, email: e.target.checked})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Slack</div>
                      <div className="text-xs text-muted-foreground">Send alerts to Slack channel</div>
                    </div>
                    <input type="checkbox" checked={notificationConfig.slack} onChange={(e) => setNotificationConfig({...notificationConfig, slack: e.target.checked})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">In-app</div>
                      <div className="text-xs text-muted-foreground">Show notifications in the app</div>
                    </div>
                    <input type="checkbox" checked={notificationConfig.inApp} onChange={(e) => setNotificationConfig({...notificationConfig, inApp: e.target.checked})} />
                  </div>
                  <div>
                    <div className="font-medium">Severity threshold</div>
                    <select className="mt-2 border rounded px-2 py-1" value={notificationConfig.severityThreshold} onChange={(e) => setNotificationConfig({...notificationConfig, severityThreshold: e.target.value})}>
                      <option value="basic">Basic</option>
                      <option value="neutral">Neutral</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setNotificationConfig({ email: true, slack: false, inApp: true, severityThreshold: 'neutral' }); }}>Reset</Button>
                    <Button size="sm" onClick={async () => {
                      try {
                        localStorage.setItem('alert_notifications', JSON.stringify(notificationConfig));
                        // attempt to persist globally
                        await setDoc(doc(firestore, 'notification_settings', 'global'), { ...notificationConfig, updatedAt: serverTimestamp() }, { merge: true });
                        alert('Notification settings saved');
                        setShowNotificationsConfig(false);
                      } catch (e) {
                        console.warn('save notification settings failed', e);
                        alert('Saved locally (failed to persist to Firestore)');
                        setShowNotificationsConfig(false);
                      }
                    }}>Save</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AlertCenter;