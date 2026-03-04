import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { SharedDataDoc, UserProfile } from "../types";
import { deleteSharedFile, uploadAndShareFile } from "../services/sharedDataService";
import { writeAuditLog } from "../services/auditLogsService";
import { isSuperAdminRole } from "../services/superAdminGuards";

type SharedRow = SharedDataDoc & { id: string };

export function SharedDataSection() {
  const { currentUser, profile } = useAuth();
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [rows, setRows] = React.useState<SharedRow[]>([]);
  const [file, setFile] = React.useState<File | null>(null);
  const [sharedWith, setSharedWith] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  const canAccess = isSuperAdminRole(profile?.role);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "users"), (snap) => {
      const list: UserProfile[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => String(a.email ?? "").localeCompare(String(b.email ?? "")));
      setUsers(list);
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "sharedData"), (snap) => {
      const list: SharedRow[] = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a, b) => {
          const at = (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : 0;
          const bt = (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : 0;
          return bt - at;
        });
      setRows(list);
    });
    return () => unsub();
  }, []);

  const toggleSharedWith = (uid: string) => {
    setSharedWith((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  };

  const upload = async () => {
    if (!canAccess) return;
    if (!currentUser) return;
    if (!file) {
      toast.error("Please choose a file.");
      return;
    }
    if (sharedWith.length === 0) {
      toast.error("Please select at least one user/admin to share with.");
      return;
    }

    setBusy(true);
    try {
      const uploaderName = profile?.firstName || profile?.email || currentUser.email || "Super Admin";
      const id = await uploadAndShareFile({
        file,
        uploadedBy: currentUser.uid,
        uploadedByName: uploaderName,
        sharedWith,
      });

      await writeAuditLog({
        actionType: "FILE_UPLOADED",
        performedBy: currentUser.uid,
        performedByName: uploaderName,
        targetUser: null,
        details: { sharedDataId: id, fileName: file.name, sharedWithCount: sharedWith.length },
      });

      toast.success("File uploaded and shared.");
      setFile(null);
      setSharedWith([]);
      const input = document.getElementById("shared-data-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: SharedRow) => {
    if (!canAccess) return;
    if (!currentUser) return;
    setBusy(true);
    try {
      await deleteSharedFile({ id: row.id, storagePath: row.storagePath });

      const performerName = profile?.firstName || profile?.email || currentUser.email || "Super Admin";
      await writeAuditLog({
        actionType: "FILE_DELETED",
        performedBy: currentUser.uid,
        performedByName: performerName,
        targetUser: null,
        details: { sharedDataId: row.id, fileName: row.fileName },
      });

      toast.success("Deleted.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shared Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Access denied.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Sharing Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shared-data-file">Upload file</Label>
              <Input
                id="shared-data-file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={busy}
              />
            </div>

            <div className="space-y-2">
              <Label>Share with (users/admins)</Label>
              <div className="max-h-44 overflow-auto rounded-md border p-2 space-y-1">
                {users
                  .filter((u) => u.id !== currentUser?.uid)
                  .map((u) => {
                    const checked = sharedWith.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSharedWith(u.id)}
                          disabled={busy}
                        />
                        <span className="truncate">{u.email ?? u.id}</span>
                        <span className="text-muted-foreground">({u.role ?? "client"})</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={upload} disabled={busy}>
              {busy ? "Working…" : "Upload & Share"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shared Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Shared With</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.fileName}</TableCell>
                  <TableCell>{r.uploadedByName ?? r.uploadedBy}</TableCell>
                  <TableCell>{Array.isArray(r.sharedWith) ? r.sharedWith.length : 0}</TableCell>
                  <TableCell>
                    {(r.createdAt as any)?.toDate ? (r.createdAt as any).toDate().toLocaleString() : ""}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <a
                      className="inline-flex"
                      href={r.fileURL}
                      target="_blank"
                      rel="noreferrer"
                      download
                    >
                      <Button variant="outline" size="sm">Download</Button>
                    </a>
                    <Button variant="destructive" size="sm" onClick={() => remove(r)} disabled={busy}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No shared files yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
