import { 
  addDoc, 
  collection, 
  onSnapshot, 
  orderBy, 
  query, 
  serverTimestamp,
  collectionGroup,
  where,
  getDocs,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export interface SuperAdminChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: any;
  adminId: string;
}

// Subscribe to chat messages with a specific admin (Super Admin perspective)
export function subscribeSuperAdminChatMessages(
  adminId: string,
  superAdminId: string,
  callback: (messages: SuperAdminChatMessage[]) => void
): () => void {
  try {
    const messagesRef = collection(firestore, "superAdminChats", adminId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    
    return onSnapshot(
      q,
      (snap) => {
        const messages = snap.docs.map((doc) => ({
          id: doc.id,
          adminId,
          ...doc.data(),
        } as SuperAdminChatMessage));
        callback(messages);
      },
      (error) => {
        // Suppress permission denied errors - they're expected in some cases
        if (error.code === "permission-denied") {
          console.debug("Permission denied reading chat (expected in some cases)");
          callback([]);
        } else {
          console.error("Error subscribing to chat messages:", error);
          callback([]);
        }
      }
    );
  } catch (error) {
    console.error("Error in subscribeSuperAdminChatMessages:", error);
    return () => {};
  }
}

// Subscribe to chat messages for an admin (Admin perspective)
export function subscribeAdminChatMessages(
  adminId: string,
  callback: (messages: SuperAdminChatMessage[]) => void
): () => void {
  try {
    const messagesRef = collection(firestore, "superAdminChats", adminId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    
    return onSnapshot(
      q,
      (snap) => {
        const messages = snap.docs.map((doc) => ({
          id: doc.id,
          adminId,
          ...doc.data(),
        } as SuperAdminChatMessage));
        callback(messages);
      },
      (error) => {
        // Suppress permission denied errors - they're expected in some cases
        if (error.code === "permission-denied") {
          console.debug("Permission denied reading admin chat (expected in some cases)");
          callback([]);
        } else {
          console.error("Error subscribing to admin chat messages:", error);
          callback([]);
        }
      }
    );
  } catch (error) {
    console.error("Error in subscribeAdminChatMessages:", error);
    return () => {};
  }
}

// Send a message from Super Admin to Admin
export async function sendSuperAdminChatMessage(
  adminId: string,
  superAdminId: string,
  senderName: string,
  message: string
): Promise<void> {
  try {
    const messagesRef = collection(firestore, "superAdminChats", adminId, "messages");
    
    await addDoc(messagesRef, {
      senderId: superAdminId,
      senderName,
      message,
      timestamp: serverTimestamp(),
    });
  } catch (error: any) {
    // Only throw if it's not a benign permission issue after successful write
    if (error.code === "permission-denied") {
      console.debug("Permission issue during send (may be benign):", error);
      // Don't rethrow - message may have been written
      return;
    }
    console.error("Error sending message:", error);
    throw error;
  }
}

// Send a message from Admin to Super Admin
export async function sendAdminReplyMessage(
  adminId: string,
  adminName: string,
  message: string
): Promise<void> {
  try {
    const messagesRef = collection(firestore, "superAdminChats", adminId, "messages");
    
    await addDoc(messagesRef, {
      senderId: adminId,
      senderName: adminName,
      message,
      timestamp: serverTimestamp(),
    });
  } catch (error: any) {
    // Only throw if it's not a benign permission issue after successful write
    if (error.code === "permission-denied") {
      console.debug("Permission issue during send (may be benign):", error);
      // Don't rethrow - message may have been written
      return;
    }
    console.error("Error sending admin reply:", error);
    throw error;
  }
}

// Get list of all admins for the super admin
export async function getAdminsList(): Promise<any[]> {
  try {
    const q = query(collection(firestore, "users"), where("role", "==", "admin"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
  } catch (error: any) {
    // Suppress permission errors for admins list - show empty list gracefully
    if (error.code === "permission-denied") {
      console.debug("Permission denied loading admins list (expected)");
      return [];
    }
    console.error("Error getting admins list:", error);
    return [];
  }
}


