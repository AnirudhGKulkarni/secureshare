import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { AuditActionType, AuditLogDoc } from "../types";

export async function writeAuditLog(input: {
  actionType: AuditActionType;
  performedBy: string;
  performedByName?: string;
  targetUser?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  const doc: Omit<AuditLogDoc, "timestamp"> & { timestamp: any } = {
    actionType: input.actionType,
    performedBy: input.performedBy,
    performedByName: input.performedByName,
    targetUser: input.targetUser ?? null,
    timestamp: serverTimestamp(),
    details: input.details ?? {},
  };

  await addDoc(collection(firestore, "auditLogs"), doc);
}
