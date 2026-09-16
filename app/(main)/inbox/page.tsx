/* eslint-disable @next/next/no-img-element -- user uploads + local SVG placeholders */
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { listInbox } from "@/lib/inbox";
import { timeAgo } from "@/lib/time";

export default async function InboxPage() {
  const user = await requireOnboardedUser();
  const items = listInbox(user);

  if (items.length === 0) {
    return (
      <div className="card mt-6 flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-5xl">💬</p>
        <h2 className="font-serif text-2xl font-semibold">No comments yet</h2>
        <p className="text-ink-soft">When someone comments on your photos, prompts or tag, it shows up here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="px-1 text-sm text-ink-soft">People who reached out. Reply to connect, or dismiss. They won&apos;t be told.</p>
      {items.map((item) => (
        <Link key={item.id} href={`/inbox/${item.id}`} className="card flex gap-3 p-4 transition hover:shadow-lg active:scale-[0.99]">
          <div className="relative shrink-0">
            {item.authorPhoto && <img src={item.authorPhoto} alt="" className="size-14 rounded-full object-cover" />}
            {!item.isRead && <span className="absolute top-0 right-0 size-3.5 rounded-full border-2 border-surface bg-accent" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className={`font-serif text-lg ${item.isRead ? "font-medium" : "font-semibold"}`}>{item.authorName.split(" ")[0]}</p>
              <span className="shrink-0 text-xs text-ink-soft">{timeAgo(item.createdAt)}</span>
            </div>
            <p className="line-clamp-2 text-[15px] text-ink">&ldquo;{item.text}&rdquo;</p>
            <div className="mt-2 flex items-center gap-2">
              {item.targetImage && <img src={item.targetImage} alt="" className="size-7 rounded-lg object-cover" />}
              <p className="truncate text-xs text-ink-soft">
                on <span className="font-semibold text-green">{item.targetType === "prompt" ? `“${item.targetLabel}”` : item.targetLabel}</span>
                {item.targetType === "custom_tag" && item.targetPreview && <> &ldquo;{item.targetPreview}&rdquo;</>}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
