import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// avatar removed by user request
import { Users, Shield, AlertTriangle, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useEffect, useState } from 'react';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, collectionGroup } from 'firebase/firestore';

const chartData = [
  { name: 'Jan', before: 85, after: 12 },
  { name: 'Feb', before: 92, after: 15 },
  { name: 'Mar', before: 78, after: 10 },
  { name: 'Apr', before: 88, after: 13 },
  { name: 'May', before: 95, after: 8 },
  { name: 'Jun', before: 82, after: 11 },
];

const threatPieData = [
  { name: 'Phishing', value: 35, color: '#dc2626' },
  { name: 'Malware', value: 25, color: '#ea580c' },
  { name: 'Ransomware', value: 20, color: '#d97706' },
  { name: 'Data Breach', value: 15, color: '#0a9db0' },
  { name: 'Other', value: 5, color: '#113738' },
];

const threatTrendData = [
  { month: 'Jul', threats: 45 },
  { month: 'Aug', threats: 52 },
  { month: 'Sep', threats: 38 },
  { month: 'Oct', threats: 61 },
  { month: 'Nov', threats: 42 },
  { month: 'Dec', threats: 35 },
];

const riskItems = [
  { id: 1, description: 'Unencrypted file shared externally', severity: 'High', status: 'Open', time: '10 mins ago' },
  { id: 2, description: 'Multiple failed login attempts', severity: 'Medium', status: 'Investigating', time: '1 hour ago' },
  { id: 3, description: 'Suspicious download activity', severity: 'Low', status: 'Resolved', time: '2 hours ago' },
  { id: 4, description: 'Policy violation detected', severity: 'High', status: 'Open', time: '4 hours ago' },
];

const Dashboard = () => {
  const [stats, setStats] = useState([
    { name: 'Total Users', value: '0', icon: Users, change: '+0%', trend: 'up' },
    { name: 'Active Policies', value: '0', icon: Shield, change: '+0%', trend: 'up' },
    { name: 'Security Alerts', value: '0', icon: AlertTriangle, change: '+0%', trend: 'down' },
    { name: 'Data Shared', value: '0 B', icon: TrendingUp, change: '+0%', trend: 'up' },
  ]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Get total users count - active users with admin or client role
        const usersSnapshot = await getDocs(
          query(collection(firestore, 'users'), where('status', '==', 'active'), where('role', 'in', ['admin', 'client']))
        );
        const totalUsers = usersSnapshot.size;

        // Get active policies from localStorage (Policies are stored locally, not in Firestore)
        const policiesData = localStorage.getItem('policies_v1');
        let activePolicies = 0;
        if (policiesData) {
          try {
            const policies = JSON.parse(policiesData);
            activePolicies = Array.isArray(policies) ? policies.filter((p: any) => p.status === 'Active').length : 0;
          } catch (e) {
            activePolicies = 0;
          }
        }

        // Get security alerts count
        const alertsSnapshot = await getDocs(
          query(collection(firestore, 'alerts'), where('resolved', '==', false))
        );
        const securityAlerts = alertsSnapshot.size;

        // Get total data shared (from shared_data collection)
        let totalDataShared = 0;
        const sharesSnapshot = await getDocs(collection(firestore, 'shared_data'));
        sharesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.fileSize) {
            totalDataShared += data.fileSize;
          }
        });

        // Format data shared
        const formatBytes = (bytes: number) => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + sizes[i];
        };

        // Get recent users
        const recentUsersSnapshot = await getDocs(
          query(collection(firestore, 'users'), where('status', '==', 'active'), where('role', 'in', ['admin', 'client']))
        );
        const users = recentUsersSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.displayName || data.firstName || data.username || 'Unknown',
              email: data.email,
              lastActive: 'Recently',
              avatar: (data.displayName || data.firstName || data.username || data.email || '').charAt(0).toUpperCase(),
              status: 'online',
            };
          })
          .slice(0, 5);

        setRecentUsers(users);

        setStats([
          { name: 'Total Users', value: totalUsers.toString(), icon: Users, change: '+0%', trend: 'up' },
          { name: 'Active Policies', value: activePolicies.toString(), icon: Shield, change: '+0%', trend: 'up' },
          { name: 'Security Alerts', value: securityAlerts.toString(), icon: AlertTriangle, change: '+0%', trend: 'down' },
          { name: 'Data Shared', value: formatBytes(totalDataShared), icon: TrendingUp, change: '+0%', trend: 'up' },
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Overview of your data sharing platform
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, idx) => (
                <Card key={stat.name} className="overflow-hidden transition-all hover:shadow-lg border-0" style={{
                  background: `linear-gradient(135deg, ${['#113738', '#0d5a5f', '#0a7c87', '#0a9db0'][idx]} 0%, ${['#0d5a5f', '#0a7c87', '#0a9db0', '#1a9fb5'][idx]} 100%)`
                }}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-white/80">
                      {stat.name}
                    </CardTitle>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <p className="text-xs mt-1 font-bold text-red-500">
                      LIVE
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Data Exposure Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Comparison of sensitive data fields exposed before and after implementing policies
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
                    <Bar dataKey="before" fill="#dc2626" name="Before Policies" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="after" fill="#0a9db0" name="After Policies" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Users List */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recent Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentUsers.map((user, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-semibold">{user.avatar}</div>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                            user.status === 'online' ? 'bg-green-500' : 
                            user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                          }`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {user.lastActive}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Threats Pie Chart */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Threat Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={threatPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                    {threatPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {threatPieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                    <span className="truncate">{item.name}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Table */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Risk Monitor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {riskItems.map((risk) => (
                  <div key={risk.id} className="p-3 rounded-lg border bg-card hover:bg-secondary/50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium truncate">{risk.description}</p>
                      <Badge variant={
                        risk.severity === 'High' ? 'destructive' : 
                        risk.severity === 'Medium' ? 'default' : 'secondary'
                      } className="text-xs">
                        {risk.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {risk.status === 'Open' && <XCircle className="h-3 w-3 text-red-500" />}
                        {risk.status === 'Investigating' && <AlertCircle className="h-3 w-3 text-yellow-500" />}
                        {risk.status === 'Resolved' && <CheckCircle className="h-3 w-3 text-green-500" />}
                        {risk.status}
                      </div>
                      <span>{risk.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Threats Trend Line Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Threat Trends (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={threatTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-sm" />
                <YAxis className="text-sm" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="threats" 
                  stroke="#0a9db0" 
                  strokeWidth={3}
                  dot={{ r: 6, fill: "#0a9db0" }}
                  activeDot={{ r: 8, fill: "#0a9db0" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
