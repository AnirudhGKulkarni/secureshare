import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, MessageSquare, Users } from "lucide-react";
import { 
  subscribeSuperAdminChatMessages, 
  sendSuperAdminChatMessage,
  getAdminsList,
  SuperAdminChatMessage
} from "../services/superAdminChatService";
import { writeAuditLog } from "../services/auditLogsService";

export function SuperAdminChatSection() {
  const { currentUser, profile } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
  const [messages, setMessages] = useState<SuperAdminChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const isSuperAdmin = profile?.role === "super_admin";

  // Load admins list
  useEffect(() => {
    if (!isSuperAdmin || !currentUser) return;

    const loadAdmins = async () => {
      try {
        const adminsList = await getAdminsList();
        setAdmins(adminsList);
      } catch (error: any) {
        console.error("Error loading admins:", error);
        // Suppress permission error toasts - handled gracefully in service
        if (error?.code !== "permission-denied") {
          toast.error("Failed to load admins list");
        }
      } finally {
        setLoadingAdmins(false);
      }
    };

    loadAdmins();
  }, [currentUser, isSuperAdmin]);

  // Subscribe to messages when admin is selected
  useEffect(() => {
    if (!selectedAdmin || !currentUser || !isSuperAdmin) {
      setMessages([]);
      return;
    }

    // Clear previous subscription
    if (unsubRef.current) {
      unsubRef.current();
    }

    // Subscribe to new messages
    unsubRef.current = subscribeSuperAdminChatMessages(
      selectedAdmin.uid,
      currentUser.uid,
      (newMessages) => {
        setMessages(newMessages);
      }
    );

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
      }
    };
  }, [selectedAdmin, currentUser, isSuperAdmin]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !currentUser || !selectedAdmin || !isSuperAdmin) return;

    const message = text.trim();
    setBusy(true);

    try {
      const senderName = profile?.firstName || profile?.email || currentUser.email || "Super Admin";
      
      await sendSuperAdminChatMessage(
        selectedAdmin.uid,
        currentUser.uid,
        senderName,
        message
      );

      // Message sent successfully - clear input
      setText("");
      toast.success("Message sent");

      // Write audit log in background (non-blocking)
      writeAuditLog({
        actionType: "ADMIN_CHAT_MESSAGE",
        performedBy: currentUser.uid,
        performedByName: senderName,
        details: { 
          adminId: selectedAdmin.uid,
          adminName: selectedAdmin.firstName || selectedAdmin.email,
          length: message.length 
        },
      }).catch((err) => {
        // Silently fail audit logging - message was already sent
        console.warn("Audit log failed (non-blocking):", err);
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error?.message ?? "Failed to send message");
    } finally {
      setBusy(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Only super admins can access this section.
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredAdmins = admins.filter((admin) => {
    const name = admin.firstName || admin.email || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="grid grid-cols-3 gap-4 h-[600px]">
      {/* Admins List */}
      <Card className="col-span-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Admins
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden p-4 pt-0">
          <Input
            placeholder="Search admins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
          />
          <ScrollArea className="flex-1 border rounded">
            <div className="p-2 space-y-1">
              {loadingAdmins ? (
                <div className="text-xs text-muted-foreground p-2">Loading admins...</div>
              ) : filteredAdmins.length === 0 ? (
                <div className="text-xs text-muted-foreground p-2">No admins found</div>
              ) : (
                filteredAdmins.map((admin) => (
                  <button
                    key={admin.uid}
                    onClick={() => setSelectedAdmin(admin)}
                    className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                      selectedAdmin?.uid === admin.uid
                        ? "bg-teal-600 text-white"
                        : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="truncate font-medium">
                      {admin.firstName || admin.email || "Unknown"}
                    </div>
                    <div className="text-xs opacity-70 truncate">
                      {admin.email}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="col-span-2 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 border-b">
          {selectedAdmin ? (
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Chat with {selectedAdmin.firstName || selectedAdmin.email}
            </CardTitle>
          ) : (
            <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Select an admin to start chatting
            </CardTitle>
          )}
        </CardHeader>

        {selectedAdmin ? (
          <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden p-4">
            {/* Messages */}
            <ScrollArea className="flex-1 border rounded p-3">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isFromSuperAdmin = message.senderId === currentUser?.uid;
                    const timestamp = message.timestamp?.toDate
                      ? message.timestamp.toDate().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isFromSuperAdmin ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg border px-3 py-2 ${
                            isFromSuperAdmin
                              ? "bg-teal-600/20 border-teal-600/30"
                              : "bg-secondary/50 border-secondary"
                          }`}
                        >
                          <div className="text-xs text-muted-foreground flex items-center justify-between gap-2 mb-1">
                            <span className="truncate font-medium">
                              {message.senderName}
                            </span>
                            <span className="whitespace-nowrap text-xs">
                              {timestamp}
                            </span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap">
                            {message.message}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={busy}
              />
              <Button
                onClick={sendMessage}
                disabled={busy || !text.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select an admin from the list to start chatting</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
