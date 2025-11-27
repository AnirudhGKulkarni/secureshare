// src/pages/ClientDashboard.tsx
import React from "react";
import { useAuth } from "@/contexts/AuthContext";

const ClientDashboard: React.FC = () => {
  const { currentUser, profile } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Client Dashboard</h1>
      <p className="mt-2">Welcome, {profile?.firstName ?? currentUser?.displayName ?? "User"}</p>
      <p className="text-sm text-muted-foreground">Domain: {profile?.domain ?? "—"}</p>

      {/* TODO: add client-specific UI */}
      <div className="mt-6">
        <div className="p-4 rounded-xl border">
          <p className="text-sm">This is a client-specific area. Add widgets / content here.</p>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
