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
    interest: highlighted ? "bg-mustard-soft text-accent-ink ring-1 ring-mustard" : "bg-green-soft text-ink",
    custom: "border border-dashed border-mustard bg-surface text-ink",
    meta: "bg-surface text-ink border border-line",
  }[variant];
  return <span className={`pill ${styles}`}>{children}</span>;
}
