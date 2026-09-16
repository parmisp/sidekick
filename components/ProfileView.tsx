/* eslint-disable @next/next/no-img-element -- user uploads + local SVG placeholders */
import type { CommentTargetType, Profile } from "@/lib/types";
import { CommentIcon } from "./icons";
import { PromptCard } from "./PromptCard";
import { TagPill } from "./TagPill";

export type CommentTarget = { type: CommentTargetType; id: string; label: string; preview?: string };

/**
 * Full profile, Hinge-style: hero photo, then prompts interleaved with the
 * remaining photos. Pass `onComment` to show comment buttons on photos,
 * prompts and the custom tag (Discover deck only).
 */
export function ProfileView({
  profile,
  sharedTagIds = [],
  onComment,
}: {
  profile: Profile;
  sharedTagIds?: number[];
  onComment?: (target: CommentTarget) => void;
}) {
  const [hero, ...restPhotos] = profile.photos;
  const shared = new Set(sharedTagIds);

  const commentButton = (target: CommentTarget) =>
    onComment ? (
      <button
        type="button"
        onClick={() => onComment(target)}
        aria-label={`Comment on ${target.label}`}
        className="grid size-11 place-items-center rounded-full bg-surface text-accent shadow-card transition hover:scale-105 active:scale-95"
      >
        <CommentIcon />
      </button>
    ) : null;

  const photoBlock = (photo: Profile["photos"][number], index: number) => (
    <div key={photo.id} className="relative overflow-hidden rounded-3xl shadow-card">
      <img src={photo.url} alt={`${profile.name} photo ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
      <div className="absolute right-3 bottom-3">
        {commentButton({ type: "photo", id: photo.id, label: `${profile.name}'s photo`, preview: photo.url })}
      </div>
    </div>
  );

  const blocks: React.ReactNode[] = [];
  profile.prompts.forEach((p, i) => {
    blocks.push(
      <PromptCard
        key={p.id}
        question={p.question}
        answer={p.answerText}
        imageUrl={p.imageUrl}
        action={commentButton({ type: "prompt", id: p.id, label: `"${p.question}"`, preview: p.answerText })}
      />,
    );
    if (restPhotos[i]) blocks.push(photoBlock(restPhotos[i], i + 1));
  });

  return (
    <div className="flex flex-col gap-4">
      {hero && (
        <div className="relative overflow-hidden rounded-3xl shadow-card">
          <img src={hero.url} alt={profile.name} className="aspect-[4/5] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent px-5 pt-16 pb-5 text-white">
            <h2 className="font-serif text-4xl font-semibold">
              {profile.name.split(" ")[0]}, <span className="font-normal">{profile.age}</span>
            </h2>
            <p className="mt-1 text-[15px] text-white/90">{profile.major}</p>
          </div>
          <div className="absolute top-3 right-3">
            {commentButton({ type: "photo", id: hero.id, label: `${profile.name}'s photo`, preview: hero.url })}
          </div>
        </div>
      )}

      <div className="card flex flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          <TagPill variant="meta">🎓 {profile.major}</TagPill>
          {profile.residenceStatus && (
            <TagPill variant="meta">{profile.residenceStatus === "residence" ? "🏠 Lives in residence" : "🚌 Commuter"}</TagPill>
          )}
        </div>
        <p className="text-xs font-semibold tracking-wide text-green uppercase">Into</p>
        <div className="flex flex-wrap gap-2">
          {profile.interests.map((t) => (
            <TagPill key={t.id} highlighted={shared.has(t.id)}>
              {t.emoji} {t.name}
            </TagPill>
          ))}
        </div>
        {shared.size > 0 && (
          <p className="text-xs text-ink-soft">
            <span className="mr-1 inline-block size-2 rounded-full bg-mustard" /> {shared.size} shared with you
          </p>
        )}
        {profile.customTag && (
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-green uppercase">In their own words</p>
              <TagPill variant="custom">✨ {profile.customTag.text}</TagPill>
            </div>
            {commentButton({ type: "custom_tag", id: profile.customTag.id, label: `their tag "${profile.customTag.text}"`, preview: profile.customTag.text })}
          </div>
        )}
      </div>

      {blocks}
      {restPhotos.slice(profile.prompts.length).map((p, i) => photoBlock(p, profile.prompts.length + i + 1))}
    </div>
  );
}
