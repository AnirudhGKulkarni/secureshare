import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UserManagementSection } from "@/features/superAdmin/sections/UserManagementSection";

const SuperAdminUserManagement = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground mt-1">Manage and monitor platform users</p>
        </div>

        <UserManagementSection />
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminUserManagement;
