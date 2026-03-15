/**
 * SCDA Configuration Service
 * Manages system-wide security configuration for SCDA
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SCDAConfig } from './types';

const DEFAULT_CONFIG: SCDAConfig = {
  sessionTokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
  accessLogRetention: 90, // 90 days
  enableDetailedLogging: true,
  requireDeviceVerification: true,
  maxAccessAttempts: 5,
  lockoutDuration: 1 * 60 * 1000, // 15 minutes
};

/**
 * Load SCDA configuration from Firestore
 * Falls back to defaults if not configured
 */
export async function loadSCDAConfig(): Promise<SCDAConfig> {
  try {
    const configDoc = await getDoc(doc(firestore, 'system_config', 'scda'));

    if (configDoc.exists()) {
      const data = configDoc.data();
      return {
        sessionTokenExpiry: data.sessionTokenExpiry ?? DEFAULT_CONFIG.sessionTokenExpiry,
        accessLogRetention: data.accessLogRetention ?? DEFAULT_CONFIG.accessLogRetention,
        enableDetailedLogging:
          data.enableDetailedLogging ?? DEFAULT_CONFIG.enableDetailedLogging,
        requireDeviceVerification:
          data.requireDeviceVerification ?? DEFAULT_CONFIG.requireDeviceVerification,
        maxAccessAttempts: data.maxAccessAttempts ?? DEFAULT_CONFIG.maxAccessAttempts,
        lockoutDuration: data.lockoutDuration ?? DEFAULT_CONFIG.lockoutDuration,
      };
    }

    return DEFAULT_CONFIG;
  } catch (error) {
    console.warn('Failed to load SCDA config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save SCDA configuration to Firestore
 * Only SuperAdmin and SuperSuperAdmin can modify
 */
export async function saveSCDAConfig(
  config: Partial<SCDAConfig>,
  adminId: string,
  adminRole: 'super_super_admin' | 'super_admin'
): Promise<boolean> {
  try {
    // Verify admin has permission
    if (
      adminRole !== 'super_super_admin' &&
      adminRole !== 'super_admin'
    ) {
      console.error('Insufficient permissions to modify SCDA config');
      return false;
    }

    // Merge with existing config
    const existingConfig = await loadSCDAConfig();
    const updatedConfig = { ...existingConfig, ...config };

    // Validate configuration values
    if (updatedConfig.sessionTokenExpiry < 60 * 1000) {
      console.error('Session token expiry must be at least 1 minute');
      return false;
    }

    if (updatedConfig.accessLogRetention < 7) {
      console.error('Access log retention must be at least 7 days');
      return false;
    }

    if (updatedConfig.maxAccessAttempts < 1) {
      console.error('Max access attempts must be at least 1');
      return false;
    }

    if (updatedConfig.lockoutDuration < 60 * 1000) {
      console.error('Lockout duration must be at least 1 minute');
      return false;
    }

    // Save to Firestore
    await setDoc(doc(firestore, 'system_config', 'scda'), updatedConfig);

    // Log configuration change
    const auditLog = {
      timestamp: new Date(),
      adminId,
      adminRole,
      action: 'scda_config_updated',
      changes: config,
      newConfig: updatedConfig,
    };

    console.log('SCDA configuration updated:', updatedConfig);
    console.log('Audit log entry:', auditLog);

    return true;
  } catch (error) {
    console.error('Failed to save SCDA config:', error);
    return false;
  }
}

/**
 * Reset SCDA configuration to defaults
 */
export async function resetSCDAConfig(
  adminId: string,
  adminRole: 'super_super_admin' | 'super_admin'
): Promise<boolean> {
  try {
    if (adminRole !== 'super_super_admin') {
      console.error('Only SuperSuperAdmin can reset SCDA config');
      return false;
    }

    await setDoc(doc(firestore, 'system_config', 'scda'), DEFAULT_CONFIG);
    console.log('SCDA configuration reset to defaults');

    return true;
  } catch (error) {
    console.error('Failed to reset SCDA config:', error);
    return false;
  }
}

/**
 * Get default SCDA configuration
 */
export function getDefaultSCDAConfig(): SCDAConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * Validate individual config values
 */
export function validateSCDAConfig(config: Partial<SCDAConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    config.sessionTokenExpiry !== undefined &&
    config.sessionTokenExpiry < 60 * 1000
  ) {
    errors.push('Session token expiry must be at least 1 minute (60000ms)');
  }

  if (
    config.accessLogRetention !== undefined &&
    config.accessLogRetention < 7
  ) {
    errors.push('Access log retention must be at least 7 days');
  }

  if (
    config.maxAccessAttempts !== undefined &&
    config.maxAccessAttempts < 1
  ) {
    errors.push('Max access attempts must be at least 1');
  }

  if (
    config.lockoutDuration !== undefined &&
    config.lockoutDuration < 60 * 1000
  ) {
    errors.push('Lockout duration must be at least 1 minute (60000ms)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration summary for display
 */
export function getConfigSummary(config: SCDAConfig): string {
  const sessionExpiry = (config.sessionTokenExpiry / (60 * 60 * 1000)).toFixed(
    1
  );
  const lockoutMinutes = (config.lockoutDuration / (60 * 1000)).toFixed(0);

  return `
SCDA Configuration Summary:
├─ Session Token Expiry: ${sessionExpiry} hours
├─ Access Log Retention: ${config.accessLogRetention} days
├─ Max Access Attempts: ${config.maxAccessAttempts}
├─ Lockout Duration: ${lockoutMinutes} minutes
├─ Device Verification: ${config.requireDeviceVerification ? 'Enabled' : 'Disabled'}
└─ Detailed Logging: ${config.enableDetailedLogging ? 'Enabled' : 'Disabled'}
  `.trim();
}

export const SCDAConfigService = {
  loadSCDAConfig,
  saveSCDAConfig,
  resetSCDAConfig,
  getDefaultSCDAConfig,
  validateSCDAConfig,
  getConfigSummary,
};
