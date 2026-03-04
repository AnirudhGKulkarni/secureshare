import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { AdminChatMessageDoc } from "../types";

export function subscribeAdminChatMessages(cb: (messages: Array<AdminChatMessageDoc & { id: string }>) => void): () => void {
  const q = query(collection(firestore, "adminChats"), orderBy("timestamp", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      cb(list);
    },
    (err) => {
      console.warn("adminChats snapshot error:", err);
      cb([]);
    },
  );
}

export async function sendAdminChatMessage(input: { senderId: string; senderName: string; message: string }): Promise<void> {
  const doc: Omit<AdminChatMessageDoc, "timestamp"> & { timestamp: any } = {
    senderId: input.senderId,
    senderName: input.senderName,
    message: input.message,
    timestamp: serverTimestamp(),
  };

  await addDoc(collection(firestore, "adminChats"), doc);
}
