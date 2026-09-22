/* eslint-disable @next/next/no-img-element -- user uploads + local SVG placeholders */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "@/components/icons";
import { ProfileView } from "@/components/ProfileView";
import { requireOnboardedUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { getInboxItem } from "@/lib/inbox";
import { getProfile, getUserTagIds } from "@/lib/profiles";
import { timeAgo } from "@/lib/time";
import { InboxActions } from "./InboxActions";

export default async function InboxItemPage({ params }: PageProps<"/inbox/[commentId]">) {
  const { commentId } = await params;
  const user = await requireOnboardedUser();
  const item = await getInboxItem(user, commentId);
  const author = item && (await getProfile(item.authorId));
  if (!item || !author) notFound();

  if (!item.isRead) await run("UPDATE comments SET is_read = 1 WHERE id = ?", [item.id]);

  const viewerTags = new Set(await getUserTagIds(user.id));
  const first = item.authorName.split(" ")[0];

  return (
    <div className="flex flex-col gap-4 pt-1">
      <Link href="/inbox" className="flex w-fit items-center gap-1 rounded-full pr-3 text-sm font-semibold text-ink-soft hover:text-ink">
        <ChevronLeft className="size-5" /> Inbox
      </Link>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 pt-5">
          {item.authorPhoto && <img src={item.authorPhoto} alt="" className="size-10 rounded-full object-cover" />}
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{first}</span> commented on {item.targetType === "prompt" ? "your prompt" : item.targetLabel}{" "}
            · {timeAgo(item.createdAt)}
          </p>
        </div>
        <div className="mx-5 mt-3 flex gap-3 rounded-2xl bg-green-soft p-3">
          {item.targetImage && <img src={item.targetImage} alt="" className="h-20 w-16 shrink-0 rounded-xl object-cover" />}
          <div className="min-w-0">
            {item.targetType === "prompt" && <p className="text-[11px] font-semibold tracking-wide text-green uppercase">{item.targetLabel}</p>}
            {item.targetPreview && <p className="font-serif text-ink">{item.targetPreview}</p>}
            {!item.targetPreview && !item.targetImage && <p className="text-sm text-ink-soft">Content you&apos;ve since changed</p>}
          </div>
        </div>
        <p className="px-5 pt-4 pb-5 font-serif text-2xl leading-snug">&ldquo;{item.text}&rdquo;</p>
      </section>

      <h2 className="px-1 pt-2 text-xs font-semibold tracking-wide text-green uppercase">{first}&apos;s profile</h2>
      <ProfileView profile={author} sharedTagIds={author.interests.filter((t) => viewerTags.has(t.id)).map((t) => t.id)} />

      <div className="h-20" />
      <InboxActions commentId={item.id} name={first} />
    </div>
  );
}
