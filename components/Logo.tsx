export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif text-2xl font-semibold tracking-tight text-ink ${className}`}>
      side<span className="text-accent">quest</span>
    </span>
  );
}
