# Fixing Firestore Permission Errors

## The Problem

You're seeing these errors:
```
FirebaseError: Missing or insufficient permissions.
```

This means your Firestore security rules are blocking access to the database.

## Quick Fix (Development Mode)

### Option 1: Using Firebase Console (EASIEST)

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `share-650dc`
3. **Go to Firestore Database** (left sidebar)
4. **Click on "Rules" tab** (top)
5. **Replace ALL content** with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORARY: Allow all authenticated users (DEVELOPMENT ONLY)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

6. **Click "Publish"**
7. **Wait 1-2 minutes** for rules to propagate
8. **Refresh your browser** and try logging in again

### Option 2: Using Firebase CLI

If you have Firebase CLI installed:

```bash
# Install Firebase CLI if you don't have it
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore in your project (if not done)
firebase init firestore

# Deploy the development rules
firebase deploy --only firestore:rules
```

Then use the content from `firestore.rules.dev` file created in your project.

## Current Rules Files Created

I've created two rules files for you:

### 1. `firestore.rules.dev` (Use for Development)
- More permissive
- Any authenticated user can read/write
- Good for testing and development
- **Use this NOW to fix your permission errors**

### 2. `firestore.rules` (Use for Production)
- Strict security rules
- Role-based access control
- Super admin, admin, and client roles
- Use this when deploying to production

## Step-by-Step Fix

### Immediate Fix (5 minutes):

1. Open Firebase Console
2. Go to Firestore Database → Rules
3. Copy content from `firestore.rules.dev`
4. Paste into Firebase Console
5. Click "Publish"
6. Wait 1-2 minutes
7. Clear browser cache: `localStorage.clear(); location.reload();`
8. Try logging in again

### After Fix Works:

1. Create your super admin user in Firestore:
   - Collection: `users`
   - Document ID: [Your Firebase Auth UID]
   - Fields:
     ```
    email: "superadmin@trustnshare.com"
     firstName: "Super"
     lastName: "Admin"
     role: "super_admin"
    company: "TrustNShare"
     domain: "System"
     status: "active"
     createdAt: [timestamp]
     ```

2. Login with super admin credentials
3. Should redirect to `/super-admin` dashboard

## Verify Rules Are Applied

After publishing rules, you can verify in Firebase Console:

1. Go to Firestore Database → Rules
2. Check "Published" timestamp
3. Should show recent time (within last few minutes)

## Common Issues

### Rules not updating?
- Wait 1-2 minutes after publishing
- Clear browser cache
- Try incognito/private window

### Still getting permission errors?
- Make sure you're logged in (check Firebase Auth console)
- Verify the UID in Firestore `users` collection matches Firebase Auth UID
- Check browser console for exact error messages

### Rules won't publish?
- Check for syntax errors in rules
- Make sure you selected the correct Firebase project
- Try publishing from Firebase CLI instead

## Production Deployment

When ready for production:

1. Review `firestore.rules` (the production version)
2. Test thoroughly with all user roles
3. Update rules in Firebase Console with production version
4. Monitor security alerts in Firebase Console

## Security Notes

⚠️ **IMPORTANT**: The development rules (`firestore.rules.dev`) allow ANY authenticated user to read/write ANY document. This is:
- ✅ Good for development and testing
- ❌ BAD for production
- ⚠️ Should be replaced with proper role-based rules before going live

## Quick Test

After applying rules, test in browser console:

```javascript
// Should work now
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const db = getFirestore();
const uid = auth.currentUser?.uid;

if (uid) {
  const docRef = doc(db, 'users', uid);
  getDoc(docRef).then(doc => {
    console.log('SUCCESS! Profile data:', doc.data());
  }).catch(err => {
    console.error('STILL FAILING:', err);
  });
}
```

If you see "SUCCESS!", the rules are working!
