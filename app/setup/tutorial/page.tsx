import Link from "next/link";
import { CheckIcon, CommentIcon, UserIcon, XIcon } from "@/components/icons";
import { requireOnboardedUser } from "@/lib/auth";

const tips = [
  { Icon: CheckIcon, title: "Tap ✓ to be friends", text: "Like their vibe? Tap Friend. If they choose you too, you’re friends and can chat.", style: "bg-accent text-white" },
  { Icon: UserIcon, title: "Get to know their profile", text: "Scroll down on their profile to see their photos, interests and prompt answers.", style: "bg-green-soft text-green" },
  { Icon: XIcon, title: "Tap X to pass", text: "Not your person? Tap X to see someone else. They won’t be notified.", style: "border border-line bg-surface text-ink-soft" },
  { Icon: CommentIcon, title: "Reply to a prompt", text: "Tap Reply to prompt to start a conversation. If they reply back, you become friends — no mutual swipe needed.", style: "bg-green-soft text-green" },
];

export default async function DiscoverTutorialPage() {
  await requireOnboardedUser();
  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <p className="text-xs font-semibold tracking-wide text-green uppercase">A quick hello to Sidekick</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Here’s how to find your people.</h1>
      <p className="mt-2 text-sm text-ink-soft">Four little things, then you’re ready.</p>
      <ul className="my-7 flex flex-col gap-5">
        {tips.map(({ Icon, title, text, style }) => (
          <li key={title} className="flex items-start gap-4">
            <span className={`grid size-11 shrink-0 place-items-center rounded-full ${style}`}><Icon className="size-5" /></span>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/discover" className="btn-primary mt-auto w-full">Got it — let’s go!</Link>
    </main>
  );
}
