# Deploy email sender to Vercel

This adds a minimal Vercel serverless API at `api/sendInviteEmail.ts` that sends emails via Resend.

## Prereqs
- Vercel account; CLI installed (`npm i -g vercel`) or use the dashboard.
- An email provider API key (e.g., Resend), free tier is fine.

## Deploy steps
1. Login and deploy
```powershell
vercel login
cd "d:\B.Tech Engineering\0.PROJECTS\Secure Data Sharing Platform\pilot_project"
vercel
```
Follow the prompts to create/link a project.

2. Set server env in Vercel dashboard
- Go to Project → Settings → Environment Variables
- Add `RESEND_API_KEY` with your provider key (Production and Preview)
- Redeploy

3. Use the endpoint in your app
- Find your Vercel URL (e.g., `https://secureshare.vercel.app`)
- Set in `.env`:
```
VITE_EMAIL_FUNCTION_URL=https://<your-vercel-app>.vercel.app/api/sendInviteEmail
```
- Restart your dev server.

## Test
- Approve or Resend Invite from `AdminApproval` page.
- If errors occur, check Vercel function logs, confirm `RESEND_API_KEY` is set, and that the sender domain is verified in your email provider.

## Notes
- `vercel.json` sets Node 18 runtime for API functions.
- Keep secrets in Vercel env; do not store provider keys in client `.env`.
