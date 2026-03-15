import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SharedDataSection } from "@/features/superAdmin/sections/SharedDataSection";

const SuperAdminSharedData = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Shared Data</h2>
          <p className="text-muted-foreground mt-1">Monitor and manage shared data</p>
        </div>

        <SharedDataSection />
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminSharedData;
