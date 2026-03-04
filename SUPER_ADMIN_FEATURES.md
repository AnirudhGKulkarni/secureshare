# Super Admin Dashboard (Production Architecture)

This project implements a tabbed **Super Admin Dashboard** at `/super-admin` with the following sections:

- Overview
- User Management
- Shared Data
- Admin Chat
- Login History
- Security Settings
- Audit Logs

All UI is mounted from [src/pages/SuperAdminDashboard.tsx](src/pages/SuperAdminDashboard.tsx) and feature code lives in [src/features/superAdmin](src/features/superAdmin).

## 1) Firestore data structures

### `sharedData` (collection)
Stores metadata for uploaded files (actual bytes are stored in Firebase Storage).

Example document (`sharedData/{id}`):

```json
{
  "fileName": "report.pdf",
  "uploadedBy": "<uid>",
  "uploadedByName": "Super Admin",
  "sharedWith": ["<uid1>", "<uid2>"],
  "createdAt": "<serverTimestamp>",
  "fileURL": "https://...",
  "storagePath": "sharedData/<docId>/report.pdf",
  "size": 123456,
  "contentType": "application/pdf"
}
```

### `adminChats` (collection)
Real-time internal group chat for admins + super admins.

Example document:

```json
{
  "senderId": "<uid>",
  "senderName": "Alice Admin",
  "message": "Please review approval request #123",
  "timestamp": "<serverTimestamp>"
}
```

### `loginHistory` (collection)
Appends an entry on each login.

Example document:

```json
{
  "userId": "<uid>",
  "email": "user@example.com",
  "loginTime": "<serverTimestamp>",
  "deviceInfo": "<userAgent | platform>",
  "ipAddress": null,
  "location": null
}
```

Note: Browser clients cannot reliably obtain IP / location without a server-side component. The UI supports these fields if you later add a Cloud Function.

### `system_settings/securitySettings` (document)
Platform-wide security settings.

Example:

```json
{
  "registrationEnabled": true,
  "maintenanceMode": false,
  "loginAttemptLimit": 10,
  "updatedAt": "<serverTimestamp>",
  "updatedBy": "<uid>"
}
```

### `auditLogs` (collection)
Unified audit log intended for Super Admin monitoring.

Example document:

```json
{
  "actionType": "FILE_UPLOADED",
  "performedBy": "<uid>",
  "performedByName": "Super Admin",
  "targetUser": null,
  "timestamp": "<serverTimestamp>",
  "details": {
    "sharedDataId": "<docId>",
    "fileName": "report.pdf"
  }
}
```

## 2) Frontend architecture

Folder structure:

- [src/features/superAdmin/types.ts](src/features/superAdmin/types.ts) — shared types
- [src/features/superAdmin/services](src/features/superAdmin/services) — Firestore/Storage services
- [src/features/superAdmin/sections](src/features/superAdmin/sections) — tab contents

Key sections:

- Overview: [src/features/superAdmin/sections/OverviewSection.tsx](src/features/superAdmin/sections/OverviewSection.tsx)
- User Management: [src/features/superAdmin/sections/UserManagementSection.tsx](src/features/superAdmin/sections/UserManagementSection.tsx)
- Shared Data: [src/features/superAdmin/sections/SharedDataSection.tsx](src/features/superAdmin/sections/SharedDataSection.tsx)
- Admin Chat: [src/features/superAdmin/sections/AdminChatSection.tsx](src/features/superAdmin/sections/AdminChatSection.tsx)
- Login History: [src/features/superAdmin/sections/LoginHistorySection.tsx](src/features/superAdmin/sections/LoginHistorySection.tsx)
- Security Settings: [src/features/superAdmin/sections/SecuritySettingsSection.tsx](src/features/superAdmin/sections/SecuritySettingsSection.tsx)
- Audit Logs: [src/features/superAdmin/sections/AuditLogsSection.tsx](src/features/superAdmin/sections/AuditLogsSection.tsx)

## 3) Login history tracking

Login history is written in [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) after a successful `signInWithEmailAndPassword()`.

It also writes a best-effort audit log entry in `auditLogs`.

## 4) Security model

### Route protection
Routes use `RoleProtectedRoute` (see [src/components/RoleProtectedRoute.tsx](src/components/RoleProtectedRoute.tsx)).

### Firestore rules
Rules are updated in [firestore.rules](firestore.rules) to restrict:

- `auditLogs` read → super admin only
- `loginHistory` read → super admin only
- `sharedData` write → super admin only; read → super admin or `sharedWith` recipient
- `adminChats` read/write → admin or super admin
- `system_settings/securitySettings` read → public (for signup/maintenance gating); write → super admin only

### Storage rules
Rules are provided in [storage.rules](storage.rules). Files are stored at `sharedData/{sharedDataDocId}/{filename}` and read access is granted only to super admin, uploader, or recipients in `sharedWith`.

## 5) Scalability best practices

- Keep Firestore access in `services/` (no raw queries scattered across UI).
- Prefer `onSnapshot()` subscriptions for real-time panels (chat, audit logs, shared files).
- For very large tables, switch to paginated queries (`limit`, `startAfter`) and server-side indexes.
- For tamper-resistant audit logs and IP tracking, move writes to Cloud Functions (Admin SDK) and make client writes read-only.
