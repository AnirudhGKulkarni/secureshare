import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Shield, AlertTriangle, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const stats = [
  { name: 'Total Users', value: '248', icon: Users, change: '+12%', trend: 'up' },
  { name: 'Active Policies', value: '42', icon: Shield, change: '+8%', trend: 'up' },
  { name: 'Security Alerts', value: '3', icon: AlertTriangle, change: '-25%', trend: 'down' },
  { name: 'Data Shared', value: '1.2TB', icon: TrendingUp, change: '+18%', trend: 'up' },
];

const chartData = [
  { name: 'Jan', before: 85, after: 12 },
  { name: 'Feb', before: 92, after: 15 },
  { name: 'Mar', before: 78, after: 10 },
  { name: 'Apr', before: 88, after: 13 },
  { name: 'May', before: 95, after: 8 },
  { name: 'Jun', before: 82, after: 11 },
];

const threatPieData = [
  { name: 'Phishing', value: 35, color: '#ef4444' },
  { name: 'Malware', value: 25, color: '#f97316' },
  { name: 'Ransomware', value: 20, color: '#eab308' },
  { name: 'Data Breach', value: 15, color: '#06b6d4' },
  { name: 'Other', value: 5, color: '#8b5cf6' },
];

const threatTrendData = [
  { month: 'Jul', threats: 45 },
  { month: 'Aug', threats: 52 },
  { month: 'Sep', threats: 38 },
  { month: 'Oct', threats: 61 },
  { month: 'Nov', threats: 42 },
  { month: 'Dec', threats: 35 },
];

const recentUsers = [
  { name: 'Alice Johnson', email: 'alice@company.com', lastActive: '2 mins ago', avatar: 'AJ', status: 'online' },
  { name: 'Bob Smith', email: 'bob@company.com', lastActive: '15 mins ago', avatar: 'BS', status: 'online' },
  { name: 'Carol Davis', email: 'carol@company.com', lastActive: '1 hour ago', avatar: 'CD', status: 'away' },
  { name: 'David Wilson', email: 'david@company.com', lastActive: '3 hours ago', avatar: 'DW', status: 'offline' },
  { name: 'Eva Martinez', email: 'eva@company.com', lastActive: '1 day ago', avatar: 'EM', status: 'offline' },
];

const riskItems = [
  { id: 1, description: 'Unencrypted file shared externally', severity: 'High', status: 'Open', time: '10 mins ago' },
  { id: 2, description: 'Multiple failed login attempts', severity: 'Medium', status: 'Investigating', time: '1 hour ago' },
  { id: 3, description: 'Suspicious download activity', severity: 'Low', status: 'Resolved', time: '2 hours ago' },
  { id: 4, description: 'Policy violation detected', severity: 'High', status: 'Open', time: '4 hours ago' },
];

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Overview of your data sharing platform
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name} className="overflow-hidden transition-all hover:shadow-lg">
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
                <p className={`text-xs mt-1 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change} from last month
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
                <Bar dataKey="before" fill="hsl(var(--destructive))" name="Before Policies" radius={[8, 8, 0, 0]} />
                <Bar dataKey="after" fill="hsl(var(--primary))" name="After Policies" radius={[8, 8, 0, 0]} />
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
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">{user.avatar}</AvatarFallback>
                      </Avatar>
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
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={3}
                  dot={{ r: 6, fill: "hsl(var(--destructive))" }}
                  activeDot={{ r: 8, fill: "hsl(var(--destructive))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
