import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download, User, Shield, Activity, Calendar, Eye } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'admin' | 'client' | 'super_admin';
  action: string;
  resource: string;
  details: string;
  ipAddress?: string;
  timestamp: any;
  status: 'success' | 'failure' | 'warning';
}

const EnhancedAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, roleFilter, actionFilter, statusFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch from audit_logs collection
      const q = query(
        collection(firestore, 'audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(q);
      const logsData: AuditLog[] = [];
      
      querySnapshot.forEach((doc) => {
        logsData.push({
          id: doc.id,
          ...doc.data(),
        } as AuditLog);
      });

      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
      
      // Mock data for demonstration
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          userId: 'user1',
          userEmail: 'john.admin@techcorp.com',
          userName: 'John Admin',
          userRole: 'admin',
          action: 'LOGIN',
          resource: 'Authentication',
          details: 'Successful login from dashboard',
          ipAddress: '192.168.1.100',
          timestamp: { seconds: Date.now() / 1000 },
          status: 'success',
        },
        {
          id: '2',
          userId: 'user2',
          userEmail: 'jane.client@example.com',
          userName: 'Jane Client',
          userRole: 'client',
          action: 'FILE_ACCESS',
          resource: 'Document: contract.pdf',
          details: 'Downloaded file from shared folder',
          ipAddress: '192.168.1.101',
          timestamp: { seconds: Date.now() / 1000 - 3600 },
          status: 'success',
        },
        {
          id: '3',
          userId: 'user3',
          userEmail: 'mike.admin@datasys.com',
          userName: 'Mike Admin',
          userRole: 'admin',
          action: 'POLICY_UPDATE',
          resource: 'Policy #12',
          details: 'Updated data sharing policy',
          ipAddress: '192.168.1.102',
          timestamp: { seconds: Date.now() / 1000 - 7200 },
          status: 'success',
        },
        {
          id: '4',
          userId: 'user4',
          userEmail: 'sarah.client@company.com',
          userName: 'Sarah Client',
          userRole: 'client',
          action: 'LOGIN_FAILED',
          resource: 'Authentication',
          details: 'Failed login attempt - incorrect password',
          ipAddress: '192.168.1.103',
          timestamp: { seconds: Date.now() / 1000 - 10800 },
          status: 'failure',
        },
        {
          id: '5',
          userId: 'super1',
          userEmail: 'superadmin@trustnshare.com',
          userName: 'Super Admin',
          userRole: 'super_admin',
          action: 'ADMIN_APPROVAL',
          resource: 'Admin Request',
          details: 'Approved admin registration for John Doe',
          ipAddress: '192.168.1.1',
          timestamp: { seconds: Date.now() / 1000 - 14400 },
          status: 'success',
        },
        {
          id: '6',
          userId: 'user5',
          userEmail: 'bob.admin@securenet.com',
          userName: 'Bob Admin',
          userRole: 'admin',
          action: 'USER_CREATE',
          resource: 'User Management',
          details: 'Created new client user account',
          ipAddress: '192.168.1.104',
          timestamp: { seconds: Date.now() / 1000 - 18000 },
          status: 'success',
        },
        {
          id: '7',
          userId: 'user6',
          userEmail: 'alice.client@example.com',
          userName: 'Alice Client',
          userRole: 'client',
          action: 'FILE_UPLOAD',
          resource: 'Document: report.xlsx',
          details: 'Uploaded file to shared workspace',
          ipAddress: '192.168.1.105',
          timestamp: { seconds: Date.now() / 1000 - 21600 },
          status: 'success',
        },
        {
          id: '8',
          userId: 'user7',
          userEmail: 'charlie.admin@company.com',
          userName: 'Charlie Admin',
          userRole: 'admin',
          action: 'SETTINGS_UPDATE',
          resource: 'System Settings',
          details: 'Updated notification preferences',
          ipAddress: '192.168.1.106',
          timestamp: { seconds: Date.now() / 1000 - 25200 },
          status: 'success',
        },
      ];
      setLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.userEmail.toLowerCase().includes(term) ||
          log.userName.toLowerCase().includes(term) ||
          log.action.toLowerCase().includes(term) ||
          log.resource.toLowerCase().includes(term) ||
          log.details.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((log) => log.userRole === roleFilter);
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    setFilteredLogs(filtered);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'admin': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'client': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700 border-green-300';
      case 'failure': return 'bg-red-100 text-red-700 border-red-300';
      case 'warning': return 'bg-orange-100 text-orange-700 border-orange-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) return User;
    if (action.includes('POLICY') || action.includes('SETTINGS')) return Shield;
    return Activity;
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Email', 'Role', 'Action', 'Resource', 'Details', 'Status', 'IP Address'];
    const rows = filteredLogs.map((log) => [
      formatDate(log.timestamp),
      log.userName,
      log.userEmail,
      log.userRole,
      log.action,
      log.resource,
      log.details,
      log.status,
      log.ipAddress || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Audit logs exported successfully');
  };

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
            <p className="text-muted-foreground mt-1">
              Monitor all system activities from admins and clients
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Activity Log ({filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Loading audit logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No logs found matching the filters</div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  const ActionIcon = getActionIcon(log.action);
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                        <ActionIcon className="h-5 w-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium">{log.userName}</span>
                          <Badge className={getRoleColor(log.userRole)}>
                            {log.userRole.replace('_', ' ')}
                          </Badge>
                          <Badge className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-1">{log.userEmail}</p>

                        <div className="flex items-center gap-4 text-sm mb-2">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{log.resource}</span>
                        </div>

                        <p className="text-sm text-muted-foreground">{log.details}</p>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.timestamp)}
                          </span>
                          {log.ipAddress && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EnhancedAuditLogs;
