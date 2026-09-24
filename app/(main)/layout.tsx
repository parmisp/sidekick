import { Logo } from "@/components/Logo";
import { BottomNav, TopTabs } from "@/components/Nav";
import { requireOnboardedUser } from "@/lib/auth";
import { countUnreadInbox } from "@/lib/inbox";

export default async function MainLayout({ children }: LayoutProps<"/">) {
  const user = await requireOnboardedUser({ allowInactive: true });
  if (!user.is_active) return <main className="flex flex-1 flex-col px-5 py-8">{children}</main>;
  return (
    <>
      <header className="sticky top-0 z-20 flex flex-col gap-3 bg-bg/95 px-4 pt-4 pb-3 backdrop-blur">
        <Logo />
        <TopTabs unreadInbox={await countUnreadInbox(user)} />
      </header>
      <main className="flex flex-1 flex-col px-4 pb-28">{children}</main>
      <BottomNav />
    </>
  );
}
