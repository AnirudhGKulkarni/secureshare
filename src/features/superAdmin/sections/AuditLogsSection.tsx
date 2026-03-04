import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { AuditActionType, AuditLogDoc } from "../types";
import { isSuperAdminRole } from "../services/superAdminGuards";

type Row = AuditLogDoc & { id: string };

const actionTypes: AuditActionType[] = [
  "USER_CREATED",
  "USER_ROLE_CHANGED",
  "USER_BLOCKED",
  "USER_UNBLOCKED",
  "FILE_UPLOADED",
  "FILE_DELETED",
  "SECURITY_SETTINGS_CHANGED",
  "ADMIN_CHAT_MESSAGE",
  "LOGIN",
];

function toMs(ts: any): number {
  if (!ts) return 0;
  if (ts?.seconds) return ts.seconds * 1000;
  if (ts?.toDate) return ts.toDate().getTime();
  const parsed = Date.parse(String(ts));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AuditLogsSection() {
  const { profile } = useAuth();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [typeFilter, setTypeFilter] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [search, setSearch] = React.useState("");

  const canAccess = isSuperAdminRole(profile?.role);

  React.useEffect(() => {
    const q = query(collection(firestore, "auditLogs"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Row[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setRows(list);
      },
      (err) => {
        console.warn("auditLogs snapshot error:", err);
        setRows([]);
      },
    );
    return () => unsub();
  }, []);

  const filtered = React.useMemo(() => {
    const startMs = startDate ? new Date(startDate + "T00:00:00").getTime() : 0;
    const endMs = endDate ? new Date(endDate + "T23:59:59").getTime() : Number.MAX_SAFE_INTEGER;
    const needle = search.trim().toLowerCase();

    return rows.filter((r) => {
      if (typeFilter && r.actionType !== typeFilter) return false;
      const ms = toMs(r.timestamp);
      if (ms < startMs || ms > endMs) return false;
      if (!needle) return true;

      const hay = `${r.performedBy} ${r.performedByName ?? ""} ${r.targetUser ?? ""} ${JSON.stringify(r.details ?? {})}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, typeFilter, startDate, endDate, search]);

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
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
        <CardTitle>Audit Log System</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Action type</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All</option>
              {actionTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Search by user/details</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="uid, name, details…" />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Target User</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString() : ""}</TableCell>
                <TableCell className="font-medium">{r.actionType}</TableCell>
                <TableCell>
                  <div className="font-medium">{r.performedByName ?? r.performedBy}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[320px]">{r.performedBy}</div>
                </TableCell>
                <TableCell className="truncate max-w-[320px]">{r.targetUser ?? ""}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[520px] truncate">
                  {r.details ? JSON.stringify(r.details) : ""}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No audit logs.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
