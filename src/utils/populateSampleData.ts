// Utility to populate sample data for testing the dashboard
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore, auth } from '@/lib/firebase';

export const populateSampleData = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No user logged in');
      return;
    }

    const userId = currentUser.uid;
    console.log('Populating sample data for user:', userId);

    // 1. Add sample audit logs for recent activity
    const auditLogsRef = collection(firestore, 'audit_logs');
    
    const activities = [
      { action: 'FILE_UPLOAD', resource: 'contract.pdf', details: 'Uploaded new contract document' },
      { action: 'LOGIN', resource: 'Dashboard', details: 'Successful login from Chrome' },
      { action: 'SECURITY_CHECK', resource: 'Account', details: 'Two-factor authentication verified' },
      { action: 'SETTINGS_UPDATE', resource: 'Profile', details: 'Updated profile information' },
      { action: 'FILE_DOWNLOAD', resource: 'report.xlsx', details: 'Downloaded quarterly report' },
    ];

    for (const activity of activities) {
      await addDoc(auditLogsRef, {
        userId,
        action: activity.action,
        resource: activity.resource,
        details: activity.details,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: 'success'
      });
    }
    console.log('✓ Added audit logs');

    // 2. Add sample alerts
    const alertsRef = collection(firestore, 'alerts');
    
    const alerts = [
      { message: 'Your password will expire in 7 days', type: 'warning' },
      { message: 'New security update available', type: 'info' },
      { message: 'File shared successfully with team@example.com', type: 'success' },
    ];

    for (const alert of alerts) {
      await addDoc(alertsRef, {
        userId,
        message: alert.message,
        type: alert.type,
        createdAt: serverTimestamp(),
      });
    }
    console.log('✓ Added alerts');

    // 3. Add sample shared_data for file sensitivity
    const sharedDataRef = collection(firestore, 'shared_data');
    
    const files = [
      { name: 'public-doc.pdf', sensitivity: 'public' },
      { name: 'internal-memo.docx', sensitivity: 'internal' },
      { name: 'confidential-report.xlsx', sensitivity: 'confidential' },
      { name: 'team-notes.txt', sensitivity: 'internal' },
      { name: 'public-announcement.pdf', sensitivity: 'public' },
      { name: 'secret-contract.pdf', sensitivity: 'confidential' },
    ];

    for (const file of files) {
      await addDoc(sharedDataRef, {
        userId,
        ownerId: userId,
        fileName: file.name,
        sensitivity: file.sensitivity,
        classification: file.sensitivity,
        sharedWith: [],
        createdAt: serverTimestamp(),
      });
    }
    console.log('✓ Added shared data');

    // 4. Add login events for last 7 days
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const loginDate = new Date(now);
      loginDate.setDate(now.getDate() - i);
      loginDate.setHours(9, 0, 0, 0);
      
      // Random number of logins per day (1-5)
      const loginCount = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < loginCount; j++) {
        await addDoc(auditLogsRef, {
          userId,
          action: 'LOGIN',
          resource: 'Dashboard',
          details: 'User login',
          timestamp: loginDate,
          createdAt: loginDate,
          status: 'success'
        });
      }
    }
    console.log('✓ Added login history');

    console.log('✅ Sample data populated successfully!');
    alert('Sample data populated! Refresh the page to see the data.');
    
  } catch (error) {
    console.error('Error populating sample data:', error);
    alert('Error populating data. Check console for details.');
  }
};
