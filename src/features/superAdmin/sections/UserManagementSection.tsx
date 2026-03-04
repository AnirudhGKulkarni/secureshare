import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { toast } from "sonner";
import type { AppRole, UserProfile } from "../types";
import { isSuperAdminRole } from "../services/superAdminGuards";
import { writeAuditLog } from "../services/auditLogsService";

const roles: Array<Exclude<AppRole, "superadmin">> = ["client", "admin", "super_admin"];

export function UserManagementSection() {
  const { currentUser, profile } = useAuth();
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [search, setSearch] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const canAccess = isSuperAdminRole(profile?.role);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "users"), (snap) => {
      const list: UserProfile[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => String(a.email ?? "").localeCompare(String(b.email ?? "")));
      setUsers(list);
    });
    return () => unsub();
  }, []);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) => `${u.email ?? ""} ${u.firstName ?? ""} ${u.lastName ?? ""} ${u.id}`.toLowerCase().includes(needle));
  }, [users, search]);

  const updateUser = async (userId: string, patch: Record<string, unknown>, actionType: any, details: any) => {
    if (!canAccess) return;
    if (!currentUser) return;

    setBusyId(userId);
    try {
      await updateDoc(doc(firestore, "users", userId), patch);

      const performerName = profile?.firstName || profile?.email || currentUser.email || "Super Admin";
      await writeAuditLog({
        actionType,
        performedBy: currentUser.uid,
        performedByName: performerName,
        targetUser: userId,
        details,
      });

      toast.success("Updated.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
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
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Search users</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="email, name, uid…" />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Blocked</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => {
              const isBusy = busyId === u.id;
              const blocked = Boolean(u.blocked);
              const roleValue = (u.role === "superadmin" ? "super_admin" : u.role) ?? "client";

              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.email ?? u.id}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[420px]">{u.id}</div>
                  </TableCell>
                  <TableCell>
                    <select
                      className="rounded-md border bg-background px-2 py-1 text-sm"
                      value={roleValue}
                      disabled={isBusy}
                      onChange={(e) => {
                        const next = e.target.value;
                        updateUser(u.id, { role: next }, "USER_ROLE_CHANGED", { from: u.role ?? "client", to: next });
                      }}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>{u.status ?? "active"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={blocked}
                      onCheckedChange={(val) => {
                        updateUser(
                          u.id,
                          { blocked: val },
                          val ? "USER_BLOCKED" : "USER_UNBLOCKED",
                          { blocked: val },
                        );
                      }}
                      disabled={isBusy}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => {
                        // Best-effort "force reset" flag for your app to enforce.
                        // Strong enforcement requires Admin SDK.
                        updateUser(u.id, { forcePasswordReset: true }, "SECURITY_SETTINGS_CHANGED", { forcePasswordReset: true });
                      }}
                    >
                      Force Reset
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No users.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
