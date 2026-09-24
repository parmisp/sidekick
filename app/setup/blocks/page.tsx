import { BlockPhoneForm } from "@/components/BlockPhoneForm";
import { Logo } from "@/components/Logo";
import { requireOnboardedUser } from "@/lib/auth";

export default async function BeforeDiscoverPage() {
  await requireOnboardedUser();
  return (
    <main className="flex flex-1 flex-col px-6 pt-10 pb-10">
      <Logo />
      <p className="mt-10 text-xs font-semibold tracking-wide text-green uppercase">Before you explore · optional</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight font-semibold">New friends.<br />Your comfort comes first.</h1>
      <p className="mt-4 leading-relaxed text-ink-soft">We get it — there might be someone you’d rather not run into here. Add their number below before you start meeting people.</p>
      <div className="my-6 rounded-3xl bg-green-soft p-5 text-sm leading-relaxed text-ink-soft">
        If they use that number on Sidekick, you won’t be shown to each other. They won’t be notified, and we won’t tell you whether they have an account.
      </div>
      <BlockPhoneForm onboarding />
    </main>
  );
}
