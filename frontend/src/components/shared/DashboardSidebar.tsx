"use client";

/**
 * DashboardSidebar
 * Premium left navigation for all authenticated role shells.
 *
 * Visual direction: light, quiet surface so page content and primary actions
 * carry the attention. Ocean Royale appears only through the active-state left
 * accent, small icon accents, and the brand mark - never as a heavy full-width
 * colour block.
 *
 * Tokens: bg-white surface, border-r border-line, text-ink / muted-ink,
 * brand active accent, brand-cyan AI highlights, icon muted resting.
 *
 * Layout contract:
 *   - desktop: sticky full-height rail, 248px expanded / 68px collapsed
 *   - nav list is the only internal scroll container
 *   - brand row height aligns with the header baseline
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { DbitLogoMark } from "@/components/shared/DbitLogo";

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
// Brand row
// ---------------------------------------------------------------------------
function SidebarBrand({ isExpanded }: { isExpanded: boolean }) {
  return (
    <div className="flex h-16 shrink-0 items-center overflow-hidden px-4 border-b border-line">
      <Link href="/workspace" className="flex items-center gap-2.5 focus:outline-none">
        <DbitLogoMark size={34} idPrefix="sidebar-mark" />
        <div className={cn("flex flex-col transition-opacity duration-150", isExpanded ? "opacity-100" : "opacity-0")}>
          <span className="whitespace-nowrap text-[14px] font-bold leading-none text-ink">DBIT</span>
          <span className="mt-1 whitespace-nowrap text-[9.5px] font-semibold tracking-wider uppercase leading-none text-brand">
            Incubation Centre
          </span>
        </div>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header (small uppercase label between groups)
// ---------------------------------------------------------------------------
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-5 py-2">
      <span className="h-0.5 w-3 rounded-full bg-brand/40 shrink-0" aria-hidden="true" />
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-ink whitespace-nowrap">
        {label}
      </span>
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

  const iconClass = cn(
    "size-5 shrink-0 transition-colors duration-200",
    isActive
      ? "text-brand"
      : item.isAI
        ? "text-brand-cyan"
        : "text-icon group-hover:text-brand-deep"
  );

  const content = (
    <>
      <Icon className={iconClass} aria-hidden="true" />
      <div
        className={cn(
          "ml-3 flex flex-1 items-center justify-between overflow-hidden transition-opacity duration-200",
          isExpanded ? "opacity-100" : "opacity-0"
        )}
      >
        <span
          className={cn(
            "truncate whitespace-nowrap text-[14px] transition-colors duration-200",
            isActive ? "font-semibold text-brand-deep" : "font-medium text-ink"
          )}
        >
          {item.label}
        </span>
        {hasSubItems && (
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 transition-transform duration-200",
              isActive ? "text-brand" : "text-muted-ink",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {!isExpanded && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-brand-deep px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 md:block">
          {item.label}
        </span>
      )}
    </>
  );

  const wrapperClass = cn(
    "group relative flex h-10 w-full items-center rounded-xl px-3 outline-none transition-colors duration-200",
    "focus-visible:ring-2 focus-visible:ring-brand/40",
    isActive ? "bg-brand-soft border border-brand/30" : "hover:bg-canvas/60 border border-transparent"
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
        <div className="mt-1.5 flex flex-col gap-0 pl-[30px] pr-1">
          {item.subItems!.map((subItem) => (
            <Link
              key={subItem.label}
              href={subItem.href}
              onClick={onNavigate}
              className="flex h-9 items-center rounded-lg px-3 py-1 text-[12px] font-medium text-muted-ink transition-colors hover:bg-canvas hover:text-ink"
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

  useEffect(() => {
    onMobileClose();
  }, [pathname, onMobileClose]);

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

      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3">
        <div className="flex flex-col gap-2 px-4">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              {expanded && section.label && (
                <SectionHeader label={section.label} />
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

      {opts.onToggle && (
        <div className="shrink-0 border-t border-line p-3">
          <button
            type="button"
            onClick={opts.onToggle}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className="group flex h-9 w-full items-center rounded-xl px-3 text-muted-ink outline-none transition-colors duration-200 hover:bg-canvas hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <ChevronLeftIcon
              className={cn("size-5 shrink-0 transition-transform duration-200", !expanded && "rotate-180")}
              aria-hidden="true"
            />
            <span
              className={cn(
                "ml-3 truncate whitespace-nowrap text-[13px] font-medium transition-opacity duration-200",
                expanded ? "opacity-100" : "opacity-0"
              )}
            >
              Collapse
            </span>
          </button>
        </div>
      )}

      {opts.showProfile && (
        <div className="shrink-0 border-t border-line p-3">
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl p-2 outline-none transition-colors hover:bg-canvas",
              !expanded && "justify-center"
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white">
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
      <aside
        style={{ width: isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED }}
        className="sticky top-0 z-30 hidden h-screen shrink-0 border-r border-line transition-[width] duration-300 ease-in-out md:block"
      >
        {renderContent(isExpanded, { onToggle: () => setIsExpanded((v) => !v) })}
      </aside>

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
