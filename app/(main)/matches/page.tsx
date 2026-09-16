/* eslint-disable @next/next/no-img-element -- user uploads + local SVG placeholders */
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { listMatches } from "@/lib/matches";
import { timeAgo } from "@/lib/time";

export default async function MatchesPage() {
  const user = await requireOnboardedUser();
  const matches = listMatches(user);

  if (matches.length === 0) {
    return (
      <div className="card mt-6 flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-5xl">🤝</p>
        <h2 className="font-serif text-2xl font-semibold">No friends yet</h2>
        <p className="text-ink-soft">When you and someone both swipe Friend, or you reply to a comment, your chat shows up here.</p>
        <Link href="/discover" className="btn-primary mt-3">
          Start discovering
        </Link>
      </div>
    );
  }

  const fresh = matches.filter((m) => !m.lastMessage);
  const ongoing = matches.filter((m) => m.lastMessage);

  return (
    <div className="flex flex-col gap-5 pt-2">
      {fresh.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-green uppercase">New friends · say hi</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {fresh.map((m) => (
              <Link key={m.id} href={`/chat/${m.id}`} className="flex w-20 shrink-0 flex-col items-center gap-1.5">
                {m.otherPhoto && <img src={m.otherPhoto} alt="" className="size-20 rounded-full object-cover ring-4 ring-accent/70" />}
                <span className="truncate text-sm font-semibold">{m.otherName.split(" ")[0]}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {ongoing.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold tracking-wide text-green uppercase">Chats</h2>
          {ongoing.map((m) => (
            <Link key={m.id} href={`/chat/${m.id}`} className="card flex items-center gap-3 p-3 transition hover:shadow-lg">
              {m.otherPhoto && <img src={m.otherPhoto} alt="" className="size-14 rounded-full object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-serif text-lg font-semibold">{m.otherName.split(" ")[0]}</p>
                  <span className="text-xs text-ink-soft">{timeAgo(m.lastMessageAt!)}</span>
                </div>
                <p className={`truncate text-sm ${m.lastSenderIsMe ? "text-ink-soft" : "font-medium text-ink"}`}>
                  {m.lastSenderIsMe && "You: "}
                  {m.lastMessage}
                </p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
