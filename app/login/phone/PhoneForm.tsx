"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePhone } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";

export function PhoneForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await savePhone(phone);
      if (res.ok) router.push("/setup");
      else setError(res.error);
    });
  };

  return (
    <main className="flex flex-1 flex-col px-6 pt-16 pb-10">
      <Logo />
      <h1 className="mt-10 font-serif text-3xl font-semibold">What&apos;s your phone number?</h1>
      <p className="mt-3 text-ink-soft">
        It&apos;s never shown on your profile. We only use it so people you&apos;ve blocked by number can&apos;t find you — and so you can
        do the same.
      </p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <label>
          <span className="label">Phone number</span>
          <input
            className="field"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(416) 555-0123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
          />
        </label>
        {error && <p className="text-sm text-accent-ink">{error}</p>}
        <button className="btn-primary" disabled={pending || phone.replace(/\D/g, "").length < 8}>
          {pending ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
