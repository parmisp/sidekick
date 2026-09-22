import { getCurrentUser } from "@/lib/auth";
import { newId } from "@/lib/db";
import { saveUpload } from "@/lib/storage";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
// Vercel functions reject request bodies over 4.5MB; the client downscales photos well below this.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext) return Response.json({ error: "Use a JPG, PNG, WebP or GIF image." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "That image is too large (max 4MB)." }, { status: 400 });

  const name = `${newId()}.${ext}`;
  try {
    await saveUpload(name, Buffer.from(await file.arrayBuffer()), file.type);
  } catch (e) {
    console.error("Upload failed", e);
    return Response.json({ error: "Upload failed. Try again." }, { status: 500 });
  }
  return Response.json({ url: `/api/uploads/${name}` });
}
