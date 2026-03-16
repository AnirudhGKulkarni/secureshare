import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { subscribeAdminChatMessages, sendAdminReplyMessage } from "@/features/superAdmin/services/superAdminChatService";
import { MessageSquare, Send, Search } from "lucide-react";
import { toast } from "sonner";
import type { SuperAdminChatMessage } from "@/features/superAdmin/services/superAdminChatService";
import { collection, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

type ClientMessage = {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: any;
  convoId: string;
  participants: string[];
  read?: boolean;
  timestampText?: string;
};

const AdminChat = () => {
  const { currentUser, profile } = useAuth();
  
  // Super Admin Messages State
  const [messages, setMessages] = useState<SuperAdminChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Client Chat State
  const [clientContacts, setClientContacts] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientMessages, setClientMessages] = useState<ClientMessage[]>([]);
  const [clientChatText, setClientChatText] = useState("");
  const [sendingClientMsg, setSendingClientMsg] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const clientMessagesEndRef = useRef<HTMLDivElement>(null);

  // Super Admin Messages Subscription
  useEffect(() => {
    if (!currentUser) return;

    setLoading(false);

    // Subscribe to messages from super admin to this admin
    const unsubscribe = subscribeAdminChatMessages(currentUser.uid, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load assigned clients for admin
  useEffect(() => {
    if (!currentUser || profile?.role !== "admin") return;

    // Get all clients assigned to this admin (where createdBy === currentUser.uid)
    const clientsQuery = query(
      collection(firestore, "users"),
      where("createdBy", "==", currentUser.uid),
      where("role", "==", "client")
    );
    const unsubClients = onSnapshot(clientsQuery, (snap) => {
      const clients = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
      setClientContacts(clients);
    }, (e) => console.warn("clients listen error", e));

    return () => unsubClients();
  }, [currentUser, profile?.role]);

  // Messages listener for selected client conversation
  useEffect(() => {
    if (!currentUser || !selectedClient) {
      setClientMessages([]);
      return;
    }

    const convoId = [currentUser.uid, selectedClient.uid].sort().join("_");
    const q = query(
      collection(firestore, "messages"),
      where("convoId", "==", convoId),
      where("participants", "array-contains", currentUser.uid),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const annotated = docs.map((m: any) => ({
        ...m,
        timestampText: m.timestamp && m.timestamp.toDate
          ? m.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
      }));
      setClientMessages(annotated);
    }, (e) => {
      console.warn("client messages listen error", e);
      toast.error("Unable to load messages");
    });

    return () => unsub();
  }, [currentUser, selectedClient]);

  // Auto scroll to bottom for Super Admin messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto scroll to bottom for Client messages
  useEffect(() => {
    clientMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [clientMessages]);

  // Mark client messages as read
  useEffect(() => {
    if (!currentUser || !selectedClient || !clientMessages.length) return;
    const unread = clientMessages.filter(
      (m) =>
        m.to === currentUser.uid &&
        m.from === selectedClient.uid &&
        m.read !== true &&
        m.id
    );
    unread.forEach((m) => {
      try {
        const ref = doc(firestore, "messages", m.id);
        updateDoc(ref, { read: true }).catch(() => {});
      } catch (e) {
        // ignore
      }
    });
  }, [clientMessages, selectedClient, currentUser]);

  const handleSendMessage = async () => {
    if (!text.trim() || !currentUser) return;

    const message = text.trim();
    setSending(true);

    try {
      const adminName = profile?.firstName || profile?.email || currentUser.email || "Admin";

      await sendAdminReplyMessage(currentUser.uid, adminName, message);

      setText("");
      toast.success("Message sent to Super Admin");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error?.message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSendClientMessage = async () => {
    if (!clientChatText.trim() || !currentUser || !selectedClient) return;

    const content = clientChatText.trim();
    const convoId = [currentUser.uid, selectedClient.uid].sort().join("_");

    setSendingClientMsg(true);
    try {
      const newRef = doc(collection(firestore, "messages"));
      await setDoc(newRef, {
        from: currentUser.uid,
        to: selectedClient.uid,
        content,
        timestamp: serverTimestamp(),
        participants: [currentUser.uid, selectedClient.uid],
        convoId,
      });
      setClientChatText("");
      toast.success("Message sent");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error?.message ?? "Failed to send message");
    } finally {
      setSendingClientMsg(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Super Admin Messages Section */}
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

        {/* Client Chat Section */}
        {profile?.role === "admin" && (
          <>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Client Messages</h2>
              <p className="text-muted-foreground mt-1">
                Chat with your assigned clients
              </p>
            </div>

            <Card className="flex flex-col h-[600px]">
              <div className="flex flex-1 overflow-hidden border-t">
                {/* Clients List */}
                <div className="w-64 border-r flex flex-col overflow-hidden">
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search clients"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    {clientContacts.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p>No assigned clients yet</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {clientContacts
                          .filter((c) =>
                            (c.displayName || c.email || "").toLowerCase().includes(clientSearch.toLowerCase())
                          )
                          .map((client) => (
                            <button
                              key={client.uid}
                              onClick={() => setSelectedClient(client)}
                              className={`w-full text-left p-3 transition-colors ${
                                selectedClient?.uid === client.uid
                                  ? "bg-accent"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <div className="font-medium text-sm">
                                {client.displayName || client.email}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {client.email}
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {selectedClient ? (
                    <>
                      <div className="p-4 border-b">
                        <div className="font-medium">
                          {selectedClient.displayName || selectedClient.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedClient.email}
                        </div>
                      </div>

                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {clientMessages.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                              <p>No messages yet. Start the conversation!</p>
                            </div>
                          ) : (
                            clientMessages.map((msg) => {
                              const isFromMe = msg.from === currentUser?.uid;
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                      isFromMe
                                        ? "bg-teal-600 text-white"
                                        : "bg-muted"
                                    }`}
                                  >
                                    <div className="text-sm whitespace-pre-wrap break-words">
                                      {msg.content}
                                    </div>
                                    <div
                                      className={`text-xs mt-1 ${
                                        isFromMe ? "text-teal-100" : "text-muted-foreground"
                                      }`}
                                    >
                                      {msg.timestampText}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          <div ref={clientMessagesEndRef} />
                        </div>
                      </ScrollArea>

                      <div className="p-4 border-t flex gap-2">
                        <Input
                          value={clientChatText}
                          onChange={(e) => setClientChatText(e.target.value)}
                          placeholder="Type a message…"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendClientMessage();
                            }
                          }}
                          disabled={sendingClientMsg}
                        />
                        <Button
                          onClick={handleSendClientMessage}
                          disabled={sendingClientMsg || !clientChatText.trim()}
                          size="sm"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-muted-foreground">
                        Select a client to start chatting
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminChat;
