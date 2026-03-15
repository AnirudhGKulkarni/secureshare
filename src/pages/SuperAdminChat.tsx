import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SuperAdminChatSection } from "@/features/superAdmin/sections/SuperAdminChatSection";

const SuperAdminChat = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Chat</h2>
          <p className="text-muted-foreground mt-1">Direct messaging with platform admins</p>
        </div>

        <SuperAdminChatSection />
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminChat;
