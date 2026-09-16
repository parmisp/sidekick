/* eslint-disable @next/next/no-img-element -- user uploads + local SVG placeholders */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "@/components/icons";
import { requireOnboardedUser } from "@/lib/auth";
import { getMatchForViewer, getMessages } from "@/lib/matches";
import { getProfile } from "@/lib/profiles";
import { ChatView } from "./ChatView";

export default async function ChatPage({ params }: PageProps<"/chat/[matchId]">) {
  const { matchId } = await params;
  const user = await requireOnboardedUser();
  const match = getMatchForViewer(user, matchId);
  const other = match && getProfile(match.otherId);
  if (!match || !other) notFound();

  const first = other.name.split(" ")[0];
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-3">
        <Link href="/matches" className="grid size-10 place-items-center rounded-full hover:bg-green-soft" aria-label="Back to matches">
          <ChevronLeft />
        </Link>
        <Link href={`/people/${other.id}`} className="flex items-center gap-3">
          {other.photos[0] && <img src={other.photos[0].url} alt="" className="size-10 rounded-full object-cover" />}
          <div>
            <p className="font-serif text-lg leading-tight font-semibold">{first}</p>
            <p className="text-xs text-ink-soft">View profile</p>
          </div>
        </Link>
      </header>
      <ChatView
        matchId={match.id}
        viewerId={user.id}
        otherName={first}
        otherPhoto={other.photos[0]?.url ?? null}
        createdAt={match.createdAt}
        source={match.source}
        sourceComment={match.sourceComment}
        initialMessages={getMessages(match.id)}
      />
    </div>
  );
}
