"use client";

/**
 * DashboardSidebar
 * Shared left navigation for all authenticated role shells.
 *
 * Visual direction: LIGHT sidebar. Navigation stays quiet so page content and
 * primary actions carry the attention. Ocean Royale appears only through the
 * active state and small accents - never as a full-height navy panel.
 *
 *   surface   bg-white          border  border-line (#D8EAF0)
 *   text      text-ink          muted   text-muted-ink
 *   icons     text-icon         hover   bg-nav-hover (#F1FAFC)
 *   active    bg-brand-cyan-soft (#CAF0F8) + text/icon/indicator brand (#023EBA)
 *   AI accent text-brand-cyan (#00B4D8)
 *   logo mark bg-brand-deep (#03045E) with a cyan glyph
 *
 * Layout contract:
 *   - desktop: sticky, full viewport height, 240px expanded / 68px collapsed
 *   - the nav list is the ONLY scroll container here, and only scrolls when the
 *     item list genuinely exceeds the viewport (thin, subtle scrollbar)
 *   - the 60px brand row matches the header height so both baselines align
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const SIDEBAR_WIDTH_EXPANDED = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface NavSubItem {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  isAI?: boolean;
  subItems?: NavSubItem[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface SidebarUser {
  name: string;
  role: string;
  initials: string;
}

export interface DashboardSidebarProps {
  sections: NavSection[];
  user: SidebarUser;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

// ---------------------------------------------------------------------------
// Brand row - height matches the 60px header
// ---------------------------------------------------------------------------
function SidebarBrand({ isExpanded }: { isExpanded: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[60px] shrink-0 items-center border-b border-line",
        isExpanded ? "px-4" : "justify-center px-0"
      )}
    >
      <div className="flex items-center gap-2.5">
        {/* The mark keeps the Ocean Royale identity without darkening the rail. */}
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-deep">
          <svg viewBox="0 0 20 20" className="size-4 text-brand-cyan" fill="none" aria-hidden="true">
            <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 7L13 9V13L10 15L7 13V9L10 7Z" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
        {isExpanded && (
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold leading-none text-ink">AAI&ndash;DBITIC</span>
            <span className="mt-1 text-[11px] font-medium leading-none text-muted-ink">
              Innovation Centre
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar item
// ---------------------------------------------------------------------------
function SidebarItem({
  item,
  isActive,
  isExpanded,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  onNavigate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(isActive);
  const Icon = item.icon;
  const hasSubItems = Boolean(item.subItems?.length);

  const content = (
    <>
      {/* Left indicator - the only ornament on an active row */}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand"
        />
      )}

      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors duration-150",
          isActive
            ? "text-brand"
            : item.isAI
              ? "text-brand-cyan"
              : "text-icon group-hover:text-ink"
        )}
        aria-hidden="true"
      />
      {isExpanded && (
        <div className="ml-3 flex flex-1 items-center justify-between overflow-hidden">
          <span
            className={cn(
              "truncate text-[14px] transition-colors duration-150",
              isActive ? "font-semibold text-brand" : "font-medium text-ink"
            )}
          >
            {item.label}
          </span>
          {hasSubItems && (
            <ChevronDown
              className={cn(
                "size-[14px] transition-transform duration-150",
                isActive ? "text-brand" : "text-muted-ink",
                isOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {/* Collapsed-state label, revealed on hover */}
      {!isExpanded && (
        <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-brand-deep px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 md:block">
          {item.label}
        </span>
      )}
    </>
  );

  const wrapperClass = cn(
    "group relative flex h-10 w-full items-center rounded-[8px] outline-none transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-brand/40",
    isExpanded ? "px-3" : "justify-center px-0",
    isActive ? "bg-brand-cyan-soft" : "hover:bg-nav-hover"
  );

  return (
    <div className="flex w-full flex-col">
      {hasSubItems ? (
        <button type="button" onClick={() => setIsOpen((v) => !v)} className={wrapperClass}>
          {content}
        </button>
      ) : (
        <Link href={item.href ?? "#"} onClick={onNavigate} className={wrapperClass}>
          {content}
        </Link>
      )}

      {hasSubItems && isExpanded && isOpen && (
        <div className="mt-1 flex flex-col gap-0.5 pl-[30px] pr-1">
          {item.subItems!.map((subItem) => (
            <Link
              key={subItem.label}
              href={subItem.href}
              onClick={onNavigate}
              className="flex h-8 items-center rounded-md px-3 text-[13px] font-medium text-muted-ink transition-colors hover:bg-nav-hover hover:text-ink"
            >
              <span className="truncate">{subItem.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardSidebar
// ---------------------------------------------------------------------------
export default function DashboardSidebar({
  sections,
  user,
  isMobileOpen,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    onMobileClose();
  }, [pathname, onMobileClose]);

  // A nav item stays active on its nested routes, e.g. My Projects on /student/projects/2.
  const isItemActive = useCallback(
    (item: NavItem) => {
      const matches = (href?: string) => !!href && (pathname === href || pathname.startsWith(`${href}/`));
      return matches(item.href) || (item.subItems?.some((sub) => matches(sub.href)) ?? false);
    },
    [pathname]
  );

  const renderContent = (expanded: boolean) => (
    <div className="flex h-full w-full flex-col bg-white">
      <SidebarBrand isExpanded={expanded} />

      {/* Nav list - the only scroll container in the shell, and only when needed. */}
      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4">
        <div className="flex flex-col gap-5 px-3">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              {expanded && (
                <h3 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-ink">
                  {section.label}
                </h3>
              )}
              {section.items.map((item) => (
                <SidebarItem
                  key={item.label}
                  item={item}
                  isActive={isItemActive(item)}
                  isExpanded={expanded}
                  onNavigate={onMobileClose}
                />
              ))}
            </div>
          ))}
        </div>
      </nav>

      {/* Profile */}
      <div className="shrink-0 border-t border-line p-3">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-[8px] p-2 outline-none transition-colors hover:bg-nav-hover",
            !expanded && "justify-center"
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-white">
            {user.initials}
          </div>
          {expanded && (
            <>
              <div className="flex min-w-0 flex-1 flex-col items-start">
                <span className="w-full truncate text-left text-[13px] font-semibold text-ink">
                  {user.name}
                </span>
                <span className="w-full truncate text-left text-[11px] text-muted-ink">
                  {user.role}
                </span>
              </div>
              <ChevronDown className="size-[14px] shrink-0 text-muted-ink" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop - sticky full-height rail, contributes no page-level scrollbar */}
      <aside
        style={{ width: isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED }}
        className="sticky top-0 z-30 hidden h-screen shrink-0 border-r border-line transition-[width] duration-200 ease-in-out md:block"
      >
        {renderContent(isExpanded)}

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className="absolute -right-3 top-[76px] hidden size-6 items-center justify-center rounded-full border border-line bg-white text-muted-ink shadow-sm transition-colors hover:text-ink md:flex"
        >
          <ChevronLeft
            className={cn("size-[14px] transition-transform duration-200", !isExpanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-40 bg-ink/50 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-[248px] border-r border-line md:hidden"
            >
              {renderContent(true)}
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close navigation"
                className="absolute -right-11 top-3 flex size-9 items-center justify-center rounded-full bg-brand-deep text-white"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
