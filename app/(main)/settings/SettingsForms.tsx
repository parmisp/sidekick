"use client";

import { useState, useTransition } from "react";
import { demoFastForwardCooldowns, demoResetSwipes, updateGenderFilter } from "@/app/actions/settings";
import type { GenderFilterMode } from "@/lib/types";

export function GenderFilterSetting({ initial, canUseSameGender }: { initial: GenderFilterMode; canUseSameGender: boolean }) {
  const [mode, setMode] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (next: GenderFilterMode) => {
    const previous = mode;
    setMode(next);
    setError(null);
    startTransition(async () => {
      const res = await updateGenderFilter(next);
      if (!res.ok) {
        setMode(previous);
        setError(res.error);
      }
    });
  };

  const options: { value: GenderFilterMode; label: string }[] = [
    { value: "everyone", label: "Everyone" },
    { value: "same_gender", label: "Same gender" },
  ];
  return (
    <>
      <div className="flex gap-1 rounded-full border border-line bg-bg p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={pending || (o.value === "same_gender" && !canUseSameGender)}
            onClick={() => choose(o.value)}
            className={`flex-1 rounded-full px-3 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
              mode === o.value ? "bg-green text-white shadow-sm" : "text-ink-soft hover:bg-green-soft"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {!canUseSameGender && (
        <p className="mt-2 text-xs text-ink-soft">You chose &ldquo;rather not say&rdquo;, so the same-gender filter isn&apos;t available.</p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </>
  );
}

export function DemoTools({ cooldowns }: { cooldowns: number }) {
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-3xl border border-dashed border-mustard bg-mustard-soft p-5">
      <p className="text-[11px] font-bold tracking-wide text-accent-ink uppercase">Demo tools · not in the real app</p>
      <p className="mt-1 text-sm text-ink">
        Passed profiles come back once after 30 days. You have <strong>{cooldowns}</strong> in cooldown.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary px-4 py-2 text-sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await demoFastForwardCooldowns();
              if (res.ok) setNote(`Skipped ahead 30 days for ${res.count} passed profile${res.count === 1 ? "" : "s"}. They'll reappear in Discover.`);
            })
          }
        >
          ⏩ Skip ahead 30 days
        </button>
        <button
          type="button"
          className="btn-secondary px-4 py-2 text-sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await demoResetSwipes();
              setNote("Your swipes and passes were cleared. Matches and chats are kept.");
            })
          }
        >
          ↺ Reset my swipes
        </button>
      </div>
      {note && <p className="mt-3 text-sm text-ink">{note}</p>}
    </section>
  );
}
