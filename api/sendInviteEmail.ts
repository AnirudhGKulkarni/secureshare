export default async function handler(req: any, res: any) {
  // CORS headers for browser requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const { to, name, inviteLink, tempPassword } = (req.body as any) || {};
  if (!to || !inviteLink) return res.status(400).json({ error: "Missing fields: 'to' and 'inviteLink'" });

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "RESEND_API_KEY missing" });

    const html = `
      <p>Hi ${name || "there"},</p>
      ${tempPassword ? `<p>Temporary password: <b>${tempPassword}</b></p>` : ""}
      <p>Your secure pricing invite: <a href="${inviteLink}">${inviteLink}</a></p>
      <p>This link may expire or be revoked.</p>
    `;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "superadmin@trustnshare.com",
        to,
        subject: "TrustNShare Admin Access & Pricing Invite",
        html,
      }),
    });
    if (!r.ok) {
      const details = await r.text();
      return res.status(502).json({ error: "Email provider failed", details });
    }
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: "Send failed", details: e?.message ?? String(e) });
  }
}
