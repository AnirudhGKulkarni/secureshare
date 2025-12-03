# TrustNShare Functions

This adds a minimal HTTPS function `sendInviteEmail` to deliver admin approval + pricing invite emails via Resend.

## Prereqs
- Node 18+
- Firebase CLI (`npm i -g firebase-tools`)
- A Firebase project (or use any serverless host; code is portable)
- Resend API key

## Setup
1. Login and init if needed:
```powershell
firebase login
firebase init hosting,functions
```
Skip hosting if not needed. Ensure functions use TypeScript.

2. Install deps:
```powershell
cd functions; npm install
```

3. Configure provider API key:
- Option A (env var at deploy):
```powershell
$env:RESEND_API_KEY = "<YOUR_KEY>"; firebase deploy --only functions
```
- Option B (CLI config):
```powershell
firebase functions:secrets:set RESEND_API_KEY
firebase deploy --only functions
```

4. Deploy:
```powershell
npm run deploy
```
Copy the deployed URL for `sendInviteEmail`.

5. Frontend env:
Create `.env` in project root and set:
```
VITE_EMAIL_FUNCTION_URL=https://<region>-<project>.cloudfunctions.net/sendInviteEmail
```
Restart dev server after changes.

## Client behavior
`src/pages/AdminApproval.tsx` will POST `{ to, name, tempPassword, inviteLink }` to `VITE_EMAIL_FUNCTION_URL` after approving an admin and creating an invite. On 200 OK, it shows a success toast; errors are logged and a warning toast appears.

## Local test (optional)
Use webhook.site to inspect payloads:
```powershell
# Set temporary URL
$env:VITE_EMAIL_FUNCTION_URL = "https://webhook.site/<your-id>"
```
Approve an admin and check the request body.
