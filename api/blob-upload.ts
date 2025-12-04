import { put } from "@vercel/blob";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    // Simple health check endpoint for local testing
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT, GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const path = (req.query.path as string) || "";
    const contentType = (req.headers["content-type"] as string) || "application/octet-stream";
    if (!path) {
      return res.status(400).json({ error: "Missing 'path' query parameter" });
    }

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      req.on("end", () => resolve());
      req.on("error", (err: unknown) => reject(err));
    });
    const buffer = Buffer.concat(chunks);

    const token =
      process.env.BLOB_READ_WRITE_TOKEN ||
      (typeof req.headers["x-blob-token"] === "string" ? (req.headers["x-blob-token"] as string) : undefined) ||
      (typeof req.headers["authorization"] === "string"
        ? (req.headers["authorization"] as string).replace(/^Bearer\s+/i, "")
        : undefined);

    const stored = await put(path, buffer, {
      access: "public",
      contentType,
      token,
    });

    return res.status(200).json({ url: stored.url });
  } catch (e: any) {
    console.error("blob-upload error:", e);
    return res.status(500).json({ error: e?.message ?? "Upload failed" });
  }
}
