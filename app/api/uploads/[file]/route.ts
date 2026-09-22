import { readUpload } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export async function GET(_request: Request, ctx: RouteContext<"/api/uploads/[file]">) {
  const { file } = await ctx.params;
  const match = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.exec(file);
  if (!match) return new Response("Not found", { status: 404 });
  const body = await readUpload(file);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body, {
    headers: { "Content-Type": TYPES[match[1]], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
