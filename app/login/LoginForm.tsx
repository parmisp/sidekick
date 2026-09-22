"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendCode, verifyCode } from "@/app/actions/auth";
import { DemoBanner } from "@/components/DemoBanner";
import { Logo } from "@/components/Logo";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await sendCode(email);
      if (res.ok) setStep("code");
      else setError(res.error);
    });
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await verifyCode(email, code);
      if (res.ok) router.push(res.next);
      else setError(res.error);
    });
  };

  return (
    <main className="flex flex-1 flex-col px-6 pt-16 pb-10">
      <Logo className="text-3xl" />
      <h1 className="mt-10 font-serif text-4xl leading-tight font-semibold">
        Find your people <span className="text-green italic">on campus.</span>
      </h1>
      <p className="mt-3 text-ink-soft">Friends, not dates. Swipe, comment, and start a conversation with someone who gets it.</p>

      {step === "email" ? (
        <form onSubmit={submitEmail} className="mt-10 flex flex-col gap-4">
          <label>
            <span className="label">University email</span>
            <input
              className="field"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-accent-ink">{error}</p>}
          <button className="btn-primary" disabled={pending || !email}>
            {pending ? "Sending…" : "Send code"}
          </button>
          <p className="text-center text-xs text-ink-soft">Only verified student emails can join Sidekick.</p>
        </form>
      ) : (
        <form onSubmit={submitCode} className="mt-10 flex flex-col gap-4">
          <DemoBanner>
            No email is sent. Use code <strong className="font-mono tracking-widest">000000</strong>.
          </DemoBanner>
          <label>
            <span className="label">Code sent to {email}</span>
            <input
              className="field text-center font-mono text-2xl tracking-[0.5em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </label>
          {error && <p className="text-sm text-accent-ink">{error}</p>}
          <button className="btn-primary" disabled={pending || code.length !== 6}>
            {pending ? "Checking…" : "Verify"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setStep("email")}>
            Use a different email
          </button>
        </form>
      )}
    </main>
  );
}
