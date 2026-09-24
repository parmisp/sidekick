"use client";

import { useState, useTransition } from "react";
import { restartDemo } from "@/app/actions/auth";

export function RestartDemo({ disabled = false }: { disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="rounded-2xl bg-green-soft p-4 text-sm">
      <p className="text-ink-soft">Trying a different profile? Start over with blank answers. Your current demo profile will be cleared.</p>
      <button type="button" className="mt-2 font-semibold text-green underline disabled:opacity-50" disabled={pending || disabled} onClick={() => {
        setError(null);
        startTransition(async () => {
          const result = await restartDemo();
          if (!result.ok) setError(result.error);
        });
      }}>
        {pending ? "Starting over…" : "Start demo over"}
      </button>
      {error && <p role="alert" className="mt-2 text-danger">{error}</p>}
    </div>
  );
}
