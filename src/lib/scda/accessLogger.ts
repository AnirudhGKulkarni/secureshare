/**
 * Access Logging System
 * Logs all access requests and control decisions
 */

import { collection, addDoc, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { firestore } from './../../lib/firebase';
import { AccessLogEntry } from './types';

/**
 * Log an access attempt or decision
 */
export async function logAccessEvent(logEntry: AccessLogEntry): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(firestore, 'scda_access_logs'), {
      ...logEntry,
      timestamp: Timestamp.fromDate(new Date(logEntry.timestamp)),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error logging access event:', error);
    return null;
  }
}

/**
 * Get access logs for a user
 */
export async function getUserAccessLogs(
  userId: string,
  limitDays: number = 30
): Promise<AccessLogEntry[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limitDays);

    const q = query(
      collection(firestore, 'scda_access_logs'),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(startDate))
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          ...doc.data(),
          timestamp:
            doc.data().timestamp?.toDate?.() || doc.data().timestamp || 0,
        } as AccessLogEntry)
    );
  } catch (error) {
    console.error('Error retrieving user access logs:', error);
    return [];
  }
}

/**
 * Get access logs for a file
 */
export async function getFileAccessLogs(fileId: string): Promise<AccessLogEntry[]> {
  try {
    const q = query(
      collection(firestore, 'scda_access_logs'),
      where('fileId', '==', fileId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          ...doc.data(),
          timestamp:
            doc.data().timestamp?.toDate?.() || doc.data().timestamp || 0,
        } as AccessLogEntry)
    );
  } catch (error) {
    console.error('Error retrieving file access logs:', error);
    return [];
  }
}

/**
 * Get failed access attempts for a user
 */
export async function getFailedAccessAttempts(
  userId: string,
  withinMinutes: number = 60
): Promise<AccessLogEntry[]> {
  try {
    const startTime = Date.now() - withinMinutes * 60 * 1000;

    // Query only by userId, filter client-side to avoid composite index requirement
    const q = query(
      collection(firestore, 'scda_access_logs'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => ({
        ...doc.data(),
        timestamp:
          doc.data().timestamp?.toDate?.() || doc.data().timestamp || 0,
      } as AccessLogEntry))
      .filter(
        (log) =>
          log.action === 'access_denied' && log.timestamp >= startTime
      );
  } catch (error) {
    console.error('Error retrieving failed access attempts:', error);
    return [];
  }
}

/**
 * Get security audit log
 */
export async function getSecurityAuditLog(
  limitDays: number = 30,
  action?: string
): Promise<AccessLogEntry[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limitDays);

    let q: any = query(
      collection(firestore, 'scda_access_logs'),
      where('timestamp', '>=', Timestamp.fromDate(startDate))
    );

    // Can't add second where clause with timestamp, so filter client-side if needed
    const snapshot = await getDocs(q);
    let logs = snapshot.docs.map(
      (doc) => {
        const data = doc.data() as any;
        return {
          ...data,
          timestamp:
            data.timestamp?.toDate?.() || data.timestamp || 0,
        } as AccessLogEntry;
      }
    );

    if (action) {
      logs = logs.filter((log) => log.action === action);
    }

    return logs;
  } catch (error) {
    console.error('Error retrieving audit log:', error);
    return [];
  }
}

/**
 * Check if user has exceeded max failed attempts
 */
export async function hasExceededFailedAttempts(
  userId: string,
  maxAttempts: number = 5,
  withinMinutes: number = 15
): Promise<boolean> {
  try {
    const failedAttempts = await getFailedAccessAttempts(userId, withinMinutes);
    return failedAttempts.length >= maxAttempts;
  } catch (error) {
    console.error('Error checking failed attempts:', error);
    return false;
  }
}

/**
 * Clean up old access logs
 */
export async function cleanupOldAccessLogs(
  retentionDays: number = 90
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const q = query(
      collection(firestore, 'scda_access_logs'),
      where('timestamp', '<', Timestamp.fromDate(cutoffDate))
    );

    const snapshot = await getDocs(q);
    let deletedCount = 0;

    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
      deletedCount++;
    }

    console.log(`Cleaned up ${deletedCount} old access logs`);
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up access logs:', error);
    return 0;
  }
}

/**
 * Generate access report for user
 */
export async function generateUserAccessReport(
  userId: string,
  limitDays: number = 30
): Promise<{
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  recentActivity: AccessLogEntry[];
  riskLevel: 'low' | 'medium' | 'high';
}> {
  try {
    const logs = await getUserAccessLogs(userId, limitDays);

    const totalAccesses = logs.length;
    const successfulAccesses = logs.filter((l) => l.action === 'access_granted').length;
    const failedAccesses = logs.filter((l) => l.action === 'access_denied').length;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (failedAccesses > totalAccesses * 0.5) {
      riskLevel = 'high'; // More than 50% failed attempts
    } else if (failedAccesses > totalAccesses * 0.2) {
      riskLevel = 'medium'; // More than 20% failed attempts
    }

    return {
      totalAccesses,
      successfulAccesses,
      failedAccesses,
      recentActivity: logs.slice(0, 10),
      riskLevel,
    };
  } catch (error) {
    console.error('Error generating access report:', error);
    return {
      totalAccesses: 0,
      successfulAccesses: 0,
      failedAccesses: 0,
      recentActivity: [],
      riskLevel: 'low',
    };
  }
}

/**
 * Generate file access report
 */
export async function generateFileAccessReport(
  fileId: string
): Promise<{
  totalAccesses: number;
  uniqueUsers: number;
  successfulAccesses: number;
  failedAccesses: number;
  lastAccessed: number | null;
  mostRecentAccessor: string | null;
}> {
  try {
    const logs = await getFileAccessLogs(fileId);

    if (logs.length === 0) {
      return {
        totalAccesses: 0,
        uniqueUsers: 0,
        successfulAccesses: 0,
        failedAccesses: 0,
        lastAccessed: null,
        mostRecentAccessor: null,
      };
    }

    const successfulAccesses = logs.filter((l) => l.action === 'access_granted').length;
    const failedAccesses = logs.filter((l) => l.action === 'access_denied').length;
    const uniqueUsers = new Set(logs.map((l) => l.userId)).size;

    const sortedByTime = [...logs].sort((a, b) => b.timestamp - a.timestamp);
    const lastAccessed = sortedByTime[0]?.timestamp || null;
    const mostRecentAccessor = sortedByTime[0]?.userEmail || null;

    return {
      totalAccesses: logs.length,
      uniqueUsers,
      successfulAccesses,
      failedAccesses,
      lastAccessed,
      mostRecentAccessor,
    };
  } catch (error) {
    console.error('Error generating file access report:', error);
    return {
      totalAccesses: 0,
      uniqueUsers: 0,
      successfulAccesses: 0,
      failedAccesses: 0,
      lastAccessed: null,
      mostRecentAccessor: null,
    };
  }
}
