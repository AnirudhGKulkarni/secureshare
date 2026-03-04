import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { LoginHistoryDoc } from "../types";

export async function writeLoginHistory(input: {
  userId: string;
  email: string;
  deviceInfo?: string;
  ipAddress?: string | null;
  location?: string | null;
}): Promise<void> {
  const docData: Omit<LoginHistoryDoc, "loginTime"> & { loginTime: any } = {
    userId: input.userId,
    email: input.email,
    deviceInfo: input.deviceInfo ?? "",
    ipAddress: input.ipAddress ?? null,
    location: input.location ?? null,
    loginTime: serverTimestamp(),
  };

  await addDoc(collection(firestore, "loginHistory"), docData);
}

export function subscribeLoginHistory(cb: (rows: Array<LoginHistoryDoc & { id: string }>) => void, max = 500): () => void {
  const q = query(collection(firestore, "loginHistory"), orderBy("loginTime", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.slice(0, max).map((d) => ({ id: d.id, ...(d.data() as any) }));
      cb(docs);
    },
    (err) => {
      console.warn("loginHistory snapshot error:", err);
      cb([]);
    },
  );
}
