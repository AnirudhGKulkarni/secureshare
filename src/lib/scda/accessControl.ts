/**
 * Access Control Service
 * Core logic for SCDA access control decisions
 */

import {
  AccessRequest,
  AccessControlResult,
  FileMetadata,
  UserRole,
  SessionIdentityToken,
  DataFingerprint,
} from './types';
import {
  getRoleLevel,
  canRoleAccessOtherRole,
  getRoleConstraints,
  hasPermission,
} from './roleHierarchy';
import {
  verifySecureTrustSignature,
  verifySessionIdentityToken,
  verifyDataFingerprint,
  recomputeSessionIdentityTokenHash,
} from './signatureGenerators';

interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  industryId?: string;
  organizationId?: string;
  status: 'active' | 'inactive' | 'suspended';
}

/**
 * Main access control decision logic
 */
export function evaluateAccessRequest(
  accessRequest: AccessRequest,
  fileMetadata: FileMetadata,
  userProfile: UserProfile,
  currentSIT: SessionIdentityToken
): AccessControlResult {
  const timestamp = Date.now();

  const logEntry = {
    timestamp,
    userId: accessRequest.userId,
    userEmail: accessRequest.userEmail,
    userRole: accessRequest.userRole,
    fileId: fileMetadata.fileId,
    fileName: fileMetadata.fileName,
    ipAddress: accessRequest.ipAddress,
    deviceId: accessRequest.deviceId,
    action: 'access_attempt' as const,
    reason: '',
  };

  // 1. Check if user is active (default to 'active' if status not set)
  const userStatus = userProfile.status || 'active';
  if (userStatus !== 'active') {
    return {
      granted: false,
      reason: `Access denied: User account is ${userStatus}`,
      logEntry: {
        ...logEntry,
        action: 'access_denied',
        reason: `User account is ${userStatus}`,
      },
    };
  }

  // 2. Check if file is active
  if (fileMetadata.status !== 'active') {
    return {
      granted: false,
      reason: `Access denied: File is ${fileMetadata.status}`,
      logEntry: {
        ...logEntry,
        action: 'access_denied',
        reason: `File is ${fileMetadata.status}`,
      },
    };
  }

  // 3. Check if file is expired
  if (fileMetadata.expiresAt) {
    // Handle both Firestore Timestamp objects and regular numbers
    let expiresAtMs = 0;
    if (typeof fileMetadata.expiresAt === 'object') {
      const tsObj = fileMetadata.expiresAt as any;
      if (typeof tsObj.toMillis === 'function') {
        expiresAtMs = tsObj.toMillis();
      } else {
        expiresAtMs = new Date(fileMetadata.expiresAt).getTime();
      }
    } else {
      expiresAtMs = new Date(fileMetadata.expiresAt).getTime();
    }
    
    if (Date.now() > expiresAtMs) {
      return {
        granted: false,
        reason: 'Access denied: File access has expired',
        logEntry: {
          ...logEntry,
          action: 'access_denied',
          reason: 'File access has expired',
        },
      };
    }
  }

  // 4. Verify session identity token
  if (!verifySessionIdentityToken(currentSIT)) {
    return {
      granted: false,
      reason: 'Access denied: Invalid or expired session token',
      logEntry: {
        ...logEntry,
        action: 'access_denied',
        reason: 'Invalid or expired session token',
      },
    };
  }

  // 5. Check role hierarchy and permissions
  // Default ownerRole to 'client' if not set (for backwards compatibility with older files)
  const effectiveOwnerRole = fileMetadata.ownerRole || 'client';
  const userRoleLevel = getRoleLevel(accessRequest.userRole || 'client');
  const ownerRoleLevel = getRoleLevel(effectiveOwnerRole);

  // SuperSuperAdmin can access everything
  if (accessRequest.userRole === 'super_super_admin') {
    return {
      granted: true,
      reason: 'Access granted: SuperSuperAdmin override',
      accessLevel: 'full',
      logEntry: {
        ...logEntry,
        action: 'access_granted',
        reason: 'SuperSuperAdmin override',
      },
    };
  }

  // Check if file is explicitly shared with the user (bypasses role hierarchy)
  // IMPORTANT: Shared files can be accessed by lower-role users if explicitly shared
  const isSharedWithUser = fileMetadata.sharedWith.some(
    (share) => share.userId === accessRequest.userId
  );
  const isFileOwner = accessRequest.userId === fileMetadata.ownerId;

  // If not shared with user and not the owner, enforce role hierarchy or reject
  if (!isSharedWithUser && !isFileOwner) {
    // For clients: MUST be explicitly shared
    if (accessRequest.userRole === 'client') {
      return {
        granted: false,
        reason: 'Access denied: File is not explicitly shared with you',
        logEntry: {
          ...logEntry,
          action: 'access_denied',
          reason: 'File not shared with user',
        },
      };
    }

    // For admins/super admins: Check role hierarchy
    if (!canRoleAccessOtherRole(accessRequest.userRole, effectiveOwnerRole)) {
      return {
        granted: false,
        reason: `Access denied: Insufficient role level (${accessRequest.userRole} cannot access ${effectiveOwnerRole} data)`,
        logEntry: {
          ...logEntry,
          action: 'access_denied',
          reason: `Insufficient role level for owner role ${effectiveOwnerRole}`,
        },
      };
    }
  }

  // If we get here and user is shared with or is owner, allow basic access
  if (isSharedWithUser || isFileOwner) {
    // File is explicitly shared or user is owner - grant access with read-only for clients
    const accessLevel = accessRequest.userRole === 'client' ? 'read-only' : 'full';

    return {
      granted: true,
      reason: isFileOwner 
        ? 'Access granted: You are the file owner'
        : 'Access granted: File is shared with you',
      accessLevel,
      logEntry: {
        ...logEntry,
        action: 'access_granted',
        reason: isFileOwner 
          ? 'File owner access'
          : 'File explicitly shared with user',
      },
    };
  }

  // Additional checks for other roles
  const constraints = getRoleConstraints(accessRequest.userRole);

  // SuperAdmin requires industry match
  if (accessRequest.userRole === 'super_admin' && constraints.requiresIndustryMatch) {
    if (userProfile.industryId !== fileMetadata.industryId) {
      return {
        granted: false,
        reason: 'Access denied: Industry mismatch',
        logEntry: {
          ...logEntry,
          action: 'access_denied',
          reason: 'Industry mismatch',
        },
      };
    }
  }

  // Admin requires organization match
  if (accessRequest.userRole === 'admin' && constraints.requiresOrganizationMatch) {
    if (userProfile.organizationId !== fileMetadata.ownerId) {
      return {
        granted: false,
        reason: 'Access denied: Organization mismatch',
        logEntry: {
          ...logEntry,
          action: 'access_denied',
          reason: 'Organization mismatch',
        },
      };
    }
  }

  // 7. Verify data integrity (DFP)
  if (!verifyDataFingerprint(fileMetadata.dataFingerprint)) {
    return {
      granted: false,
      reason: 'Access denied: File integrity check failed',
      logEntry: {
        ...logEntry,
        action: 'access_denied',
        reason: 'Data fingerprint verification failed',
      },
    };
  }

  // 8. Verify STS signature
  if (!verifySecureTrustSignature(fileMetadata.secureTrustSignature)) {
    return {
      granted: false,
      reason: 'Access denied: Trust signature verification failed',
      logEntry: {
        ...logEntry,
        action: 'access_denied',
        reason: 'Trust signature corrupted or invalid',
      },
    };
  }

  // 9. Determine access level
  let accessLevel: 'full' | 'read-only' | 'preview' = 'read-only';

  if (accessRequest.userId === fileMetadata.ownerId) {
    accessLevel = 'full';
  } else if (fileMetadata.sharedWith.some((s) => s.userId === accessRequest.userId)) {
    // Check shared access permissions
    const shareInfo = fileMetadata.sharedWith.find((s) => s.userId === accessRequest.userId);
    if (shareInfo) {
      // Shared with same role or lower = read-only
      // Shared with higher role = can be elevated by role
      if (getRoleLevel(accessRequest.userRole || 'client') <= getRoleLevel(shareInfo.role || 'client')) {
        accessLevel = 'read-only';
      } else {
        accessLevel = 'preview'; // Higher role gets preview only for shared files
      }
    }
  } else {
    accessLevel = 'preview'; // Default to preview for authorized access
  }

  // Grant access
  return {
    granted: true,
    reason: 'Access granted after context validation',
    accessLevel,
    logEntry: {
      ...logEntry,
      action: 'access_granted',
      reason: `Access granted - ${accessLevel} level`,
    },
  };
}

