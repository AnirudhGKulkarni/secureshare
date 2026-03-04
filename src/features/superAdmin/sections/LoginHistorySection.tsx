import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { subscribeLoginHistory } from "../services/loginHistoryService";
import { isSuperAdminRole } from "../services/superAdminGuards";
import type { LoginHistoryDoc } from "../types";

type Row = LoginHistoryDoc & { id: string };

function toMs(ts: any): number {
  if (!ts) return 0;
  if (ts?.seconds) return ts.seconds * 1000;
  if (ts?.toDate) return ts.toDate().getTime();
  const parsed = Date.parse(String(ts));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSuspicious(rows: Row[], row: Row): boolean {
  // Simple heuristics:
  // - If deviceInfo is new for this user in the visible window
  // - Or more than 5 logins for the user in last hour
  const userRows = rows.filter((r) => r.userId === row.userId);
  const rowDevice = (row.deviceInfo ?? "").trim();

  if (rowDevice) {
    const seenDevices = new Set<string>();
    for (const r of userRows) {
      const d = (r.deviceInfo ?? "").trim();
      if (d) seenDevices.add(d);
    }
    // If multiple devices exist and this device appears only once, flag it.
    const countSame = userRows.filter((r) => (r.deviceInfo ?? "").trim() === rowDevice).length;
    if (seenDevices.size >= 2 && countSame === 1) return true;
  }

  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = userRows.filter((r) => toMs(r.loginTime) >= hourAgo);
  if (recent.length >= 6) return true;

  return false;
}

export function LoginHistorySection() {
  const { profile } = useAuth();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [userFilter, setUserFilter] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const canAccess = isSuperAdminRole(profile?.role);

  React.useEffect(() => {
    const unsub = subscribeLoginHistory((r) => setRows(r));
    return () => unsub();
  }, []);

  const filtered = React.useMemo(() => {
    if (!userFilter && !startDate && !endDate) return rows;
    const startMs = startDate ? new Date(startDate + "T00:00:00").getTime() : 0;
    const endMs = endDate ? new Date(endDate + "T23:59:59").getTime() : Number.MAX_SAFE_INTEGER;

    return rows.filter((r) => {
      if (userFilter) {
        const needle = userFilter.toLowerCase();
        const hay = `${r.userId} ${r.email}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      const ms = toMs(r.loginTime);
      return ms >= startMs && ms <= endMs;
    });
  }, [rows, userFilter, startDate, endDate]);

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login History</CardTitle>
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
        <CardTitle>Login History Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Filter by user</Label>
            <Input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="uid or email" />
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Login Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Suspicious</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const ts = r.loginTime?.toDate ? r.loginTime.toDate().toLocaleString() : "";
              const suspicious = isSuspicious(rows, r);
              return (
                <TableRow key={r.id} data-state={suspicious ? "selected" : undefined}>
                  <TableCell>{ts}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.email}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[340px]">{r.userId}</div>
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate">{r.deviceInfo || ""}</TableCell>
                  <TableCell>{r.ipAddress ?? ""}</TableCell>
                  <TableCell>{r.location ?? ""}</TableCell>
                  <TableCell>{suspicious ? "Yes" : ""}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No login history.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
