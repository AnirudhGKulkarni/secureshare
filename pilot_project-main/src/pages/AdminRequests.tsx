import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";

const AdminRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const { currentUser, profile } = useAuth();
  const functions = getFunctions();

  useEffect(() => {
    // subscribe to pending admin requests
    const q = query(collection(firestore, "adminRequests"), where("status", "==", "pending"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleApprove = async (req: any) => {
    if (!profile) return toast.error("Profile not loaded");
    try {
      const approve = httpsCallable(functions, "approveAdmin");
      await approve({ uid: req.uid, requestId: req.id });
      toast.success("Approved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to approve");
    }
  };

  const handleDeny = async (req: any) => {
    try {
      const deny = httpsCallable(functions, "denyAdmin");
      await deny({ requestId: req.id });
      toast.success("Denied");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to deny");
    }
  };

  if (!currentUser) return <div className="p-6">Please sign in as a super-admin to review requests.</div>;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 && <div>No pending admin requests.</div>}
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.id} className="flex items-start justify-between rounded-md border p-4">
                <div>
                  <div className="font-medium">{r.name} — {r.email}</div>
                  <div className="text-sm text-muted-foreground">Company: {r.company ?? "—"} | Domain: {r.domain}</div>
                  <div className="mt-2">Reason: {r.reason ?? "—"}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleApprove(r)}>Approve</Button>
                  <Button variant="ghost" onClick={() => handleDeny(r)}>Deny</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRequests;
