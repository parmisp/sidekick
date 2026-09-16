import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, getPromptBank, getTagTaxonomy } from "@/lib/profiles";
import type { ProfileInput } from "@/app/actions/profile";
import { ProfileWizard } from "./ProfileWizard";

export default async function SetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.phone) redirect("/login/phone");

  // Editing an existing profile re-uses the same wizard, pre-filled.
  const existing = user.profile_complete ? getProfile(user.id) : null;
  const initial: ProfileInput | null = existing && {
    photos: [0, 1, 2, 3].map((i) => existing.photos.find((p) => p.position === i)?.url ?? null),
    name: existing.name,
    age: existing.age,
    major: existing.major,
    residenceStatus: existing.residenceStatus,
    gender: user.gender,
    genderFilterMode: user.gender_filter_mode,
    tagIds: existing.interests.map((t) => t.id),
    customTag: existing.customTag?.text ?? "",
    prompts: existing.prompts.map((p) => ({ promptId: p.promptId, answer: p.answerText, imageUrl: p.imageUrl })),
  };

  return <ProfileWizard tags={getTagTaxonomy()} prompts={getPromptBank()} initial={initial} />;
}
