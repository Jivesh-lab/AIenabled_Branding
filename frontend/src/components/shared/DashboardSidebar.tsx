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
 *   active    bg-brand-soft + text/icon/left indicator in brand
 *   AI accent text-brand-cyan (#00B4D8)
 *   logo mark bg-brand-deep (#03045E) with a cyan glyph
 *
 * Layout contract:
 *   - desktop: sticky, full viewport height, 248px expanded / 68px collapsed
 *   - the nav list is the ONLY scroll container here, and only scrolls when the
 *     item list genuinely exceeds the viewport (thin, subtle scrollbar)
 *   - the 64px brand row matches the header height so both baselines align
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";

export const SIDEBAR_WIDTH_EXPANDED = 248;
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
  /** Any icon component that takes a className (Heroicons or Lucide while roles migrate). */
  icon: React.ElementType;
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
    // The logo keeps a fixed left position in both states; only the wordmark fades, so nothing jumps.
    <div className="flex h-16 shrink-0 items-center overflow-hidden px-5">
      <div className="flex items-center gap-2.5">
        {/* The mark keeps the Ocean Royale identity without darkening the rail. */}
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-deep">
          <svg viewBox="0 0 20 20" className="size-4 text-brand-cyan" fill="none" aria-hidden="true">
            <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 7L13 9V13L10 15L7 13V9L10 7Z" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
        <div className={cn("flex flex-col transition-opacity duration-150", isExpanded ? "opacity-100" : "opacity-0")}>
          <span className="whitespace-nowrap text-[14px] font-semibold leading-none text-ink">DBIT</span>
          <span className="mt-1 whitespace-nowrap text-[11px] font-medium leading-none text-muted-ink">
            Incubation Centre
          </span>
        </div>
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
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors duration-150",
          isActive
            ? "text-white"
            : item.isAI
              ? "text-brand-cyan"
              : "text-icon group-hover:text-ink"
        )}
        aria-hidden="true"
      />
      {/* Label is always mounted; it fades and the narrowing rail clips it, so the icon never jumps. */}
      <div
        className={cn(
          "ml-3 flex flex-1 items-center justify-between overflow-hidden transition-opacity duration-150",
          isExpanded ? "opacity-100" : "opacity-0"
        )}
      >
        <span
          className={cn(
            "truncate whitespace-nowrap text-[14px] transition-colors duration-150",
            isActive ? "font-semibold text-white" : "font-medium text-ink"
          )}
        >
          {item.label}
        </span>
        {hasSubItems && (
          <ChevronDownIcon
            className={cn(
              "size-[14px] shrink-0 transition-transform duration-150",
              isActive ? "text-white" : "text-muted-ink",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Collapsed-state label, revealed on hover */}
      {!isExpanded && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-brand-deep px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 md:block">
          {item.label}
        </span>
      )}
    </>
  );

  // Icons stay at a fixed left position (px-3) in both states; collapsing only narrows the rail and fades labels.
  const wrapperClass = cn(
    "group relative flex h-11 w-full items-center rounded-lg px-3 outline-none transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-brand/40",
    isActive ? "bg-brand" : "hover:bg-nav-hover"
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

  // A nav item stays active on its nested routes (My Projects on /student/projects/2), but only the MOST SPECIFIC
  // match is active, so a parent route such as /workspace/faculty never lights up beside /workspace/faculty/oversight.
  const activeHref = useMemo(() => {
    let best = "";
    for (const section of sections) {
      for (const item of section.items) {
        for (const href of [item.href, ...(item.subItems?.map((sub) => sub.href) ?? [])]) {
          if (href && (pathname === href || pathname.startsWith(`${href}/`)) && href.length > best.length) best = href;
        }
      }
    }
    return best;
  }, [sections, pathname]);

  const isItemActive = useCallback(
    (item: NavItem) => !!activeHref && (item.href === activeHref || (item.subItems?.some((sub) => sub.href === activeHref) ?? false)),
    [activeHref]
  );

  const renderContent = (
    expanded: boolean,
    opts: { showProfile?: boolean; onToggle?: () => void } = {}
  ) => (
    <div className="flex h-full w-full flex-col bg-white">
      <SidebarBrand isExpanded={expanded} />

      {/* Nav list - the only scroll container in the shell, and only when needed. */}
      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4">
        <div className="flex flex-col gap-4 px-4">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1.5">
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

      {/* Collapse/expand toggle — desktop only, pinned at the bottom so it is always visible in both states. */}
      {opts.onToggle && (
        <div className="shrink-0 border-t border-line p-2">
          <button
            type="button"
            onClick={opts.onToggle}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className="group flex h-9 w-full items-center rounded-lg px-3 text-muted-ink outline-none transition-colors duration-150 hover:bg-nav-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <ChevronLeftIcon
              className={cn("size-5 shrink-0 transition-transform duration-200", !expanded && "rotate-180")}
              aria-hidden="true"
            />
            <span
              className={cn(
                "ml-3 truncate whitespace-nowrap text-[13px] font-medium transition-opacity duration-150",
                expanded ? "opacity-100" : "opacity-0"
              )}
            >
              Collapse
            </span>
          </button>
        </div>
      )}

      {/* Profile: the desktop header already carries the user menu, so only the mobile drawer repeats it. */}
      {opts.showProfile && (
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
              <ChevronDownIcon className="size-[14px] shrink-0 text-muted-ink" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop - sticky full-height rail, contributes no page-level scrollbar */}
      <aside
        style={{ width: isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED }}
        className="sticky top-0 z-30 hidden h-screen shrink-0 border-r border-line transition-[width] duration-200 ease-in-out md:block"
      >
        {renderContent(isExpanded, { onToggle: () => setIsExpanded((v) => !v) })}
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
              {renderContent(true, { showProfile: true })}
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close navigation"
                className="absolute -right-11 top-3 flex size-9 items-center justify-center rounded-full bg-brand-deep text-white"
              >
                <XMarkIcon className="size-5" aria-hidden="true" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
