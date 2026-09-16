import { getCurrentUser } from "@/lib/auth";
import { MESSAGE_MAX } from "@/lib/config";
import { db, newId } from "@/lib/db";
import { scheduleSeedReply } from "@/lib/demo";
import { getMatchForViewer, getMessages } from "@/lib/matches";

// DEMO: the chat client polls this endpoint every couple of seconds. Before launch,
// move to websockets/SSE, add message reporting, and moderate/abuse-check messages.

async function authorize(matchId: string) {
  const user = await getCurrentUser();
  if (!user?.profile_complete) return null;
  const match = getMatchForViewer(user, matchId);
  return match ? { user, match } : null;
}

export async function GET(request: Request, ctx: RouteContext<"/api/chat/[matchId]">) {
  const { matchId } = await ctx.params;
  const auth = await authorize(matchId);
  if (!auth) return Response.json({ error: "Not found" }, { status: 404 });
  const after = Number(new URL(request.url).searchParams.get("after")) || 0;
  return Response.json({ messages: getMessages(matchId, after) });
}

export async function POST(request: Request, ctx: RouteContext<"/api/chat/[matchId]">) {
  const { matchId } = await ctx.params;
  const auth = await authorize(matchId);
  if (!auth) return Response.json({ error: "Not found" }, { status: 404 });

  const { text } = (await request.json().catch(() => ({}))) as { text?: string };
  const body = (text ?? "").trim();
  if (!body || body.length > MESSAGE_MAX) return Response.json({ error: "Message must be 1–1000 characters." }, { status: 400 });

  const message = { id: newId(), senderId: auth.user.id, text: body, createdAt: Date.now() };
  db()
    .prepare("INSERT INTO messages (id, match_id, sender_id, text, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(message.id, matchId, message.senderId, message.text, message.createdAt);

  // DEMO: seed profiles auto-reply so a solo tester sees the chat come alive.
  if (auth.match.otherIsSeed) scheduleSeedReply(matchId, auth.match.otherId);

  return Response.json({ message });
}