/**
 * Check if user can share file with another user
 */
export function canShareFile(
  sharerUserId: string,
  sharerRole: UserRole,
  fileMetadata: FileMetadata,
  targetUserId: string,
  targetRole: UserRole
): { allowed: boolean; reason: string } {
  // Only file owner can share
  if (sharerUserId !== fileMetadata.ownerId && sharerRole !== 'super_super_admin') {
    return {
      allowed: false,
      reason: 'Only file owner can share the file',
    };
  }

  // Cannot share with higher role
  const sharerLevel = getRoleLevel(sharerRole || 'client');
  const targetLevel = getRoleLevel(targetRole || 'client');

  if (targetLevel > sharerLevel) {
    return {
      allowed: false,
      reason: 'Cannot share file with higher privilege user',
    };
  }

  // Check if already shared
  if (fileMetadata.sharedWith.some((s) => s.userId === targetUserId)) {
    return {
      allowed: false,
      reason: 'File is already shared with this user',
    };
  }

  return {
    allowed: true,
    reason: 'File can be shared',
  };
}

/**
 * Check if user can revoke file access
 */
export function canRevokeAccess(
  revokingUserId: string,
  revokingRole: UserRole,
  fileMetadata: FileMetadata,
  targetUserId: string
): { allowed: boolean; reason: string } {
  // File owner can revoke
  if (revokingUserId === fileMetadata.ownerId) {
    return {
      allowed: true,
      reason: 'File owner can revoke access',
    };
  }

  // SuperSuperAdmin can revoke
  if (revokingRole === 'super_super_admin') {
    return {
      allowed: true,
      reason: 'SuperSuperAdmin can revoke access',
    };
  }

  return {
    allowed: false,
    reason: 'Only file owner or superadmin can revoke access',
  };
}

/**
 * Get effective access level for file
 */
export function getEffectiveAccessLevel(
  userId: string,
  userRole: UserRole,
  fileMetadata: FileMetadata
): 'full' | 'read-only' | 'preview' | 'none' {
  // Owner always has full access
  if (userId === fileMetadata.ownerId) {
    return 'full';
  }

  // SuperSuperAdmin always has full access
  if (userRole === 'super_super_admin') {
    return 'full';
  }

  // Check if shared
  const shareInfo = fileMetadata.sharedWith.find((s) => s.userId === userId);
  if (shareInfo) {
    return 'read-only';
  }

  return 'none';
}
