# Hierarchical Sharing System - Setup Guide

## Overview
Implemented role-based recipient filtering for secure data sharing:
- **Clients** → Can only share to their creating admin
- **Admins** → Can share to clients they created + all super admins  
- **Super Admins** → Can share to all admins

## Code Changes Completed ✅

### 1. Share.tsx (Admin Page)
- Added `recipients` state replacing `clients`
- Added `fetchRecipients()` function with role-based filtering
- Super admin: Fetches all admins
- Admin: Fetches their created clients + all super admins
- Dialog updated to show role labels and recipient count

### 2. ClientShare.tsx (Client Page)
- Added `recipients` state replacing `clients`
- Added `fetchRecipients()` function for clients
- Clients can ONLY share with their creating admin (from `users.createdBy`)
- Dialog title updated to "Share Data With Your Admin"
- Error handling if no parent admin found

### 3. Received Tab
- **Remains unchanged** - Users can receive from anyone who shares with them
- Uses `sharedWithUserIds` array-contains query

---

## Database Requirements ✅

### Users Collection Fields (MUST HAVE)
```
users/{userId}
  - uid: string (user ID)
  - email: string
  - role: string ('client' | 'admin' | 'super_admin' | 'super_super_admin')
  - status: string ('active' | 'inactive')
  - createdBy: string | null (UID of admin who created this user, null for admins/super admins)
  - firstName: string
  - lastName: string
```

**⚠️ IMPORTANT**: Ensure ALL user documents have the `createdBy` field:
- For **clients**: Should contain the admin's UID who created them
- For **admins/super admins**: Should be null or omitted

---

## Firestore Rules Updates Needed

### Current Rules Coverage:
- ✅ `users` collection: Read access for authenticated users
- ✅ `sharedData` collection: Proper sharing restrictions

### Verify in firestore.rules:
```
// Verify users can read other users (admin needs to fetch their clients/super admins)
match /users/{document=**} {
  allow read: if isSignedIn();
  allow write: if isSuperAdmin();  // Only super admin can modify users
}

// sharedData remains the same (already correct)
match /sharedData/{docId} {
  allow read: if isSignedIn() && (
    isSuperAdmin()
    || firestore.get(...).data.uploadedBy == request.auth.uid
    || request.auth.uid in firestore.get(...).data.sharedWithUserIds
  );
  allow write: if isSignedIn();
}
```

---

## Firestore Indexes Required

Firestore will **automatically suggest** creating these indexes when queries fail.  
The queries that may need indexes:

### 1. **Admin fetching their clients** (Might need composite index)
```
Query: Collection: users
  WHERE createdBy == currentAdmin.uid
  WHERE status == "active"

Auto-index: Likely not needed (single field queries are usually fast)
```

### 2. **Fetching super admins** (Already indexed - single field)
```
Query: Collection: users
  WHERE role in ['super_admin', 'super_super_admin']
  WHERE status == "active"

Status: ✅ Will work without explicit index
```

### 3. **Fetching all admins** (Already indexed - single field)
```
Query: Collection: users
  WHERE role == "admin"
  WHERE status == "active"

Status: ✅ Will work without explicit index
```

### What to Do If You See "Index Required" Error:
1. Open the error in your browser console - it will show a link
2. Click the Firebase link to create the composite index automatically
3. Or create manually in Firebase Console → Firestore → Indexes

---

## Testing Checklist

### Test Case 1: Client Sharing
- [ ] Login as Client A
- [ ] Go to Share tab
- [ ] Try to select recipients
- [ ] Verify ONLY "Admin A (Your Admin)" appears
- [ ] Share a file to Admin A
- [ ] Verify file appears in Admin A's "Received" tab

### Test Case 2: Admin Sharing
- [ ] Login as Admin A (who created Client A, B, C)
- [ ] Go to Share tab
- [ ] Try to select recipients
- [ ] Verify 3 clients appear: "Client A (Your Client)", etc.
- [ ] Verify All Super Admins appear
- [ ] Verify Client D does NOT appear (created by different admin)
- [ ] Share file to Client B
- [ ] Verify file appears in Client B's "Received" tab

### Test Case 3: Super Admin Sharing
- [ ] Login as Super Admin
- [ ] Go to Share tab
- [ ] Try to select recipients
- [ ] Verify ALL admins appear (Admin A, Admin B, etc.)
- [ ] Verify no clients appear
- [ ] Share file to Admin A
- [ ] Verify file appears in Admin A's "Received" tab

### Test Case 4: Restriction Testing
- [ ] Ensure Client A cannot see recipients other than Admin A
- [ ] Ensure Admin B cannot see clients created by Admin A
- [ ] Ensure Admin A cannot send to Admin B (only to their clients + super admins)

---

## Troubleshooting

### Problem: "No recipients found"
**Solution**: Verify the user's `createdBy` field is properly set in Firestore

### Problem: "Index required" error
**Solution**: Follow the Firebase Console link provided in the error to auto-create the index

### Problem: Wrong recipients appearing
**Solution**: Check the user's `role` field - ensure it's one of: 'client', 'admin', 'super_admin', 'super_super_admin'

### Problem: Clients can share to multiple admins
**Solution**: Verify each client record has a `createdBy` field pointing to exactly ONE admin UID

---

## Files Modified
- ✅ `src/pages/Share.tsx` - Admin sharing with hierarchical filtering
- ✅ `src/pages/ClientShare.tsx` - Client sharing to only their admin
- 📋 `firestore.rules` - Review if needed (usually no changes required)

## Important Notes
1. **Received Tab** - Always works the same way (receive from anyone who shares)
2. **Base64 Storage** - Files continue to be stored as base64 in Firestore (no CORS issues)
3. **SCDA Protection** - All shares include SCDA security signatures
4. **Audit Trail** - Access events are logged for all shares

---

**Status**: ✅ Ready for testing
