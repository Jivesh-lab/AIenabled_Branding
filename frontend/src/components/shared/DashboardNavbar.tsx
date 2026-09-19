"use client";

/**
 * DashboardNavbar
 * Shared top header for all authenticated role shells. Sticky, 60px tall.
 *
 * Structure:
 *   LEFT:   mobile menu trigger (mobile only) - brand (mobile only, the sidebar
 *           owns the brand on desktop) - workspace label
 *   CENTER: global search
 *   RIGHT:  + New Idea - Help - Notifications - Profile
 *
 * Ocean Royale tokens: bg-white - border-line - text-ink - text-muted-ink
 *                       primary: bg-brand / hover:bg-brand-hover
 *
 * TODO: wire notification count and profile menu actions during backend integration.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  User,
} from "lucide-react";

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
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
function GlobalSearch() {
  return (
    <div className="mx-4 hidden w-full max-w-[360px] md:flex lg:mx-6">
      <div className="group relative w-full">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-ink transition-colors group-focus-within:text-brand"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search projects, mentors, documents..."
          aria-label="Global search"
          className={cn(
            "h-9 w-full rounded-[8px] border border-line bg-canvas",
            "pl-9 pr-12 text-[13px] text-ink placeholder:text-muted-ink",
            "focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20",
            "transition-colors duration-150"
          )}
        />
        <kbd
          aria-hidden="true"
          className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#94A3B8] lg:inline-flex"
        >
          &#8984;K
        </kbd>
      </div>
    </div>
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
        "flex size-9 shrink-0 items-center justify-center rounded-[8px]",
        "text-muted-ink transition-colors duration-150 hover:bg-[#F1F5F9] hover:text-ink",
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
        <Bell className="size-[18px]" strokeWidth={2} aria-hidden="true" />
      </IconButton>
      {capped > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-[#DC2626] px-1 text-[9px] font-bold leading-none text-white"
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
  { icon: User, label: "My Profile", getPath: (role: string) => `/workspace/${role.toLowerCase().replace(' ', '-')}/profile` },
  { icon: Settings, label: "Account Settings", getPath: (role: string) => `/workspace/${role.toLowerCase().replace(' ', '-')}/settings` },
  { icon: LogOut, label: "Sign Out", getPath: () => "/login" },
];

function ProfileDropdown({ user }: { user: NavbarUser }) {
  const [open, setOpen] = useState(false);
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
          "flex h-9 items-center gap-2 rounded-[8px] px-1.5",
          "transition-colors duration-150 hover:bg-[#F1F5F9]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        )}
      >
        <div
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-semibold leading-none text-white"
        >
          {user.initials}
        </div>

        <div className="hidden flex-col items-start text-left leading-none lg:flex">
          <span className="text-[13px] font-semibold leading-none text-ink">{user.name}</span>
          <span className="mt-1 text-[11px] leading-none text-muted-ink">{user.role}</span>
        </div>

        <ChevronDown
          className={cn(
            "hidden size-[14px] text-[#94A3B8] transition-transform duration-150 lg:block",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[8px] border border-line bg-white py-1 shadow-lg shadow-slate-200/60"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">{user.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-ink">{user.role}</p>
          </div>

          {MENU_ITEMS.map(({ icon: Icon, label, getPath }) => (
            <button
              key={label}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                if (label === "Sign Out") {
                  localStorage.removeItem("mockUserRole");
                }
                router.push(getPath(user.role));
              }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2 text-[13px] font-medium",
                "transition-colors duration-100",
                label === "Sign Out"
                  ? "text-[#DC2626] hover:bg-red-50"
                  : "text-[#334155] hover:bg-[#F1F5F9] hover:text-ink"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
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
}: DashboardNavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-2 border-b border-line bg-white px-4 lg:px-6">
      {/* LEFT */}
      <div className="flex min-w-0 items-center gap-3">
        <IconButton label="Open navigation" onClick={onMenuClick} className="-ml-1.5 md:hidden">
          <Menu className="size-5" aria-hidden="true" />
        </IconButton>

        {/* Brand appears here only on mobile; on desktop the sidebar owns it. */}
        <span className="text-[14px] font-semibold tracking-tight text-ink md:hidden">
          AAI&ndash;DBITIC
        </span>

        {workspaceLabel && (
          <span className="hidden truncate text-[13px] font-medium text-muted-ink md:inline-block">
            {workspaceLabel}
          </span>
        )}
      </div>

      {/* CENTER */}
      <GlobalSearch />

      {/* RIGHT */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className={cn(
            "hidden h-9 items-center gap-1.5 rounded-[8px] px-3.5 sm:inline-flex",
            "bg-brand text-[13px] font-semibold text-white",
            "transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
          )}
        >
          <Plus className="-ml-0.5 size-4" aria-hidden="true" />
          <span>New Idea</span>
        </button>

        <IconButton label="Help and support" className="hidden sm:flex">
          <CircleHelp className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        </IconButton>

        <NotificationButton count={notificationCount} />

        <ProfileDropdown user={user} />
      </div>
    </header>
  );
}
