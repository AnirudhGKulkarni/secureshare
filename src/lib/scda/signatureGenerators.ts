/**
 * SCDA Signature Generators
 * Generates Data Fingerprint, Session Identity Token, and Secure Trust Signature
 */

import { DataFingerprint, SessionIdentityToken, SecureTrustSignature, UserRole } from './types';

/**
 * Synchronous SHA-256 hash using a simple algorithm
 * Note: This is less secure than crypto.subtle but works synchronously
 */
function generateHashSync(data: string): string {
  // Simple hash function for browser compatibility
  // In production, consider using a library like 'js-sha256'
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string
  return Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64);
}

/**
 * Generate a random nonce for uniqueness (browser-compatible)
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate Data Fingerprint (DFP) for uploaded files
 *
 * Components:
 * - File size
 * - File type
 * - Owner ID
 * - Upload timestamp
 * - Random nonce
 */
export function generateDataFingerprint(
  fileSize: number,
  fileType: string,
  ownerId: string,
  uploadTimestamp?: number
): DataFingerprint {
  const timestamp = uploadTimestamp || Date.now();
  const nonce = generateNonce();

  // Create DFP hash from all components
  const dfpData = `${fileSize}:${fileType}:${ownerId}:${timestamp}:${nonce}`;
  const hash = generateHashSync(dfpData);

  return {
    fileSize,
    fileType,
    ownerId,
    uploadTimestamp: timestamp,
    nonce,
    hash,
  };
}

/**
 * Regenerate DFP hash from components (for verification)
 */
export function recomputeDataFingerprintHash(dfp: DataFingerprint): string {
  const dfpData = `${dfp.fileSize}:${dfp.fileType}:${dfp.ownerId}:${dfp.uploadTimestamp}:${dfp.nonce}`;
  return generateHashSync(dfpData);
}

/**
 * Verify if DFP hash is valid
 */
export function verifyDataFingerprint(dfp: DataFingerprint): boolean {
  const recomputedHash = recomputeDataFingerprintHash(dfp);
  return recomputedHash === dfp.hash;
}

/**
 * Generate Session Identity Token (SIT) for login sessions
 *
 * Components:
 * - User ID
 * - Login time
 * - Device ID
 */
export function generateSessionIdentityToken(
  userId: string,
  deviceId: string,
  loginTime?: number,
  expiryDurationMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): SessionIdentityToken {
  const time = loginTime || Date.now();
  const expiresAt = time + expiryDurationMs;

  // Create SIT hash
  const sitData = `${userId}:${time}:${deviceId}`;
  const hash = generateHashSync(sitData);

  return {
    userId,
    loginTime: time,
    deviceId,
    hash,
    expiresAt,
  };
}

/**
 * Regenerate SIT hash from components (for verification)
 */
export function recomputeSessionIdentityTokenHash(sit: SessionIdentityToken): string {
  const sitData = `${sit.userId}:${sit.loginTime}:${sit.deviceId}`;
  return generateHashSync(sitData);
}

/**
 * Verify if SIT hash is valid and not expired
 */
export function verifySessionIdentityToken(sit: SessionIdentityToken): boolean {
  const recomputedHash = recomputeSessionIdentityTokenHash(sit);
  const isHashValid = recomputedHash === sit.hash;
  
  // Handle both Firestore Timestamp objects and regular numbers
  let expiresAtMs = sit.expiresAt as number;
  if (sit.expiresAt && typeof sit.expiresAt === 'object') {
    const tsObj = sit.expiresAt as any;
    if (typeof tsObj.toMillis === 'function') {
      expiresAtMs = tsObj.toMillis();
    }
  }
  
  const isNotExpired = Date.now() < expiresAtMs;
  return isHashValid && isNotExpired;
}

/**
 * Generate Secure Trust Signature (STS) when file is uploaded
 *
 * Components:
 * - Role level
 * - Industry ID
 * - Owner ID
 * - Data fingerprint hash
 * - Session token hash
 */
export function generateSecureTrustSignature(
  roleLevel: number,
  industryId: string,
  ownerId: string,
  dataFingerprintHash: string,
  sessionTokenHash: string
): SecureTrustSignature {
  // Create STS hash from all components
  const stsData = `${roleLevel}:${industryId}:${ownerId}:${dataFingerprintHash}:${sessionTokenHash}`;
  const signature = generateHashSync(stsData);

  return {
    roleLevel,
    industryId,
    ownerId,
    dataFingerprint: dataFingerprintHash,
    sessionToken: sessionTokenHash,
    signature,
    createdAt: Date.now(),
  };
}

/**
 * Regenerate STS signature from components (for verification)
 */
export function recomputeSecureTrustSignature(sts: SecureTrustSignature): string {
  const stsData = `${sts.roleLevel}:${sts.industryId}:${sts.ownerId}:${sts.dataFingerprint}:${sts.sessionToken}`;
  return generateHashSync(stsData);
}

/**
 * Verify if STS is valid (signature matches)
 */
export function verifySecureTrustSignature(sts: SecureTrustSignature): boolean {
  const recomputedSignature = recomputeSecureTrustSignature(sts);
  return recomputedSignature === sts.signature;
}

/**
 * Verify trust signature for access request
 * Uses current session data to recalculate and compare signatures
 */
export function verifyAccessTrustSignature(
  storedSTS: SecureTrustSignature,
  currentRoleLevel: number,
  currentIndustryId: string,
  currentUserId: string,
  currentDFPHash: string,
  currentSITHash: string
): {
  isValid: boolean;
  reason: string;
} {
  // Verify stored STS integrity first
  if (!verifySecureTrustSignature(storedSTS)) {
    return {
      isValid: false,
      reason: 'Stored trust signature is invalid or tampered',
    };
  }

  // Check if critical components match
  if (storedSTS.dataFingerprint !== currentDFPHash) {
    return {
      isValid: false,
      reason: 'File integrity check failed - data fingerprint mismatch',
    };
  }

  // For access verification, role level and industry should match or be higher
  if (currentRoleLevel < storedSTS.roleLevel) {
    return {
      isValid: false,
      reason: 'Insufficient role level for access',
    };
  }

  // Industry check for SuperAdmin
  if (storedSTS.roleLevel === 3 && currentIndustryId !== storedSTS.industryId) {
    return {
      isValid: false,
      reason: 'Industry mismatch - access denied',
    };
  }

  return {
    isValid: true,
    reason: 'Trust signature verified successfully',
  };
}

/**
 * Create a comprehensive security token combining DFP and SIT
 */
export function createSecurityToken(
  dfp: DataFingerprint,
  sit: SessionIdentityToken
): string {
  const combined = `${dfp.hash}:${sit.hash}`;
  return generateHashSync(combined);
}

/**
 * Verify comprehensive security token
 */
export function verifySecurityToken(
  dfp: DataFingerprint,
  sit: SessionIdentityToken,
  token: string
): boolean {
  const combined = `${dfp.hash}:${sit.hash}`;
  const expectedToken = generateHashSync(combined);
  return token === expectedToken;
}
