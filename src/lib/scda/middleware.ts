/**
 * SCDA Middleware
 * Middleware for intercepting and validating file access requests
 */

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { AccessRequest, FileMetadata, UserRole, SCDAConfig } from './types';
import { evaluateAccessRequest, getEffectiveAccessLevel } from './accessControl';
import { logAccessEvent, hasExceededFailedAttempts } from './accessLogger';
import {
  generateSessionIdentityToken,
  recomputeSessionIdentityTokenHash,
} from './signatureGenerators';

// Default SCDA configuration
const DEFAULT_SCDA_CONFIG: SCDAConfig = {
  sessionTokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
  accessLogRetention: 90, // days
  enableDetailedLogging: true,
  requireDeviceVerification: true,
  maxAccessAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

let scadaConfig: SCDAConfig = DEFAULT_SCDA_CONFIG;

/**
 * Update SCDA configuration
 */
export function updateSCDAConfig(config: Partial<SCDAConfig>): void {
  scadaConfig = { ...scadaConfig, ...config };
}

/**
 * Get current SCDA configuration
 */
export function getSCDAConfig(): SCDAConfig {
  return scadaConfig;
}

/**
 * Middleware for file access requests
 * Call this before allowing file download or viewing
 */
export async function verifyFileAccessMiddleware(
  userId: string,
  fileId: string,
  sessionToken: string,
  deviceId: string,
  ipAddress: string
): Promise<{
  allowed: boolean;
  reason: string;
  accessLevel?: 'full' | 'read-only' | 'preview';
}> {
  try {
    // 1. Fetch user profile
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      return {
        allowed: false,
        reason: 'User not found',
      };
    }

    const userProfile = { ...userDoc.data(), status: userDoc.data()?.status || 'active' } as any;
    const userRole = (userProfile.role || 'client') as UserRole;

    // 2. Fetch file metadata
    const fileDoc = await getDoc(doc(firestore, 'sharedData', fileId));
    if (!fileDoc.exists()) {
      await logAccessEvent({
        timestamp: Date.now(),
        userId,
        userEmail: userProfile.email,
        userRole,
        fileId,
        fileName: 'Unknown',
        action: 'access_denied',
        reason: 'File not found',
        ipAddress,
        deviceId,
      });

      return {
        allowed: false,
        reason: 'File not found or access denied',
      };
    }

    const fileMetadata = { ...fileDoc.data(), fileId: fileDoc.id } as any as FileMetadata;

    // 3. Check for lockout due to excessive failed attempts
    const isLockedOut = await hasExceededFailedAttempts(
      userId,
      scadaConfig.maxAccessAttempts,
      scadaConfig.lockoutDuration / (60 * 1000)
    );

    if (isLockedOut) {
      await logAccessEvent({
        timestamp: Date.now(),
        userId,
        userEmail: userProfile.email,
        userRole,
        fileId,
        fileName: fileMetadata.fileName,
        action: 'access_denied',
        reason: 'Account locked due to excessive failed attempts',
        ipAddress,
        deviceId,
      });

      return {
        allowed: false,
        reason: 'Account temporarily locked due to failed access attempts. Please try again later.',
      };
    }

    // 4. Create or verify session token
    const currentSIT = generateSessionIdentityToken(
      userId,
      deviceId,
      undefined,
      scadaConfig.sessionTokenExpiry
    );

    // 5. Evaluate access using SCDA logic
    const accessRequest: AccessRequest = {
      userId,
      userEmail: userProfile.email,
      userRole,
      fileId,
      sessionToken,
      deviceId,
      ipAddress,
      timestamp: Date.now(),
    };

    const accessResult = evaluateAccessRequest(
      accessRequest,
      fileMetadata,
      userProfile,
      currentSIT
    );

    // 6. Log the access attempt or grant
    await logAccessEvent(accessResult.logEntry);

    // 7. Update file metadata with access timestamp
    if (accessResult.granted) {
      try {
        await updateDoc(doc(firestore, 'sharedData', fileId), {
          lastAccessedAt: new Date(),
          lastAccessedBy: userId,
        });
      } catch (error) {
        console.warn('Could not update file access timestamp:', error);
      }
    }

    return {
      allowed: accessResult.granted,
      reason: accessResult.reason,
      accessLevel: accessResult.accessLevel,
    };
  } catch (error) {
    console.error('Error in SCDA middleware:', error);
    return {
      allowed: false,
      reason: 'An error occurred while processing your access request',
    };
  }
}

