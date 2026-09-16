import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { newId, UPLOAD_DIR } from "@/lib/db";

// DEMO: images are written to data/uploads on the local disk and served by
// /api/uploads/[file]. Before launch: use real object storage + CDN, strip EXIF
// (location!) metadata, and run image moderation before anything is visible.
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext) return Response.json({ error: "Use a JPG, PNG, WebP or GIF image." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "That image is too large (max 8MB)." }, { status: 400 });

  const name = `${newId()}.${ext}`;
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/api/uploads/${name}` });
}
