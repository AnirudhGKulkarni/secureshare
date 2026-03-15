import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OverviewSection } from "@/features/superAdmin/sections/OverviewSection";

const SuperAdminDashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
          <p className="text-muted-foreground mt-1">Platform administration, security, and monitoring</p>
        </div>

        <OverviewSection />
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
