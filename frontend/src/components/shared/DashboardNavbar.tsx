"use client";

import NotificationsMenu from "@/components/agentic/NotificationsMenu";
import CalendarDialog from "@/components/agentic/CalendarDialog";
import { DbitLogoMark } from "@/components/shared/DbitLogo";

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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ChevronDownIcon,
  CalendarDaysIcon,
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
  /** Opens the mobile navigation drawer. */
  onMenuClick?: () => void;
  allowedRole?: string;
  /** When given, the header shows a working search box and calls this on submit. Omitted = no search box. */
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  /** A role-specific search (e.g. the student portal's global search). Replaces the default box when given. */
  searchSlot?: React.ReactNode;
  /** True while the signed-in user is still being resolved, so no placeholder name or initials flash. */
  userLoading?: boolean;
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
// Profile dropdown
// ---------------------------------------------------------------------------
const MENU_ITEMS = [
  { icon: UserCircleIcon, label: "My Profile", getPath: (role: string) => `/workspace/${role.toLowerCase().replace(' ', '-')}/profile` },
  { icon: CalendarDaysIcon, label: "Calendar & reminders", getPath: () => "" },
  { icon: Cog6ToothIcon, label: "Account Settings", getPath: (role: string) => `/workspace/${role.toLowerCase().replace(' ', '-')}/settings` },
  { icon: ArrowRightOnRectangleIcon, label: "Sign Out", getPath: () => "/login" },
];

function ProfileDropdown({ user }: { user: NavbarUser }) {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
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
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand to-brand-hover text-[12px] font-bold leading-none text-white shadow-xs ring-2 ring-brand-soft"
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
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl shadow-slate-900/10 backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-100"
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
                if (label === "Calendar & reminders") {
                  setCalendarOpen(true);
                } else if (label === "Sign Out") {
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
      <CalendarDialog open={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile placeholder - same footprint as the profile button
// ---------------------------------------------------------------------------
function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading account" className="flex h-9 items-center gap-2 px-1.5">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="hidden flex-col gap-1.5 lg:flex">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2.5 w-14" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardNavbar
// ---------------------------------------------------------------------------
export default function DashboardNavbar({
  workspaceLabel,
  user,
  onMenuClick,
  allowedRole,
  onSearch,
  searchPlaceholder = "Search",
  searchSlot,
  userLoading = false,
}: DashboardNavbarProps) {
  const pathname = usePathname();

  // Show "+ New Idea" button strictly on the Student workspace
  const isNonStudentRole = Boolean(allowedRole && allowedRole !== "student");
  const isNonStudentPath = Boolean(
    pathname &&
      (pathname.startsWith("/workspace/faculty") ||
        pathname.startsWith("/workspace/admin") ||
        pathname.startsWith("/workspace/super-admin") ||
        pathname.startsWith("/workspace/mentor") ||
        pathname.startsWith("/workspace/industry") ||
        pathname.startsWith("/workspace/investor"))
  );
  const isStudent =
    !isNonStudentRole &&
    !isNonStudentPath &&
    (allowedRole === "student" || Boolean(pathname?.startsWith("/workspace/student")));

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white/95 backdrop-blur-md px-4 lg:px-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* LEFT */}
      <div className="flex shrink-0 items-center gap-3 lg:pr-2">
        <IconButton label="Open navigation" onClick={onMenuClick} className="-ml-1.5 md:hidden">
          <Bars3Icon className="size-5" aria-hidden="true" />
        </IconButton>

        {/* Brand appears here only on mobile; on desktop the sidebar owns it. */}
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/workspace" className="flex items-center gap-2">
            <DbitLogoMark size={28} idPrefix="nav-mobile-mark" />
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-bold tracking-tight text-ink">
                DBIT
              </span>
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-brand leading-none">
                Incubation Centre
              </span>
            </div>
          </Link>
        </div>

        {workspaceLabel && (
          <nav aria-label="Breadcrumb" className="hidden items-center gap-2 whitespace-nowrap text-[13px] lg:flex">
            <span className="text-muted-ink">DBIT</span>
            <span className="text-line" aria-hidden="true">/</span>
            <span className="font-medium text-ink">{workspaceLabel}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded border border-line/80 px-2 py-0.5 text-[11px] font-medium",
                workspaceLabel.includes("Student") && "bg-teal-50 text-teal-800 border-teal-200/60",
                workspaceLabel.includes("Mentor") && "bg-emerald-50 text-emerald-800 border-emerald-200/60",
                (workspaceLabel.includes("Investor") || workspaceLabel.includes("Partner")) && "bg-amber-50 text-amber-900 border-amber-200/60",
                workspaceLabel.includes("Admin") && "bg-indigo-50 text-indigo-900 border-indigo-200/60"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  workspaceLabel.includes("Student") && "bg-teal-600",
                  workspaceLabel.includes("Mentor") && "bg-emerald-600",
                  (workspaceLabel.includes("Investor") || workspaceLabel.includes("Partner")) && "bg-amber-600",
                  workspaceLabel.includes("Admin") && "bg-indigo-600"
                )}
                aria-hidden="true"
              />
              {workspaceLabel.includes("Student")
                ? "Founder"
                : workspaceLabel.includes("Mentor")
                ? "Advisor"
                : workspaceLabel.includes("Investor")
                ? "Capital"
                : "Governance"}
            </span>
          </nav>
        )}
      </div>

      {/* CENTER */}
      {searchSlot ? (
        <div className="flex min-w-0 flex-1 items-center">{searchSlot}</div>
      ) : (
        onSearch && <GlobalSearch onSearch={onSearch} placeholder={searchPlaceholder} />
      )}

      {/* RIGHT */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {isStudent && (
          <Link
            href="/workspace/student/submit"
            aria-label="Submit Proposal"
            className={cn(
              "mr-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3.5",
              "bg-brand text-[13px] font-semibold text-white shadow-sm shadow-brand/25",
              "transition-all duration-150 hover:bg-brand-hover hover:shadow-md hover:shadow-brand/30 active:scale-[0.98]",
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

        <NotificationsMenu />

        {userLoading ? <ProfileSkeleton /> : <ProfileDropdown user={user} />}
      </div>
    </header>
  );
}
