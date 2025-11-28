// src/layouts/ClientLayout.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User, ArrowLeft } from "lucide-react";

type Props = {
  title?: string;
  children: React.ReactNode;
};

const ClientLayout: React.FC<Props> = ({ title = "Client", children }) => {
  const navigate = useNavigate();
  const { currentUser, profile, logout } = useAuth();

  const displayName =
    profile?.firstName
      ? `${profile.firstName}${profile?.lastName ? ` ${profile.lastName}` : ""}`
      : currentUser?.displayName ?? currentUser?.email?.split?.("@")?.[0] ?? "Client";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="text-lg font-semibold">SecureShare</div>
              <div className="text-sm text-muted-foreground">{title}</div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/client/settings")}>
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Settings
                </span>
              </Button>

              <Button variant="ghost" onClick={() => navigate("/client/profile")}>
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" /> {displayName}
                </span>
              </Button>

              <Button
                variant="destructive"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-nav / back control */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/client")}>
              <span className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to client dashboard
              </span>
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
};

export default ClientLayout;
