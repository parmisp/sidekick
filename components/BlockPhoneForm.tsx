"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { blockPhone } from "@/app/actions/settings";

export function BlockPhoneForm({ onboarding = false }: { onboarding?: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasBlocked, setHasBlocked] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || !phone.trim()) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await blockPhone(phone);
        if (result.ok) {
          setMessage(result.message);
          setHasBlocked(true);
          setPhone("");
        } else setError(result.error);
      } catch {
        setError("We couldn’t block that number. Please try again.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label>
          <span className="label">{hasBlocked ? "Add another number" : "Phone number to block"}</span>
          <input className="field" type="tel" inputMode="tel" autoComplete="off" placeholder="(416) 555-0123" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={pending} />
        </label>
        <button className="btn-primary" disabled={pending || !phone.trim()}>
          {pending ? "Blocking…" : "Block number"}
        </button>
        {message && <p role="status" className="rounded-2xl bg-green-soft px-4 py-3 text-sm text-green">{message}</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </form>
      {onboarding && (
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <button type="button" className={hasBlocked ? "btn-primary" : "btn-secondary"} disabled={pending} onClick={() => {
            router.push("/setup/tutorial");
            router.refresh();
          }}>
            {hasBlocked ? "Continue" : "Skip for now"}
          </button>
          <p className="text-center text-xs leading-relaxed text-ink-soft">You can always block more numbers in Settings.</p>
        </div>
      )}
    </div>
  );
}
