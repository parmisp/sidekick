// Client-side helper: downscale an image in the browser, then upload it.
const MAX_EDGE = 1280;

async function downscale(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file; // keep animation
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
    );
  } catch {
    return file; // e.g. HEIC in a browser that can't decode it — let the server reject unsupported types
  }
}

export async function uploadImage(file: File): Promise<string> {
  const blob = await downscale(file);
  const form = new FormData();
  form.append("file", blob, file.name);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const body = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !body.url) throw new Error(body.error ?? "Upload failed");
  return body.url;
}
