import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoginHistorySection } from "@/features/superAdmin/sections/LoginHistorySection";

const SuperAdminLoginHistory = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Login History</h2>
          <p className="text-muted-foreground mt-1">Track and audit user login activities</p>
        </div>

        <LoginHistorySection />
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminLoginHistory;
