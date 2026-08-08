"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

/**
 * Routes that lay out across the full width on desktop. Everything else is
 * long-form (forms, a recipe, a shopping list) and stays at a readable measure
 * rather than stretching to the window.
 */
function isWideRoute(pathname: string): boolean {
  return pathname === "/app/planner" || pathname === "/app/recipes";
}

/** Centres app content, widening only where the page has a grid to fill. */
export function AppContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      className={clsx(
        "mx-auto min-h-dvh w-full pb-20",
        isWideRoute(pathname) ? "max-w-2xl lg:max-w-7xl" : "max-w-2xl",
      )}
    >
      {children}
    </div>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const items: NavItem[] = [
  {
    href: "/app",
    label: "Home",
    icon: (
      <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />
    ),
  },
  {
    href: "/app/planner",
    label: "Planner",
    icon: (
      <path d="M4 5h16v16H4zM4 9h16M8 3v4M16 3v4M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
    ),
  },
  {
    href: "/app/recipes",
    label: "Recipes",
    icon: <path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM8 8h8M8 12h8M8 16h5" />,
  },
  {
    href: "/app/ideas",
    label: "Ideas",
    icon: (
      <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.4.3.6.8.6 1.3v.3h5.8v-.3c0-.5.2-1 .6-1.3A6 6 0 0012 3z" />
    ),
  },
  {
    href: "/app/shopping",
    label: "Shopping",
    icon: (
      <path d="M4 5h2l2 12h9l2-8H7M9 21a1 1 0 100-2 1 1 0 000 2zM17 21a1 1 0 100-2 1 1 0 000 2z" />
    ),
  },
  {
    href: "/app/settings",
    label: "Settings",
    icon: (
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 00-1.7-1l-.3-2.5H9.4l-.3 2.5a7 7 0 00-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 000 2l-2 1.5 2 3.4 2.3-1a7 7 0 001.7 1l.3 2.5h5.2l.3-2.5a7 7 0 001.7-1l2.3 1 2-3.4-2-1.5a7 7 0 00.1-1z" />
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * The tab icon, swapped for a spinner while its own navigation is in flight.
 * useLinkStatus only reports the enclosing Link, so this has to be a child of
 * it — that's what makes the feedback instant on tap rather than waiting for
 * the new route to start streaming.
 */
function NavIcon({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 animate-spin motion-reduce:animate-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" className="opacity-25" />
        <path d="M21 12a9 9 0 0 0-9-9" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-[#0b1310]/90">
      <ul className="mx-auto flex max-w-2xl">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                  active
                    ? "text-brand-600 dark:text-brand-300"
                    : "text-black/50 dark:text-white/50",
                )}
              >
                <NavIcon>{item.icon}</NavIcon>
                {/* Six tabs leaves ~53px per cell on a small phone — keep the
                    label on one line rather than letting it wrap the row. */}
                <span className="w-full truncate px-0.5 text-center">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
