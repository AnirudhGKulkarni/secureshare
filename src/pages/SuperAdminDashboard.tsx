import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewSection } from "@/features/superAdmin/sections/OverviewSection";
import { UserManagementSection } from "@/features/superAdmin/sections/UserManagementSection";
import { SharedDataSection } from "@/features/superAdmin/sections/SharedDataSection";
import { AdminChatSection } from "@/features/superAdmin/sections/AdminChatSection";
import { LoginHistorySection } from "@/features/superAdmin/sections/LoginHistorySection";
import { SecuritySettingsSection } from "@/features/superAdmin/sections/SecuritySettingsSection";
import { AuditLogsSection } from "@/features/superAdmin/sections/AuditLogsSection";

const SuperAdminDashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
          <p className="text-muted-foreground mt-1">Platform administration, security, and monitoring</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="shared">Shared Data</TabsTrigger>
            <TabsTrigger value="chat">Admin Chat</TabsTrigger>
            <TabsTrigger value="logins">Login History</TabsTrigger>
            <TabsTrigger value="security">Security Settings</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewSection />
          </TabsContent>
          <TabsContent value="users">
            <UserManagementSection />
          </TabsContent>
          <TabsContent value="shared">
            <SharedDataSection />
          </TabsContent>
          <TabsContent value="chat">
            <AdminChatSection />
          </TabsContent>
          <TabsContent value="logins">
            <LoginHistorySection />
          </TabsContent>
          <TabsContent value="security">
            <SecuritySettingsSection />
          </TabsContent>
          <TabsContent value="audit">
            <AuditLogsSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
