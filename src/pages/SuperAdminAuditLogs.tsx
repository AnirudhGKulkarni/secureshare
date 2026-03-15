import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AuditLogsSection } from "@/features/superAdmin/sections/AuditLogsSection";

const SuperAdminAuditLogs = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
          <p className="text-muted-foreground mt-1">System and security audit trail</p>
        </div>

        <AuditLogsSection />
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminAuditLogs;
