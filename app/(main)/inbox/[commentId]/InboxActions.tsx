"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { dismissComment, replyToComment } from "@/app/actions/comments";

export function InboxActions({ commentId, name }: { commentId: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reply = () =>
    startTransition(async () => {
      const res = await replyToComment(commentId);
      if (res.ok) router.push(`/chat/${res.matchId}`);
      else setError(res.error);
    });

  const dismiss = () =>
    startTransition(async () => {
      await dismissComment(commentId);
      router.push("/inbox");
    });

  return (
    <div className="fixed bottom-[76px] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-6 pb-3">
      {error && <p className="mb-2 text-center text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        <button type="button" className="btn-secondary flex-1" onClick={dismiss} disabled={pending}>
          Dismiss
        </button>
        <button type="button" className="btn-primary flex-[2]" onClick={reply} disabled={pending}>
          Reply to {name}
        </button>
      </div>
    </div>
  );
}
