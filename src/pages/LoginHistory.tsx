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

const loginHistory = [
  {
    id: 1,
    user: 'admin@company.com',
    timestamp: '2024-01-15 10:30:45',
    location: 'New York, USA',
    ipAddress: '192.168.1.10',
    device: 'Chrome on Windows 11',
    status: 'success',
    riskLevel: 'low'
  },
  {
    id: 2,
    user: 'alice.johnson@company.com',
    timestamp: '2024-01-15 09:15:22',
    location: 'London, UK',
    ipAddress: '203.0.113.45',
    device: 'Safari on macOS',
    status: 'success',
    riskLevel: 'medium'
  },
  {
    id: 3,
    user: 'bob.smith@company.com',
    timestamp: '2024-01-15 08:45:10',
    location: 'Unknown',
    ipAddress: '198.51.100.22',
    device: 'Firefox on Linux',
    status: 'failed',
    riskLevel: 'high'
  },
  {
    id: 4,
    user: 'carol.davis@company.com',
    timestamp: '2024-01-15 07:20:33',
    location: 'Sydney, Australia',
    ipAddress: '192.168.1.15',
    device: 'Chrome on Android',
    status: 'success',
    riskLevel: 'low'
  },
  {
    id: 5,
    user: 'admin@company.com',
    timestamp: '2024-01-14 18:30:12',
    location: 'New York, USA',
    ipAddress: '192.168.1.10',
    device: 'Chrome on Windows 11',
    status: 'success',
    riskLevel: 'low'
  },
  {
    id: 6,
    user: 'david.wilson@company.com',
    timestamp: '2024-01-14 16:45:55',
    location: 'Tokyo, Japan',
    ipAddress: '203.0.113.78',
    device: 'Edge on Windows 10',
    status: 'blocked',
    riskLevel: 'high'
  }
];

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

const LoginHistory = () => {
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
          {stats.map((stat, index) => {
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Device</TableHead>
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
                      <TableCell className="font-mono text-sm">{entry.ipAddress}</TableCell>
                      <TableCell>{entry.device}</TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>{getRiskBadge(entry.riskLevel)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing 1-6 of 156 login attempts
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
      </div>
    </DashboardLayout>
  );
};

export default LoginHistory;