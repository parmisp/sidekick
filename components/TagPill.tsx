export function TagPill({
  children,
  highlighted = false,
  variant = "interest",
}: {
  children: React.ReactNode;
  highlighted?: boolean;
  variant?: "interest" | "custom" | "meta";
}) {
  const styles = {
    interest: highlighted ? "bg-mustard text-ink ring-2 ring-mustard/40" : "bg-mustard-soft text-ink",
    custom: "border border-dashed border-mustard bg-surface text-ink",
    meta: "bg-surface text-ink border border-line",
  }[variant];
  return <span className={`pill ${styles}`}>{children}</span>;
}