/**
 * Get user's access level for a specific file
 */
export async function getUserFileAccessLevel(
  userId: string,
  fileId: string
): Promise<'full' | 'read-only' | 'preview' | 'none'> {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) return 'none';

    const fileDoc = await getDoc(doc(firestore, 'sharedData', fileId));
    if (!fileDoc.exists()) return 'none';

    const userRole = (userDoc.data() as any).role as UserRole;
    const fileMetadata = { ...fileDoc.data(), fileId: fileDoc.id } as any as FileMetadata;

    return getEffectiveAccessLevel(userId, userRole, fileMetadata);
  } catch (error) {
    console.error('Error getting user file access level:', error);
    return 'none';
  }
}

/**
 * Check if user can download a file
 */
export async function canUserDownloadFile(
  userId: string,
  fileId: string
): Promise<boolean> {
  const accessLevel = await getUserFileAccessLevel(userId, fileId);
  return accessLevel === 'full' || accessLevel === 'read-only';
}

/**
 * Check if user can share a file
 */
export async function canUserShareFile(
  userId: string,
  fileId: string
): Promise<boolean> {
  try {
    const fileDoc = await getDoc(doc(firestore, 'sharedData', fileId));
    if (!fileDoc.exists()) return false;

    const fileMetadata = { ...fileDoc.data(), fileId: fileDoc.id } as any as FileMetadata;

    // Only the owner can share
    return userId === fileMetadata.ownerId;
  } catch (error) {
    console.error('Error checking share permission:', error);
    return false;
  }
}

/**
 * Get all files accessible by a user
 */
export async function getUserAccessibleFiles(userId: string): Promise<
  Array<{
    fileId: string;
    fileName: string;
    accessLevel: 'full' | 'read-only' | 'preview';
    ownerId: string;
    ownerEmail: string;
  }>
> {
  try {
    // Get user's owned files
    const ownedQuery = query(
      collection(firestore, 'sharedData'),
      where('ownerId', '==', userId)
    );
    const ownedSnapshot = await getDocs(ownedQuery);

    // Get shared files
    const sharedQuery = query(
      collection(firestore, 'sharedData'),
      where('sharedWith', 'array-contains', { userId })
    );
    const sharedSnapshot = await getDocs(sharedQuery);

    const accessibleFiles = [];

    // Add owned files
    ownedSnapshot.docs.forEach((doc) => {
      const data = doc.data() as any;
      accessibleFiles.push({
        fileId: doc.id,
        fileName: data.fileName,
        accessLevel: 'full' as const,
        ownerId: data.ownerId,
        ownerEmail: data.ownerEmail,
      });
    });

    // Add shared files
    sharedSnapshot.docs.forEach((doc) => {
      const data = doc.data() as any;
      accessibleFiles.push({
        fileId: doc.id,
        fileName: data.fileName,
        accessLevel: 'read-only' as const,
        ownerId: data.ownerId,
        ownerEmail: data.ownerEmail,
      });
    });

    return accessibleFiles;
  } catch (error) {
    console.error('Error getting user accessible files:', error);
    return [];
  }
}

/**
 * Revoke user access to a file
 */
export async function revokeUserFileAccess(
  userId: string,
  fileId: string
): Promise<boolean> {
  try {
    const fileDoc = await getDoc(doc(firestore, 'sharedData', fileId));
    if (!fileDoc.exists()) return false;

    const fileMetadata = { ...fileDoc.data(), fileId: fileDoc.id } as any as FileMetadata;

    // Remove user from sharedWith list
    const updatedSharedWith = fileMetadata.sharedWith.filter(
      (share: any) => share.userId !== userId
    );

    await updateDoc(doc(firestore, 'sharedData', fileId), {
      sharedWith: updatedSharedWith,
    });

    return true;
  } catch (error) {
    console.error('Error revoking file access:', error);
    return false;
  }
}

/**
 * Initialize SCDA system (call on app startup)
 */
export async function initializeSCDA(): Promise<void> {
  try {
    // Load SCDA config from Firestore if available
    const configDoc = await getDoc(doc(firestore, 'system_config', 'scda'));
    if (configDoc.exists()) {
      const config = configDoc.data() as Partial<SCDAConfig>;
      updateSCDAConfig(config);
    }

    console.log('SCDA system initialized with config:', scadaConfig);
  } catch (error) {
    console.warn('Could not load SCDA config, using defaults:', error);
  }
}
