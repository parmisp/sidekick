import { logout } from "@/app/actions/auth";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BlockPhoneForm, DemoTools, GenderFilterSetting } from "./SettingsForms";

export default async function SettingsPage() {
  const user = await requireOnboardedUser();
  const { n: cooldowns } = db()
    .prepare("SELECT COUNT(*) AS n FROM pass_states WHERE swiper_id = ? AND state = 'cooldown_pending'")
    .get(user.id) as { n: number };

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="px-1 font-serif text-3xl font-semibold">Settings</h1>

      <section className="card p-5">
        <h2 className="font-serif text-xl font-semibold">Who you see</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">Applies to Discover. People who chose &ldquo;same gender&rdquo; are only shown to matching users too.</p>
        <GenderFilterSetting initial={user.gender_filter_mode} canUseSameGender={user.gender !== "rather_not_say"} />
      </section>

      <section className="card p-5">
        <h2 className="font-serif text-xl font-semibold">Block a phone number</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">
          Keep someone you know off your radar. We never tell you whether a number is on Sidequest, and they&apos;re never told either.
        </p>
        <BlockPhoneForm />
      </section>

      <DemoTools cooldowns={cooldowns} />

      <section className="card flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Signed in as</p>
          <p className="truncate text-sm">{user.email}</p>
        </div>
        <form action={logout}>
          <button className="btn-secondary">Log out</button>
        </form>
      </section>
    </div>
  );
}
