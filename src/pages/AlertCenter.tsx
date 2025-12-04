import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const alerts = [
  {
    id: 1,
    type: 'critical',
    title: 'Multiple failed login attempts detected',
    description: 'User alice.johnson@company.com has 5 failed login attempts from IP 203.0.113.45',
    timestamp: '2024-01-15 11:30:45',
    status: 'active',
    category: 'authentication',
    affectedUser: 'alice.johnson@company.com'
  },
  {
    id: 2,
    type: 'warning',
    title: 'Suspicious file download activity',
    description: 'Large number of files downloaded by user bob.smith@company.com in short timeframe',
    timestamp: '2024-01-15 10:15:22',
    status: 'investigating',
    category: 'data-access',
    affectedUser: 'bob.smith@company.com'
  },
  {
    id: 3,
    type: 'info',
    title: 'System maintenance scheduled',
    description: 'Scheduled maintenance window for database optimization on January 20th, 2024',
    timestamp: '2024-01-15 09:00:00',
    status: 'acknowledged',
    category: 'system',
    affectedUser: null
  },
  {
    id: 4,
    type: 'critical',
    title: 'Unauthorized access attempt',
    description: 'Login attempt from unrecognized device for admin account',
    timestamp: '2024-01-15 08:45:33',
    status: 'resolved',
    category: 'security',
    affectedUser: 'admin@company.com'
  },
  {
    id: 5,
    type: 'warning',
    title: 'Password policy violation',
    description: 'User carol.davis@company.com using weak password that expires soon',
    timestamp: '2024-01-15 07:20:10',
    status: 'active',
    category: 'policy',
    affectedUser: 'carol.davis@company.com'
  },
  {
    id: 6,
    type: 'info',
    title: 'New security update available',
    description: 'Security patch v2.1.3 is available for deployment',
    timestamp: '2024-01-14 18:30:00',
    status: 'pending',
    category: 'update',
    affectedUser: null
  }
];

const stats = [
  {
    title: 'Active Alerts',
    value: '12',
    icon: AlertTriangle,
    color: 'text-red-600'
  },
  {
    title: 'Under Investigation',
    value: '5',
    icon: Eye,
    color: 'text-yellow-600'
  },
  {
    title: 'Resolved Today',
    value: '8',
    icon: CheckCircle,
    color: 'text-green-600'
  },
  {
    title: 'Critical Alerts',
    value: '3',
    icon: Shield,
    color: 'text-red-700'
  }
];

const AlertCenter = () => {
  const [selectedTab, setSelectedTab] = useState('all');

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <Shield className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Warning</Badge>;
      case 'info':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Info</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
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

  const filteredAlerts = alerts.filter(alert => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'critical') return alert.type === 'critical';
    if (selectedTab === 'active') return alert.status === 'active';
    if (selectedTab === 'resolved') return alert.status === 'resolved';
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alert Center</h2>
          <p className="text-muted-foreground mt-1">
            Monitor and manage security alerts and system notifications
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Archive className="h-4 w-4 mr-2" />
                  Archive All Resolved
                </Button>
                <Button size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  Configure Notifications
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" placeholder="Search alerts..." />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Alert Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Alerts</TabsTrigger>
                <TabsTrigger value="critical">Critical</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab} className="mt-6">
                <div className="space-y-4">
                  {filteredAlerts.map((alert) => (
                    <Card key={alert.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`mt-1 ${
                              alert.type === 'critical' ? 'text-red-600' :
                              alert.type === 'warning' ? 'text-yellow-600' :
                              'text-blue-600'
                            }`}>
                              {getAlertIcon(alert.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{alert.title}</h3>
                                {getAlertBadge(alert.type)}
                                {getStatusBadge(alert.status)}
                              </div>
                              <p className="text-muted-foreground text-sm mb-2">
                                {alert.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {alert.timestamp}
                                </div>
                                <span>Category: {alert.category}</span>
                                {alert.affectedUser && (
                                  <span>User: {alert.affectedUser}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {alert.status === 'active' && (
                              <Button variant="outline" size="sm">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Resolve
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredAlerts.length} of {alerts.length} alerts
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AlertCenter;