/**
 * Secure Contextual Data Authorization (SCDA) System
 * Type definitions and interfaces
 */

export type UserRole = 'super_super_admin' | 'super_admin' | 'admin' | 'client';

export interface RoleHierarchy {
  role: UserRole;
  level: number;
  permissions: string[];
  inherits: UserRole[];
}

export interface DataFingerprint {
  fileSize: number;
  fileType: string;
  ownerId: string;
  uploadTimestamp: number;
  nonce: string;
  hash: string;
}

export interface SessionIdentityToken {
  userId: string;
  loginTime: number;
  deviceId: string;
  hash: string;
  expiresAt: number;
}

export interface SecureTrustSignature {
  roleLevel: number;
  industryId: string;
  ownerId: string;
  dataFingerprint: string;
  sessionToken: string;
  signature: string;
  createdAt: number;
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  ownerId: string;
  ownerRole: UserRole;
  industryId: string;
  uploadTimestamp: number;
  dataFingerprint: DataFingerprint;
  secureTrustSignature: SecureTrustSignature;
  sharedWith: Array<{
    userId: string;
    email: string;
    role: UserRole;
    grantedAt: number;
  }>;
  accessLog: AccessLogEntry[];
  status: 'active' | 'revoked' | 'expired';
  expiresAt?: number;
}

export interface AccessRequest {
  userId: string;
  userEmail: string;
  userRole: UserRole;
  fileId: string;
  sessionToken: string;
  deviceId: string;
  ipAddress: string;
  timestamp: number;
}

export interface AccessLogEntry {
  timestamp: number;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  fileId: string;
  fileName: string;
  action: 'access_attempt' | 'access_granted' | 'access_denied';
  reason?: string;
  ipAddress: string;
  deviceId: string;
}

export interface AccessControlResult {
  granted: boolean;
  reason: string;
  accessLevel?: 'full' | 'read-only' | 'preview';
  expiresAt?: number;
  logEntry: AccessLogEntry;
}

export interface SCDAConfig {
  sessionTokenExpiry: number; // milliseconds
  accessLogRetention: number; // days
  enableDetailedLogging: boolean;
  requireDeviceVerification: boolean;
  maxAccessAttempts: number;
  lockoutDuration: number; // milliseconds
}
