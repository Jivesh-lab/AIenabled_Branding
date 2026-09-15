"use client";

/**
 * DashboardNavbar
 * Shared top navigation bar for all authenticated role dashboards.
 *
 * Structure:
 *   LEFT:   Logo & Wordmark · Current Workspace Label
 *   CENTER: Global search input
 *   RIGHT:  + New Idea (Primary) · Notifications · Help · Profile Dropdown
 *
 * Design tokens:
 *   bg: #FFFFFF · border-b: #E2E8F0 · text: #0F172A · muted: #64748B
 *   primary: #2563EB
 *
 * TODO: Wire notifications count, and profile dropdown to real state during backend integration.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Bell,
  Plus,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  User,
  CircleHelp,
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
}

// ---------------------------------------------------------------------------
// AAI-DBITIC Logo Component
// ---------------------------------------------------------------------------
function NavbarLogo({ workspaceLabel }: { workspaceLabel?: string }) {
  return (
    <div className="flex items-center gap-4 min-w-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-md bg-[#0B1F3A] shrink-0">
          <svg viewBox="0 0 20 20" className="size-4 text-blue-300" fill="none" aria-hidden="true">
            <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 7L13 9V13L10 15L7 13V9L10 7Z" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
        <span className="hidden sm:inline-block text-[15px] font-semibold tracking-tight text-slate-900 leading-none mt-0.5">
          AAI–DBITIC
        </span>
      </div>

      {/* Workspace Label */}
      {workspaceLabel && (
        <span className="hidden sm:inline-block text-[13px] font-medium text-slate-500 truncate mt-0.5 ml-2">
          {workspaceLabel}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search bar
// ---------------------------------------------------------------------------
function GlobalSearch() {
  return (
    <div className="flex-1 max-w-[340px] mx-4 lg:mx-8 hidden md:flex">
      <div className="relative w-full group">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-[16px] text-slate-500 pointer-events-none group-focus-within:text-blue-500 transition-colors"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search projects, mentors, documents..."
          aria-label="Global search"
          className={cn(
            "w-full h-[36px] rounded-[8px] border border-slate-200 bg-[#F8FAFC]",
            "pl-9 pr-12 text-[13px] text-slate-900 placeholder:text-slate-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 focus:bg-white",
            "transition-all duration-200"
          )}
        />
        <kbd
          aria-hidden="true"
          className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 select-none shadow-sm"
        >
          ⌘K
        </kbd>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icon button — shared style for compact right-side icon buttons
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
        "flex size-[36px] items-center justify-center rounded-full",
        "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
        "shrink-0",
        className
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Primary Action Button
// ---------------------------------------------------------------------------
function PrimaryActionButton() {
  return (
    <button
      type="button"
      className={cn(
        "hidden sm:inline-flex items-center gap-1.5 h-[36px] rounded-[6px] px-3.5",
        "bg-[#2563EB] hover:bg-[#1d4ed8] active:bg-[#1e40af]",
        "text-white text-[13px] font-semibold",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-1",
        "shrink-0"
      )}
    >
      <Plus className="size-[16px] -ml-0.5" aria-hidden="true" />
      <span>New Idea</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Notification bell with badge
// ---------------------------------------------------------------------------
function NotificationButton({ count = 0 }: { count?: number }) {
  const cappedCount = Math.min(count, 99);
  return (
    <div className="relative">
      <IconButton label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}>
        <Bell className="size-[18px]" strokeWidth={2} aria-hidden="true" />
      </IconButton>
      {cappedCount > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0 right-0 flex items-center justify-center",
            "min-w-[16px] h-4 rounded-full px-1 border-2 border-white",
            "bg-red-500 text-white text-[9px] font-bold leading-none"
          )}
        >
          {cappedCount}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User profile dropdown
// ---------------------------------------------------------------------------
function ProfileDropdown({ user }: { user: NavbarUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const menuItems = [
    { icon: User, label: "My Profile" },
    { icon: Settings, label: "Account Settings" },
    { icon: LogOut, label: "Sign Out" },
  ];

  return (
    <div ref={ref} className="relative ml-1 sm:ml-2">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 h-[36px] rounded-md sm:px-1.5",
          "hover:bg-slate-50 transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            "bg-[#2563EB] text-white text-xs font-semibold leading-none select-none"
          )}
          aria-hidden="true"
        >
          {user.initials}
        </div>

        {/* Name + role — hidden on small screens */}
        <div className="hidden lg:flex flex-col items-start leading-none text-left">
          <span className="text-[13px] font-semibold text-slate-900 leading-none">{user.name}</span>
          <span className="text-[11px] font-normal text-slate-500 leading-none mt-1 capitalize">{user.role}</span>
        </div>

        <ChevronDown
          className={cn("hidden lg:block size-[14px] text-slate-400 transition-transform duration-200 ml-0.5", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full mt-2 w-56 z-50",
            "rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-200/50",
            "py-1.5 overflow-hidden"
          )}
        >
          {/* User info header (mobile mostly, or extra context) */}
          <div className="px-4 py-3 border-b border-slate-100 mb-1 bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5 capitalize">{user.role}</p>
          </div>

          {menuItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              role="menuitem"
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2",
                "text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                "transition-colors duration-100",
                label === "Sign Out" && "text-red-600 hover:bg-red-50 hover:text-red-700 mt-1 border-t border-slate-100 pt-3"
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
// DashboardNavbar — main export
// ---------------------------------------------------------------------------
export default function DashboardNavbar({
  workspaceLabel,
  user,
  notificationCount = 0,
}: DashboardNavbarProps) {
  return (
    <header
      className={cn(
        "flex items-center w-full h-[60px] shrink-0",
        "border-b border-[#E2E8F0] bg-white",
        "px-4 sm:px-[20px] lg:px-6 gap-4"
      )}
    >
      {/* LEFT — Logo & Workspace */}
      <NavbarLogo workspaceLabel={workspaceLabel} />

      {/* CENTER — search (flex-1 to push items to edges) */}
      <GlobalSearch />

      {/* RIGHT — action buttons */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        
        <PrimaryActionButton />
        
        <IconButton label="Help and Support" className="hidden sm:flex">
          <CircleHelp className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        </IconButton>

        <NotificationButton count={notificationCount} />

        <ProfileDropdown user={user} />
      </div>
    </header>
  );
}
