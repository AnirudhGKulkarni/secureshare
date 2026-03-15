/**
 * SCDA Module Exports
 * Central export point for all SCDA components and utilities
 */

// Types
export type {
  UserRole,
  DataFingerprint,
  SessionIdentityToken,
  SecureTrustSignature,
  FileMetadata,
  AccessRequest,
  AccessLogEntry,
  AccessControlResult,
  SCDAConfig,
} from './types';

// Role Hierarchy
export {
  getRoleHierarchy,
  getRoleLevel,
  canRoleAccessOtherRole,
  hasPermission,
  getRoleConstraints,
} from './roleHierarchy';

// Signature Generators
export {
  generateDataFingerprint,
  generateSessionIdentityToken,
  generateSecureTrustSignature,
  recomputeDataFingerprintHash,
  recomputeSessionIdentityTokenHash,
  recomputeSecureTrustSignature,
  verifyDataFingerprint,
  verifySessionIdentityToken,
  verifySecureTrustSignature,
  createSecurityToken,
} from './signatureGenerators';

// Access Control
export {
  evaluateAccessRequest,
  canShareFile,
  canRevokeAccess,
  getEffectiveAccessLevel,
} from './accessControl';

// Access Logger
export {
  logAccessEvent,
  getUserAccessLogs,
  getFileAccessLogs,
  getFailedAccessAttempts,
  getSecurityAuditLog,
  hasExceededFailedAttempts,
  cleanupOldAccessLogs,
  generateUserAccessReport,
  generateFileAccessReport,
} from './accessLogger';

// Middleware
export {
  verifyFileAccessMiddleware,
  getUserFileAccessLevel,
  canUserDownloadFile,
  canUserShareFile,
  getUserAccessibleFiles,
  revokeUserFileAccess,
  initializeSCDA,
  updateSCDAConfig,
  getSCDAConfig,
} from './middleware';

// Configuration
export {
  loadSCDAConfig,
  saveSCDAConfig,
  resetSCDAConfig,
  getDefaultSCDAConfig,
  validateSCDAConfig,
  getConfigSummary,
  SCDAConfigService,
} from './config';
