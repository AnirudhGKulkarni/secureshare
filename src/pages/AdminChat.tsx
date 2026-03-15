import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { subscribeAdminChatMessages, sendAdminReplyMessage } from "@/features/superAdmin/services/superAdminChatService";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import type { SuperAdminChatMessage } from "@/features/superAdmin/services/superAdminChatService";

const AdminChat = () => {
  const { currentUser, profile } = useAuth();
  const [messages, setMessages] = useState<SuperAdminChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(false);

    // Subscribe to messages from super admin to this admin
    const unsubscribe = subscribeAdminChatMessages(currentUser.uid, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!text.trim() || !currentUser) return;

    const message = text.trim();
    setSending(true);

    try {
      const adminName = profile?.firstName || profile?.email || currentUser.email || "Admin";
      
      await sendAdminReplyMessage(
        currentUser.uid,
        adminName,
        message
      );

      setText("");
      toast.success("Message sent to Super Admin");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error?.message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Super Admin Messages</h2>
          <p className="text-muted-foreground mt-1">Direct messages from the Super Admin</p>
        </div>

        <Card className="flex flex-col h-[600px]">
          <CardHeader className="border-b pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation with Super Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 border rounded p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground h-full flex items-center justify-center">
                        <div>
                          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>No messages yet</p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isFromMe = message.senderId === currentUser?.uid;
                        const timestamp = message.timestamp?.toDate
                          ? message.timestamp.toDate().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "";

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg border px-4 py-2 ${
                                isFromMe
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
                              <div className="text-sm whitespace-pre-wrap break-words">
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

                <div className="flex gap-2">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your reply…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !text.trim()}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminChat;
