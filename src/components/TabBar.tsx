"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RESET_PATH } from "@/lib/app";

const TABS = [
  { href: "/", label: "Sheet", icon: SheetIcon },
  { href: "/order", label: "Order", icon: CartIcon },
  { href: "/summary", label: "Summary", icon: SummaryIcon },
  { href: "/history", label: "History", icon: ClockIcon },
  { href: "/compare", label: "Compare", icon: CompareIcon },
  { href: "/notes", label: "Notes", icon: NoteIcon },
] as const;

export function TabBar() {
  const pathname = usePathname();

  // Every tab leads somewhere that needs an account, and the one person who
  // sees the reset screen hasn't got into theirs yet.
  if (pathname === RESET_PATH) return null;

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Sections"
    >
      <ul className="mx-auto flex max-w-3xl">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors [@media(max-height:480px)]:gap-0 [@media(max-height:480px)]:py-1.5 ${
                  active ? "text-accent" : "text-faint hover:text-muted"
                }`}
              >
                <Icon />
                {/*
                  On a landscape phone the bar was taking roughly a fifth of the
                  screen height. Dropping to icons only below 480px tall gives
                  that back where it is scarcest.

                  sr-only rather than hidden: the icon is aria-hidden, so
                  removing this text outright would leave the link with no
                  accessible name at all. This way it keeps one and still takes
                  no space.
                */}
                <span className="[@media(max-height:480px)]:sr-only">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function SheetIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 9v12" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h3l2.6 12.4a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6" />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M4 5h16M4 12h16M4 19h10" />
      <path d="M17 17.5 18.6 19l2.9-3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 1.9" />
    </svg>
  );
}

/** Two bars on a shared scale — the picture the page actually draws. */
function CompareIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M4 8h11M4 16h16" />
      <circle cx="17" cy="8" r="1.6" />
      <circle cx="7" cy="16" r="1.6" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v6h6M9 13h6M9 17h4" />
    </svg>
  );
}
