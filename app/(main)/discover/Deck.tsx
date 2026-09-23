"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { swipe } from "@/app/actions/swipe";
import { CommentSheet } from "@/components/CommentSheet";
import { WaveIcon, XIcon } from "@/components/icons";
import { ProfileView, type CommentTarget } from "@/components/ProfileView";
import type { DeckCard } from "@/lib/deck";

export function Deck({ cards }: { cards: DeckCard[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<"pass" | "friend" | null>(null);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const card = cards[index];

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const act = (direction: "pass" | "friend") => {
    if (!card || leaving) return;
    setLeaving(direction);
    startTransition(async () => {
      const [res] = await Promise.all([swipe(card.profile.id, direction), new Promise((r) => setTimeout(r, 260))]);
      if (res.ok && res.matchId) {
        router.push(`/chat/${res.matchId}`);
        return;
      }
      window.scrollTo({ top: 0 });
      setIndex((i) => i + 1);
      setLeaving(null);
    });
  };

  if (!card) {
    return (
      <div className="card mt-6 flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="text-5xl">🌿</p>
        <h2 className="font-serif text-2xl font-semibold">You&apos;re all caught up</h2>
        <p className="text-ink-soft">
          {cards.length === 0
            ? "Nobody new matches your settings right now. Check back soon, or widen your filter in Settings."
            : "That's everyone in this batch. Refresh for another round."}
        </p>
        <button type="button" className="btn-primary mt-2" onClick={() => router.refresh()}>
          Refresh deck
        </button>
      </div>
    );
  }

  const first = card.profile.name.split(" ")[0];

  return (
    <>
      <div
        className={`transition-all duration-300 ease-out ${
          leaving === "pass" ? "-translate-x-[120%] -rotate-6 opacity-0" : leaving === "friend" ? "translate-x-[120%] rotate-6 opacity-0" : ""
        }`}
      >
        {card.reappearance && (
          <p className="mb-3 rounded-2xl bg-mustard-soft px-4 py-2.5 text-sm text-ink">
            👀 <strong>Second look:</strong> you passed on {first} over 30 days ago. Pass again and they won&apos;t be shown again.
          </p>
        )}
        <ProfileView profile={card.profile} sharedTagIds={card.sharedTagIds} onComment={setCommentTarget} />
        <p className="mt-6 mb-24 text-center text-xs text-ink-soft">
          {cards.length - index - 1} more in this batch
        </p>
      </div>

      <div className="pointer-events-none fixed bottom-[84px] left-1/2 z-30 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => act("pass")}
          disabled={pending}
          aria-label={`Pass on ${first}`}
          className="pointer-events-auto grid size-16 place-items-center rounded-full border border-line bg-surface text-ink-soft shadow-card transition hover:text-ink active:scale-95"
        >
          <XIcon className="size-7" />
        </button>
        <button
          type="button"
          onClick={() => act("friend")}
          disabled={pending}
          aria-label={`Be friends with ${first}`}
          className="pointer-events-auto flex h-16 items-center gap-2 rounded-full bg-accent px-7 text-lg font-semibold text-white shadow-[0_10px_24px_rgb(15_118_110/0.40)] transition hover:brightness-105 active:scale-95"
        >
          <WaveIcon className="size-6" /> Friend
        </button>
      </div>

      {toast && (
        <div className="fixed top-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[448px] -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-card">
          {toast}
        </div>
      )}

      {commentTarget && (
        <CommentSheet
          target={commentTarget}
          targetUserId={card.profile.id}
          targetName={card.profile.name}
          onClose={() => setCommentTarget(null)}
          onSent={() => {
            setCommentTarget(null);
            setToast(`Comment sent. If ${first} replies, you'll be connected.`);
          }}
        />
      )}
    </>
  );
}
