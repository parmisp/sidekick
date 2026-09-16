/* eslint-disable @next/next/no-img-element -- user uploads + local SVG placeholders, no next/image optimisation needed for the demo */

/** Text-only prompts render as a plain soft-green card; prompts with an image put the image on top and the answer below. */
export function PromptCard({
  question,
  answer,
  imageUrl,
  action,
}: {
  question: string;
  answer: string;
  imageUrl?: string | null;
  action?: React.ReactNode;
}) {
  if (imageUrl) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-surface shadow-card">
        <img src={imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
        <div className="px-5 pt-4 pb-5">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{question}</p>
          <p className="mt-1.5 font-serif text-xl leading-snug text-ink">{answer}</p>
        </div>
        {action && <div className="absolute right-3 bottom-3">{action}</div>}
      </div>
    );
  }
  return (
    <div className="relative rounded-3xl bg-green-soft px-5 pt-5 pb-6">
      <p className="text-xs font-semibold tracking-wide text-green uppercase">{question}</p>
      <p className="mt-2 pr-8 font-serif text-2xl leading-snug text-ink">{answer}</p>
      {action && <div className="absolute right-3 bottom-3">{action}</div>}
    </div>
  );
}
