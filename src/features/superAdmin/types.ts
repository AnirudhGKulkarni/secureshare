import type { Timestamp } from "firebase/firestore";

export type AppRole = "client" | "admin" | "super_admin" | "superadmin";

export type UserStatus = "pending" | "active" | "rejected";

export type UserProfile = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string | null;
  role?: AppRole;
  status?: UserStatus;
  approved?: boolean;
  blocked?: boolean;
  adminRequestSubmitted?: boolean;
  createdAt?: Timestamp | string | null;
};

export type SharedDataDoc = {
  fileName: string;
  uploadedBy: string;
  uploadedByName?: string;
  sharedWith: string[];
  createdAt: Timestamp;
  fileURL: string;
  storagePath: string;
  size?: number;
  contentType?: string;
};

export type AdminChatMessageDoc = {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Timestamp;
};

export type LoginHistoryDoc = {
  userId: string;
  email: string;
  loginTime: Timestamp;
  deviceInfo?: string;
  ipAddress?: string | null;
  location?: string | null;
};

export type SecuritySettingsDoc = {
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  loginAttemptLimit: number;
  forcePasswordResetForAll?: boolean;
  updatedAt: Timestamp;
  updatedBy: string;
};

export type AuditActionType =
  | "USER_CREATED"
  | "USER_ROLE_CHANGED"
  | "USER_BLOCKED"
  | "USER_UNBLOCKED"
  | "FILE_UPLOADED"
  | "FILE_DELETED"
  | "SECURITY_SETTINGS_CHANGED"
  | "ADMIN_CHAT_MESSAGE"
  | "LOGIN";

export type AuditLogDoc = {
  actionType: AuditActionType;
  performedBy: string;
  performedByName?: string;
  targetUser?: string | null;
  timestamp: Timestamp;
  details?: Record<string, unknown>;
};
