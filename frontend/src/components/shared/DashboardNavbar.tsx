"use client";

/**
 * DashboardNavbar
 * Shared top header for all authenticated role shells. Sticky, 60px tall.
 *
 * Structure:
 *   LEFT:   mobile menu trigger (mobile only) - brand (mobile only, the sidebar
 *           owns the brand on desktop) - "DBIT / workspace" breadcrumb (lg+)
 *   CENTER: global search (flexes; never squeezes the sides)
 *   RIGHT:  Submit Proposal (STUDENTS ONLY) - Help - Notifications - Profile
 *
 * Tokens: bg-white - border-line - text-ink - text-muted-ink
 *         primary: bg-brand / hover:bg-brand-hover
 * Icons: Heroicons (outline, 24px set).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface NavbarUser {
  name: string;
  role: string;
  /** Initials to display in avatar, e.g. "RP" */
  initials: string;
}

interface DashboardNavbarProps {
  workspaceLabel?: string;
  user: NavbarUser;
  notificationCount?: number;
  /** Opens the mobile navigation drawer. */
  onMenuClick?: () => void;
  allowedRole?: string;
  /** When given, the header shows a working search box and calls this on submit. Omitted = no search box. */
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

/** Compact label for the navbar: drops a trailing "(Student Founder)" style suffix. The dropdown keeps the full name. */
function compactName(name: string) {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
function GlobalSearch({ onSearch, placeholder }: { onSearch: (query: string) => void; placeholder: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  // Cmd/Ctrl+K focuses the box (the hint on the right is real).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className="hidden min-w-[160px] max-w-[480px] flex-1 md:flex"
      onSubmit={(e) => {
        e.preventDefault();
        const query = value.trim();
        if (query) onSearch(query);
      }}
    >
      <div className="group relative w-full">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-ink transition-colors group-focus-within:text-brand"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(
            "h-9 w-full rounded-lg border border-line bg-canvas",
            "pl-9 pr-3 text-[13px] lg:pr-16 text-ink placeholder:text-muted-ink",
            "focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20",
            "transition-colors duration-150"
          )}
        />
        <kbd
          aria-hidden="true"
          className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-ink lg:inline-flex"
        >
          Ctrl K
        </kbd>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Icon button
// ---------------------------------------------------------------------------
function IconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        "text-muted-ink transition-colors duration-150 hover:bg-nav-hover hover:text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        className
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
function NotificationButton({ count = 0 }: { count?: number }) {
  const capped = Math.min(count, 99);
  return (
    <div className="relative">
      <IconButton label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}>
        <BellIcon className="size-5" aria-hidden="true" />
      </IconButton>
      {capped > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-danger px-1 text-[9px] font-bold leading-none text-white"
        >
          {capped}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile dropdown
// ---------------------------------------------------------------------------
const MENU_ITEMS = [
  { icon: UserCircleIcon, label: "My Profile", getPath: (role: string) => `/workspace/${role.toLowerCase().replace(' ', '-')}/profile` },
  { icon: Cog6ToothIcon, label: "Account Settings", getPath: (role: string) => `/workspace/${role.toLowerCase().replace(' ', '-')}/settings` },
  { icon: ArrowRightOnRectangleIcon, label: "Sign Out", getPath: () => "/login" },
];

function ProfileDropdown({ user }: { user: NavbarUser }) {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Dismiss on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    function handlePointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg px-1.5",
          "transition-colors duration-150 hover:bg-nav-hover",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        )}
      >
        <div
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-semibold leading-none text-white"
        >
          {user.initials}
        </div>

        <div className="hidden min-w-0 max-w-[160px] flex-col items-start text-left leading-none lg:flex">
          <span className="w-full truncate text-[13px] font-semibold leading-none text-ink" title={user.name}>
            {compactName(user.name)}
          </span>
          <span className="mt-1 w-full truncate text-[11px] leading-none text-muted-ink">{user.role}</span>
        </div>

        <ChevronDownIcon
          className={cn(
            "hidden size-3.5 text-muted-ink transition-transform duration-150 lg:block",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg shadow-slate-200/60"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="break-words text-[13px] font-semibold text-ink">{user.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-ink">{user.role}</p>
          </div>

          {MENU_ITEMS.map(({ icon: Icon, label, getPath }) => (
            <button
              key={label}
              role="menuitem"
              type="button"
              disabled={label === "Sign Out" && isSigningOut}
              onClick={async () => {
                setOpen(false);
                if (label === "Sign Out") {
                  setIsSigningOut(true);
                  try {
                    await signOut({ redirect: false });
                    router.push("/login");
                    router.refresh();
                  } finally {
                    setIsSigningOut(false);
                  }
                } else {
                  router.push(getPath(user.role));
                }
              }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2 text-[13px] font-medium",
                "transition-colors duration-100",
                label === "Sign Out"
                  ? "text-danger hover:bg-danger/10"
                  : "text-icon hover:bg-nav-hover hover:text-ink"
              )}
            >
              <Icon className="size-[18px] shrink-0 opacity-80" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardNavbar
// ---------------------------------------------------------------------------
export default function DashboardNavbar({
  workspaceLabel,
  user,
  notificationCount = 0,
  onMenuClick,
  allowedRole,
  onSearch,
  searchPlaceholder = "Search",
}: DashboardNavbarProps) {
  const pathname = usePathname();

  // Show the "Submit Proposal" button only on the Student workspace
  const isStudent =
    allowedRole === "student" ||
    (pathname ? pathname.startsWith("/workspace/student") : false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 lg:px-6">
      {/* LEFT */}
      <div className="flex shrink-0 items-center gap-3 lg:pr-2">
        <IconButton label="Open navigation" onClick={onMenuClick} className="-ml-1.5 md:hidden">
          <Bars3Icon className="size-5" aria-hidden="true" />
        </IconButton>

        {/* Brand appears here only on mobile; on desktop the sidebar owns it. */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-deep">
            <svg viewBox="0 0 20 20" className="size-3.5 text-brand-cyan" fill="none" aria-hidden="true">
              <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 7L13 9V13L10 15L7 13V9L10 7Z" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-bold tracking-tight text-ink">
              DBIT
            </span>
            <span className="text-[10px] font-medium text-muted-ink leading-none">
              Incubation Centre
            </span>
          </div>
        </div>

        {workspaceLabel && (
          <nav aria-label="Breadcrumb" className="hidden items-center gap-2 whitespace-nowrap text-[13px] lg:flex">
            <span className="text-muted-ink">DBIT</span>
            <span className="text-line" aria-hidden="true">/</span>
            <span className="font-medium text-ink">{workspaceLabel}</span>
          </nav>
        )}
      </div>

      {/* CENTER */}
      {onSearch && <GlobalSearch onSearch={onSearch} placeholder={searchPlaceholder} />}

      {/* RIGHT */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {isStudent && (
          <Link
            href="/workspace/student/submit"
            aria-label="Submit Proposal"
            className={cn(
              "mr-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3.5",
              "bg-brand text-[13px] font-semibold text-white",
              "transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
            )}
          >
            <PlusIcon className="size-4 stroke-2" aria-hidden="true" />
            <span className="hidden sm:inline">Submit Proposal</span>
          </Link>
        )}

        <IconButton label="Help and support" className="hidden sm:flex">
          <QuestionMarkCircleIcon className="size-5" aria-hidden="true" />
        </IconButton>

        <NotificationButton count={notificationCount} />

        <ProfileDropdown user={user} />
      </div>
    </header>
  );
}
