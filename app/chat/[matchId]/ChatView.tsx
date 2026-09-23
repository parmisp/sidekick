"use client";
/* eslint-disable @next/next/no-img-element -- user uploads + local SVG placeholders */

import { useCallback, useEffect, useRef, useState } from "react";
import { SendIcon } from "@/components/icons";
import { MESSAGE_MAX } from "@/lib/config";
import type { ChatMessage } from "@/lib/matches";

const POLL_MS = 2000;

export function ChatView({
  matchId,
  viewerId,
  otherName,
  otherPhoto,
  createdAt,
  source,
  sourceComment,
  initialMessages,
}: {
  matchId: string;
  viewerId: string;
  otherName: string;
  otherPhoto: string | null;
  createdAt: number;
  source: "swipe" | "comment";
  sourceComment: { text: string; authorIsMe: boolean } | null;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const lastAt = useRef(initialMessages.at(-1)?.createdAt ?? 0);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev, ...incoming.filter((m) => !seen.has(m.id))].sort((a, b) => a.createdAt - b.createdAt);
      lastAt.current = next.at(-1)?.createdAt ?? lastAt.current;
      return next;
    });
  }, []);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        // "after - 1" + id de-duplication so same-millisecond messages are never skipped.
        const res = await fetch(`/api/chat/${matchId}?after=${lastAt.current - 1}`, { cache: "no-store" });
        if (res.ok && !stopped) merge(((await res.json()) as { messages: ChatMessage[] }).messages);
      } catch {
        // offline: try again next tick
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [matchId, merge]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setError(null);
    const res = await fetch(`/api/chat/${matchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const body = (await res.json()) as { message?: ChatMessage; error?: string };
    if (body.message) merge([body.message]);
    else {
      setDraft(text);
      setError(body.error ?? "Couldn't send. Try again.");
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto mb-6 flex max-w-xs flex-col items-center gap-2 rounded-3xl bg-green-soft px-5 py-5 text-center">
          {otherPhoto && <img src={otherPhoto} alt="" className="size-16 rounded-full object-cover ring-4 ring-surface" />}
          <p className="font-serif text-xl font-semibold text-green">You and {otherName} are now friends</p>
          <p className="text-xs text-ink-soft">
            {source === "comment" ? "Connected through a comment" : "You both swiped Friend"} ·{" "}
            {new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
          {sourceComment && (
            <p className="mt-1 rounded-2xl bg-surface px-3 py-2 text-sm text-ink">
              <span className="text-ink-soft">{sourceComment.authorIsMe ? "You commented: " : `${otherName} commented: `}</span>
              &ldquo;{sourceComment.text}&rdquo;
            </p>
          )}
          {messages.length === 0 && <p className="mt-1 text-sm text-ink-soft">Break the ice. Ask about something on their profile.</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          {messages.map((m, i) => {
            const mine = m.senderId === viewerId;
            const grouped = messages[i - 1]?.senderId === m.senderId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "" : "mt-2"}`}>
                <p
                  className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug break-words whitespace-pre-wrap ${
                    mine ? "rounded-br-lg bg-accent text-white" : "rounded-bl-lg bg-surface text-ink shadow-card"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            );
          })}
        </div>
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="border-t border-line bg-surface px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <div className="flex items-center gap-2">
          <input
            className="field rounded-full"
            value={draft}
            maxLength={MESSAGE_MAX}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${otherName}…`}
            autoFocus
          />
          <button className="btn-primary size-12 shrink-0 px-0" disabled={!draft.trim()} aria-label="Send">
            <SendIcon />
          </button>
        </div>
      </form>
    </>
  );
}
