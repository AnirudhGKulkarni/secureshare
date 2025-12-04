// Vercel Serverless Function to generate a signed upload URL for Vercel Blob
// POST /api/blob-upload-url -> { url: string }
import { generateUploadUrl } from "@vercel/blob";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { url } = await generateUploadUrl();
    return res.status(200).json({ url });
  } catch (e: any) {
    console.error("generateUploadUrl error:", e);
    return res.status(500).json({ error: e?.message ?? "Failed to create upload URL" });
  }
}
