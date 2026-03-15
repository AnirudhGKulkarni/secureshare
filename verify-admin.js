/**
 * Verification script to check:
 * 1. Admin document exists in Firestore
 * 2. Client document has createdBy field
 * Run this in Firebase Console > Firestore > Console tab
 */

// Get admin UID from browser console
const ADMIN_UID = 'xb18H66DZbhYBjZCKqq3KGnj3aA3';
const CLIENT_UID = 'PS8IACZBXcb0KMUizkIWKrF3xVI2';

// Paste this in Firebase Console to verify:
console.log('=== FIRESTORE VERIFICATION ===\n');

// Check 1: Does admin document exist?
db.collection('users').doc(ADMIN_UID).get().then(doc => {
  console.log(`✓ Admin document exists: ${doc.exists}`);
  if (doc.exists) {
    console.log('  Admin data:', doc.data());
  }
});

// Check 2: Does client document have createdBy?
db.collection('users').doc(CLIENT_UID).get().then(doc => {
  console.log(`✓ Client document exists: ${doc.exists}`);
  if (doc.exists) {
    const data = doc.data();
    console.log('  Client createdBy:', data.createdBy);
    console.log('  Match expected admin?', data.createdBy === ADMIN_UID);
  }
});
