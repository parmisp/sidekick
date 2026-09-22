import Link from "next/link";
import { ProfileView } from "@/components/ProfileView";
import { requireOnboardedUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";

export default async function MyProfilePage() {
  const user = await requireOnboardedUser();
  const profile = (await getProfile(user.id))!;
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Your profile</h1>
          <p className="text-sm text-ink-soft">This is how others see you.</p>
        </div>
        <Link href="/setup" className="btn-secondary px-4 py-2 text-sm">
          Edit
        </Link>
      </div>
      <ProfileView profile={profile} />
    </div>
  );
}
