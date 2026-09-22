import { get as blobGet, put as blobPut, type BlobAccessType } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "./db";

// Uploaded images. Locally: files in ./data/uploads. Deployed: Vercel Blob (when
// BLOB_READ_WRITE_TOKEN is set). Either way the app stores and renders
// /api/uploads/<name>, and that route streams the bytes from wherever they live.
//
// DEMO: before launch add EXIF (location) stripping, image moderation, and
// deletion when a photo is replaced or an account is removed.

export const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

// A Blob store is either public or private, and writes must match. We don't know
// which the deployer created, so try private first and remember what worked.
let access: BlobAccessType | null = (process.env.BLOB_ACCESS as BlobAccessType | undefined) ?? null;
const blobPath = (name: string) => `uploads/${name}`;

export async function saveUpload(name: string, data: Buffer, contentType: string) {
  if (!USE_BLOB) {
    if (process.env.VERCEL) throw new Error("BLOB_READ_WRITE_TOKEN is not set (see README).");
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), data);
    return;
  }
  const attempts: BlobAccessType[] = access ? [access] : ["private", "public"];
  let lastError: unknown;
  for (const a of attempts) {
    try {
      await blobPut(blobPath(name), data, { access: a, contentType, addRandomSuffix: false });
      access = a;
      return;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export async function readUpload(name: string): Promise<BodyInit | null> {
  if (!USE_BLOB) {
    try {
      return new Uint8Array(await fs.readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name)));
    } catch {
      return null;
    }
  }
  for (const a of access ? [access] : (["private", "public"] as const)) {
    try {
      const result = await blobGet(blobPath(name), { access: a });
      if (result?.statusCode === 200) {
        access = a;
        return result.stream;
      }
      if (result === null) return null;
    } catch {
      // wrong access type for this store — try the other one
    }
  }
  return null;
}
