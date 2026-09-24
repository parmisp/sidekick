import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, getPromptBank, getTagTaxonomy } from "@/lib/profiles";
import type { ProfileInput } from "@/app/actions/profile";
import { ProfileWizard } from "./ProfileWizard";
import { DEMO_EMAIL } from "@/lib/config";

export default async function SetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.phone) redirect("/login/phone");

  // Editing an existing profile re-uses the same wizard, pre-filled.
  const existing = user.profile_complete ? await getProfile(user.id) : null;
  const initial: ProfileInput | null = existing && {
    photos: [0, 1, 2, 3].map((i) => existing.photos.find((p) => p.position === i)?.url ?? null),
    name: existing.name,
    age: existing.age,
    major: existing.major,
    mainCampus: existing.mainCampus,
    degree: existing.degree,
    hometown: existing.hometown ?? "",
    residenceStatus: existing.residenceStatus,
    residenceId: user.residence_status === "residence" ? user.residence_id : null,
    gender: user.gender,
    genderFilterMode: user.gender_filter_mode,
    tagIds: existing.interests.map((t) => t.id),
    customTag: existing.customTag?.text ?? "",
    prompts: existing.prompts.map((p) => ({ promptId: p.promptId, answer: p.answerText, imageUrl: p.imageUrl })),
  };

  const [tags, prompts] = await Promise.all([getTagTaxonomy(), getPromptBank()]);
  return <ProfileWizard key={user.id} tags={tags} prompts={prompts} initial={initial} isDemo={user.email === DEMO_EMAIL} />;
}
