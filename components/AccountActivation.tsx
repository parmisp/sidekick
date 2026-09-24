"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setAccountActive } from "@/app/actions/settings";

export function AccountActivation({ active }: { active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl font-semibold">Account active</h2>
        <button type="button" role="switch" aria-checked={active} aria-label="Account active" disabled={pending}
          className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition disabled:opacity-50 ${active ? "justify-end bg-accent" : "justify-start bg-ink-soft"}`}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                const result = await setAccountActive(!active);
                if (!result.ok) { setError(result.error); return; }
                router.replace(active ? "/deactivated" : "/discover");
                router.refresh();
              } catch { setError("Couldn’t update your account. Please try again."); }
            });
          }}>
          <span className="size-6 rounded-full bg-white shadow-sm" />
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{pending ? "Updating…" : active
        ? "Need a break? Switch this off to hide your profile and pause browsing and chats. Your profile and friendships will be kept."
        : "Your account is deactivated. Switch this on to make your profile visible and meet people again."}</p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
