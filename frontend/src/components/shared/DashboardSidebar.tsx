"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
// Sidebar Item Component
// ---------------------------------------------------------------------------
function SidebarItem({
  item,
  isActive,
  isExpanded,
  onMobileClose,
}: {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  onMobileClose: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = item.icon;

  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isAI = item.isAI;

  const handleClick = () => {
    if (hasSubItems) {
      setIsOpen(!isOpen);
    } else {
      onMobileClose();
    }
  };

  const content = (
    <>
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors duration-200",
          isActive ? "text-white" : isAI ? "text-[#7C3AED]" : "text-slate-400 group-hover:text-slate-200"
        )}
        aria-hidden="true"
      />
      {/* Label and Submenu Chevron (only shown when expanded) */}
      {isExpanded && (
        <div className="flex flex-1 items-center justify-between overflow-hidden ml-3">
          <span
            className={cn(
              "text-sm font-medium truncate transition-colors duration-200",
              isActive ? "text-white" : "text-slate-300 group-hover:text-white"
            )}
          >
            {item.label}
          </span>
          {hasSubItems && (
            <ChevronDown
              className={cn(
                "size-[14px] text-slate-400 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          )}
        </div>
      )}

      {/* Tooltip for collapsed state */}
      {!isExpanded && (
        <div className="pointer-events-none absolute left-full ml-4 rounded-md bg-[#06152B] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 hidden md:block z-50">
          {item.label}
        </div>
      )}
    </>
  );

  const wrapperClass = cn(
    "group relative flex items-center h-10 w-full rounded-[8px] transition-all duration-150 outline-none",
    isExpanded ? "px-3" : "justify-center px-0",
    isActive
      ? "bg-[#2563EB]"
      : "hover:bg-[#0B1F3A]"
  );

  return (
    <div className="flex flex-col w-full">
      {hasSubItems ? (
        <button type="button" onClick={handleClick} className={wrapperClass}>
          {content}
        </button>
      ) : (
        <Link href={item.href || "#"} onClick={handleClick} className={wrapperClass}>
          {content}
        </Link>
      )}

      {/* Sub Items */}
      {hasSubItems && isExpanded && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-1 mt-1 pl-[34px] pr-2">
                {item.subItems!.map((subItem) => (
                  <Link
                    key={subItem.label}
                    href={subItem.href}
                    onClick={onMobileClose}
                    className="flex items-center h-8 rounded-md px-2 text-[13px] font-medium text-[#94A3B8] hover:text-white hover:bg-[#0B1F3A] transition-colors"
                  >
                    <span className="truncate">{subItem.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardSidebar — main export
// ---------------------------------------------------------------------------
export default function DashboardSidebar({
  sections,
  user,
  isMobileOpen,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  // Sidebar expanded state for desktop
  const [isExpanded, setIsExpanded] = useState(true);

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose();
  }, [pathname, onMobileClose]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const SidebarContent = (
    <div className="flex h-full w-full flex-col bg-[#06152B] border-r border-white/5">
      {/* Brand Area */}
      <div className={cn("flex items-center h-[68px] shrink-0", isExpanded ? "px-6" : "justify-center px-0")}>
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#0B1F3A]">
            <svg viewBox="0 0 20 20" className="size-4 text-blue-300" fill="none" aria-hidden="true">
              <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 7L13 9V13L10 15L7 13V9L10 7Z" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
          {isExpanded && (
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold text-white leading-none">AAI–DBITIC</span>
              <span className="text-[11px] font-medium text-[#94A3B8] leading-none mt-1">Innovation Centre</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
        <div className={cn("flex flex-col gap-6", isExpanded ? "px-4" : "px-3")}>
          {sections.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              {isExpanded && (
                <div className="px-2 mb-1">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                    {section.label}
                  </h3>
                </div>
              )}
              {section.items.map((item) => (
                <SidebarItem
                  key={item.label}
                  item={item}
                  isActive={pathname === item.href || (item.subItems?.some(sub => pathname === sub.href) ?? false)}
                  isExpanded={isExpanded}
                  onMobileClose={onMobileClose}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Profile Area */}
      <div className={cn("shrink-0 border-t border-white/5 py-4", isExpanded ? "px-4" : "px-3")}>
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-[8px] hover:bg-[#0B1F3A] transition-colors outline-none",
            isExpanded ? "p-2" : "p-2 justify-center"
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white text-xs font-semibold">
            {user.initials}
          </div>
          {isExpanded && (
            <>
              <div className="flex flex-1 flex-col items-start overflow-hidden">
                <span className="text-sm font-semibold text-white truncate w-full text-left">{user.name}</span>
                <span className="text-xs font-normal text-[#94A3B8] truncate w-full text-left">{user.role}</span>
              </div>
              <ChevronDown className="size-[14px] text-[#94A3B8] shrink-0 ml-1" />
            </>
          )}
        </button>
      </div>

      {/* Desktop Collapse Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 size-6 items-center justify-center rounded-full bg-[#0B1F3A] border border-white/10 text-[#94A3B8] hover:text-white hover:bg-[#06152B] transition-colors shadow-sm z-10"
      >
        <ChevronDown className={cn("size-[14px] transition-transform duration-200", isExpanded ? "rotate-90" : "-rotate-90")} />
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 240 : 72 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:block relative h-full shrink-0 z-20"
      >
        {SidebarContent}
      </motion.aside>

      {/* Mobile Overlay & Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-slate-900/60 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 w-[256px] z-50 md:hidden"
            >
              {SidebarContent}
              <button
                onClick={onMobileClose}
                className="absolute top-4 -right-10 flex size-8 items-center justify-center rounded-full bg-slate-800 text-white"
              >
                <X className="size-5" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
