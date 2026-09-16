"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SettingsIcon, UserIcon } from "./icons";

const HOME_TABS = [
  { href: "/discover", label: "Discover" },
  { href: "/inbox", label: "Inbox" },
  { href: "/matches", label: "Matches" },
] as const;

export function TopTabs({ unreadInbox }: { unreadInbox: number }) {
  const pathname = usePathname();
  if (!HOME_TABS.some((t) => pathname.startsWith(t.href))) return null;
  return (
    <nav className="flex gap-1 rounded-full bg-surface p-1 shadow-card">
      {HOME_TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition ${
              active ? "bg-green-soft text-green" : "text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
            {t.href === "/inbox" && unreadInbox > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] leading-5 text-white">
                {unreadInbox}
              </span>
            )}
            {active && <span className="absolute bottom-0.5 h-0.5 w-6 rounded-full bg-green" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/discover", label: "Home", icon: HomeIcon, active: HOME_TABS.some((t) => pathname.startsWith(t.href)) },
    { href: "/profile", label: "Profile", icon: UserIcon, active: pathname.startsWith("/profile") },
    { href: "/settings", label: "Settings", icon: SettingsIcon, active: pathname.startsWith("/settings") },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 justify-around border-t border-line bg-surface/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
      {items.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={`flex w-20 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold ${
            active ? "text-green" : "text-ink-soft"
          }`}
        >
          <Icon className="size-6" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
