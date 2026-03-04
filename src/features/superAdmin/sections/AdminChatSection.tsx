import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { subscribeAdminChatMessages, sendAdminChatMessage } from "../services/adminChatService";
import { writeAuditLog } from "../services/auditLogsService";
import { isSuperAdminRole } from "../services/superAdminGuards";

export function AdminChatSection() {
  const { currentUser, profile } = useAuth();
  const [messages, setMessages] = React.useState<any[]>([]);
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const canAccess = isSuperAdminRole(profile?.role);

  React.useEffect(() => {
    const unsub = subscribeAdminChatMessages(setMessages);
    return () => unsub();
  }, []);

  const send = async () => {
    if (!canAccess) return;
    if (!currentUser) return;
    const msg = text.trim();
    if (!msg) return;

    setBusy(true);
    try {
      const senderName = profile?.firstName || profile?.email || currentUser.email || "Super Admin";
      await sendAdminChatMessage({ senderId: currentUser.uid, senderName, message: msg });
      await writeAuditLog({
        actionType: "ADMIN_CHAT_MESSAGE",
        performedBy: currentUser.uid,
        performedByName: senderName,
        details: { length: msg.length },
      });
      setText("");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to send message");
    } finally {
      setBusy(false);
    }
  };

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Chat</CardTitle>
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
        <CardTitle>Internal Admin Chat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-[420px] rounded-md border p-3">
          <div className="space-y-3">
            {messages.map((m) => {
              const isMe = m.senderId === currentUser?.uid;
              const ts = m.timestamp?.toDate ? m.timestamp.toDate().toLocaleString() : "";
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg border px-3 py-2 ${isMe ? "bg-muted" : "bg-background"}`}>
                    <div className="text-xs text-muted-foreground flex items-center justify-between gap-2">
                      <span className="truncate">{m.senderName}</span>
                      <span className="whitespace-nowrap">{ts}</span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap mt-1">{m.message}</div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && <div className="text-sm text-muted-foreground">No messages yet.</div>}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            disabled={busy}
          />
          <Button onClick={send} disabled={busy}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
