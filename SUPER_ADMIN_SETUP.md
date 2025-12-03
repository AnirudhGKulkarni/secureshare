# Super Admin Setup Instructions

## Creating a Super Admin Account

Since the super admin cannot be created through the normal signup flow, you need to manually create one in Firebase.

### Method 1: Using Firebase Console (Recommended)

1. **Create Authentication User:**
   - Go to Firebase Console → Authentication → Users
   - Click "Add User"
  - Email: `superadmin@trustnshare.com`
   - Password: Create a secure password (e.g., `SuperAdmin@2024`)
   - Copy the UID of the created user

2. **Create Firestore Profile:**
   - Go to Firestore Database → users collection
   - Click "Add Document"
   - Document ID: Paste the UID from step 1
   - Add the following fields:
     ```
     email: "superadmin@secureshare.com"
     firstName: "Super"
     lastName: "Admin"
     company: "SecureShare"
     domain: "System"
     role: "super_admin"
     status: "active"
     createdAt: (use Firestore timestamp)
     ```

3. **Login:**
   - Go to `/login`
   - Email: `superadmin@secureshare.com`
   - Password: [Your password from step 1]
   - You will be redirected to `/super-admin` dashboard

### Method 2: Using Firebase Admin SDK (For Production)

If you have a Firebase Admin SDK setup, you can use the following code:

```javascript
const admin = require('firebase-admin');

async function createSuperAdmin() {
  // Create auth user
  const user = await admin.auth().createUser({
    email: 'superadmin@secureshare.com',
    password: 'SuperAdmin@2024', // Change this!
    displayName: 'Super Admin',
  });

  // Set custom claims
  await admin.auth().setCustomUserClaims(user.uid, {
    super_admin: true,
  });

  // Create Firestore profile
  await admin.firestore().collection('users').doc(user.uid).set({
    email: 'superadmin@secureshare.com',
    firstName: 'Super',
    lastName: 'Admin',
    company: 'SecureShare',
    domain: 'System',
    role: 'super_admin',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Super Admin created successfully!');
  console.log('UID:', user.uid);
}

createSuperAdmin();
```

## Super Admin Features

Once logged in as super admin, you have access to:

1. **Super Admin Dashboard** (`/super-admin`)
   - Overview of all admins and clients
   - Platform growth metrics
   - System health monitoring
   - Quick access to pending admin approvals

2. **Admin Approvals** (`/super-admin/approvals`)
   - Review admin registration requests
   - View uploaded verification documents
   - Approve or reject admin applications
   - Document viewer with support for images and PDFs

3. **Enhanced Audit Logs** (`/super-admin/audit`)
   - Monitor all system activities
   - Filter by role (super_admin, admin, client)
   - Filter by action type and status
   - Export logs to CSV
   - Track both admin and client activities

## Security Notes

- The super admin role has the highest privileges
- Only create super admin accounts through secure methods
- Use strong passwords and enable 2FA when possible
- Regularly review audit logs for suspicious activity
- Never expose super admin credentials in code

## Firestore Security Rules

Make sure your Firestore security rules allow super admin to read/write necessary collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Super admin can read/write everything
    function isSuperAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
    }
    
    // Approval documents
    match /approval_documents/{document} {
      allow read, write: if isSuperAdmin();
      allow create: if request.auth != null; // Allow users to submit
    }
    
    // Audit logs
    match /audit_logs/{log} {
      allow read: if isSuperAdmin();
      allow create: if request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSuperAdmin() || request.auth.uid == userId;
      allow write: if isSuperAdmin();
    }
  }
}
```
