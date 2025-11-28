import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { user: 'John Doe', action: 'Shared customer data', time: '2 hours ago' },
                  { user: 'Jane Smith', action: 'Updated policy #12', time: '5 hours ago' },
                  { user: 'Mike Johnson', action: 'Added new user', time: '1 day ago' },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.user}</p>
                      <p className="text-xs text-muted-foreground">{activity.action}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {[
                  { title: 'Create New Policy', desc: 'Define data sharing rules', icon: Shield },
                  { title: 'Add User', desc: 'Invite team member', icon: Users },
                  { title: 'Share Data', desc: 'Securely share files', icon: TrendingUp },
                ].map((action, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-secondary to-accent hover:shadow-md transition-all text-left"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <action.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
