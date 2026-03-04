import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { SecuritySettingsDoc } from "../types";
import { subscribeSecuritySettings, upsertSecuritySettings } from "../services/securitySettingsService";
import { writeAuditLog } from "../services/auditLogsService";
import { isSuperAdminRole } from "../services/superAdminGuards";

const defaults: Omit<SecuritySettingsDoc, "updatedAt" | "updatedBy"> = {
  registrationEnabled: true,
  maintenanceMode: false,
  loginAttemptLimit: 10,
};

export function SecuritySettingsSection() {
  const { currentUser, profile } = useAuth();
  const [settings, setSettings] = React.useState<SecuritySettingsDoc | null>(null);
  const [registrationEnabled, setRegistrationEnabled] = React.useState(defaults.registrationEnabled);
  const [maintenanceMode, setMaintenanceMode] = React.useState(defaults.maintenanceMode);
  const [loginAttemptLimit, setLoginAttemptLimit] = React.useState(String(defaults.loginAttemptLimit));
  const [busy, setBusy] = React.useState(false);

  const canAccess = isSuperAdminRole(profile?.role);

  React.useEffect(() => {
    const unsub = subscribeSecuritySettings((s) => {
      setSettings(s);
      setRegistrationEnabled(s?.registrationEnabled ?? defaults.registrationEnabled);
      setMaintenanceMode(s?.maintenanceMode ?? defaults.maintenanceMode);
      setLoginAttemptLimit(String(s?.loginAttemptLimit ?? defaults.loginAttemptLimit));
    });
    return () => unsub();
  }, []);

  const save = async () => {
    if (!canAccess) return;
    if (!currentUser) return;

    const limit = Number(loginAttemptLimit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      toast.error("Login attempt limit must be between 1 and 100.");
      return;
    }

    setBusy(true);
    try {
      await upsertSecuritySettings({
        registrationEnabled,
        maintenanceMode,
        loginAttemptLimit: limit,
        updatedBy: currentUser.uid,
      });

      const performerName = profile?.firstName || profile?.email || currentUser.email || "Super Admin";
      await writeAuditLog({
        actionType: "SECURITY_SETTINGS_CHANGED",
        performedBy: currentUser.uid,
        performedByName: performerName,
        details: { registrationEnabled, maintenanceMode, loginAttemptLimit: limit },
      });

      toast.success("Security settings updated.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Access denied.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <div className="font-medium">Enable user registration</div>
              <div className="text-sm text-muted-foreground">Turn off to prevent new signups.</div>
            </div>
            <Switch checked={registrationEnabled} onCheckedChange={setRegistrationEnabled} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <div className="font-medium">Maintenance mode</div>
              <div className="text-sm text-muted-foreground">Show a maintenance banner/app lock for non-superadmins.</div>
            </div>
            <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
          </div>

          <div className="rounded-md border p-4">
            <Label>Login attempt limit</Label>
            <div className="text-sm text-muted-foreground">Client-side throttle (best-effort). For strong enforcement, use Cloud Functions.</div>
            <Input className="mt-2" value={loginAttemptLimit} onChange={(e) => setLoginAttemptLimit(e.target.value)} inputMode="numeric" />
          </div>

          <div className="rounded-md border p-4">
            <div className="font-medium">Last updated</div>
            <div className="text-sm text-muted-foreground">
              {settings?.updatedAt?.toDate ? settings.updatedAt.toDate().toLocaleString() : ""}
            </div>
            <div className="text-sm text-muted-foreground">By: {settings?.updatedBy ?? ""}</div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
