export function DemoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-mustard bg-mustard-soft px-4 py-3 text-sm text-ink">
      <span className="mr-1.5 rounded-full bg-mustard px-2 py-0.5 text-[11px] font-bold tracking-wide text-ink uppercase">
        Demo mode
      </span>
      {children}
    </div>
  );
}
