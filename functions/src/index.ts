import { onRequest } from "firebase-functions/v2/https";
import fetch from "node-fetch";

// HTTPS function that sends invite emails via Resend
// Deploy in the same region as Firestore to minimize latency
export const sendInviteEmail = onRequest({ region: "asia-south1", cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const { to, name, tempPassword, inviteLink } = req.body || {};
  if (!to || !inviteLink) {
    res.status(400).json({ error: "Missing fields: 'to' and 'inviteLink' required" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "RESEND_API_KEY not configured" });
    return;
  }

  const html = `
    <p>Hi ${name || "there"},</p>
    ${tempPassword ? `<p>Your temporary password: <b>${tempPassword}</b></p>` : ""}
    <p>Secure pricing invite: <a href="${inviteLink}">${inviteLink}</a></p>
    <p>This link may expire or be revoked.</p>
  `;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "superadmin@trustnshare.com",
        to,
        subject: "Your Admin Access & Secure Pricing Link",
        html,
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      res.status(502).json({ error: "Email provider failed", details: body });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: "Send failed", details: e?.message });
  }
});
