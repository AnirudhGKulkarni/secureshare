// src/pages/ClientSettings.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ClientSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Client Settings</CardTitle>
          <CardDescription>Manage settings specific to client users.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Account</div>
              <div className="mt-2">Signed in as: <strong>{currentUser?.email}</strong></div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Preferences</div>
              <div className="mt-2 text-sm">No client-specific preferences yet.</div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={() => toast("No actions available yet")}>Manage subscription</Button>
              <Button variant="outline" onClick={() => navigate("/client/profile")}>Edit profile</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientSettings;
