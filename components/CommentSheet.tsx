"use client";
/* eslint-disable @next/next/no-img-element -- user uploads + local SVG placeholders */

import { useState, useTransition } from "react";
import { addComment } from "@/app/actions/comments";
import { COMMENT_MAX } from "@/lib/config";
import { SendIcon, XIcon } from "./icons";
import type { CommentTarget } from "./ProfileView";

export function CommentSheet({
  target,
  targetUserId,
  targetName,
  onClose,
  onSent,
}: {
  target: CommentTarget;
  targetUserId: string;
  targetName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isPromptReply = target.type === "prompt";

  const send = () =>
    startTransition(async () => {
      setError(null);
      try {
        const res = await addComment(targetUserId, target.type, target.id, text);
        if (res.ok) onSent();
        else setError(res.error);
      } catch {
        setError("Couldn't send your message. Please try again.");
      }
    });

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-frame/50" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-[28px] bg-surface px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${isPromptReply ? "Reply to prompt" : "Comment on"} ${target.label}`}
        aria-modal="true"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-green uppercase">{isPromptReply ? `Reply to ${targetName.split(" ")[0]}'s prompt` : "Commenting on"}</p>
            <p className="font-serif text-lg leading-snug">{target.label}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-green-soft" aria-label="Close">
            <XIcon />
          </button>
        </div>
        {target.type === "photo" && target.preview ? (
          <img src={target.preview} alt="" className="mt-3 h-28 w-24 rounded-2xl object-cover" />
        ) : target.preview ? (
          <p className="mt-3 rounded-2xl bg-green-soft px-4 py-3 font-serif text-ink">{target.preview}</p>
        ) : null}
        <p className="mt-3 text-sm text-ink-soft">
          {targetName.split(" ")[0]} will see this in their inbox. If they reply, you become friends and can chat — no swipe needed.
        </p>
        <div className="mt-3 flex items-end gap-2">
          <textarea
            autoFocus
            rows={2}
            maxLength={COMMENT_MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isPromptReply ? "Reply to their answer or ask a question…" : "Say something friendly…"}
            aria-label={isPromptReply ? "Your prompt reply" : "Your comment"}
            disabled={pending}
            className="field resize-none"
          />
          <button
            type="button"
            className="btn-primary size-12 shrink-0 px-0"
            onClick={send}
            disabled={pending || !text.trim()}
            aria-label={isPromptReply ? "Send prompt reply" : "Send comment"}
          >
            <SendIcon />
          </button>
        </div>
        <div className="mt-1 flex justify-between text-xs">
          <span className="text-danger">{error}</span>
          <span className="text-ink-soft">
            {text.length}/{COMMENT_MAX}
          </span>
        </div>
      </div>
    </div>
  );
}
