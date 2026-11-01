"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DbitLogoProps {
  /**
   * Display variant:
   * - "full": Icon mark + DBIT + Incubation Centre (horizontal)
   * - "mark": Icon mark only (for collapsed sidebars, mobile headers, avatars)
   * - "stacked": Centered icon with stacked text underneath (for splash, hero, auth panels)
   */
  variant?: "full" | "mark" | "stacked";
  /** Size scale: sm (28px), md (36px), lg (44px), xl (54px) */
  size?: "sm" | "md" | "lg" | "xl";
  /** Color theme: "light" (for white/light gray backgrounds), "dark" (for navy/black backgrounds), "auto" */
  theme?: "light" | "dark" | "auto";
  /** Optional custom subtitle (defaults to "Incubation Centre") */
  subtitle?: string;
  /** Optional href to make the logo clickable (e.g. "/" or "/workspace") */
  href?: string;
  /** Custom extra styling on outer container */
  className?: string;
  /** Custom extra styling on the mark */
  markClassName?: string;
  /** Hide subtitle on very small screens */
  collapseSubtitleOnMobile?: boolean;
}

/**
 * High-precision vector SVG logo mark for DBIT Incubation Centre.
 * Features the dynamic "D-Chrysalis" accelerator ribbon and radiant breakthrough spark.
 */
export function DbitLogoMark({
  size = 36,
  className,
  idPrefix = "dbit-sym",
}: {
  size?: number;
  className?: string;
  idPrefix?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none transition-transform duration-200 group-hover:scale-105", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${idPrefix}-bg`} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#072F5F" />
          <stop offset="45%" stopColor="#0B4F9C" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        <linearGradient id={`${idPrefix}-spine`} x1="12" y1="10" x2="18" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        <linearGradient id={`${idPrefix}-arc`} x1="18" y1="10" x2="40" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#00D2FF" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        <linearGradient id={`${idPrefix}-spark`} x1="24" y1="17" x2="33" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="45%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        <linearGradient id={`${idPrefix}-bezel`} x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* Machined Squircle Base Plate */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${idPrefix}-bg)`} />
      <rect x="2.5" y="2.5" width="43" height="43" rx="11.5" stroke={`url(#${idPrefix}-bezel)`} strokeWidth="1" />

      {/* Architectural Left Foundation Pillar (DBIT Engineering Rigour) */}
      <rect x="12" y="11" width="6" height="26" rx="3" fill={`url(#${idPrefix}-spine)`} />

      {/* Outer Incubation Orbital Arc (The Nurturing Shell) */}
      <path
        d="M18 11H27C34.1797 11 40 16.8203 40 24C40 28.5367 37.6748 32.5307 34.1378 34.8698C33.3031 35.4218 32.2223 35.1558 31.7243 34.2794C31.2589 33.4601 31.5036 32.408 32.285 31.848C35.0336 29.8785 36.8 26.6806 36.8 24C36.8 18.5876 32.4124 14.2 27 14.2H18V11Z"
        fill={`url(#${idPrefix}-arc)`}
      />

      {/* Inner Dynamic Accelerator / Venture Launch Wing */}
      <path
        d="M18 34H26C29.866 34 33 30.866 33 27C33 25.137 32.2743 23.4439 31.0898 22.1896L24.8 15.9C24.2 15.3 23.2 15.7 23.2 16.55V23.5H18V34Z"
        fill="#00D2FF"
        fillOpacity="0.9"
      />

      {/* The Innovation Nucleus: 4-Point Radiant Catalyst Spark */}
      <path
        d="M28.5 17L29.7 20.8L33.5 22L29.7 23.2L28.5 27L27.3 23.2L23.5 22L27.3 20.8L28.5 17Z"
        fill={`url(#${idPrefix}-spark)`}
      />
      <circle cx="28.5" cy="22" r="1.3" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Universal Brand Component for DBIT Incubation Centre.
 * Replaces all ad-hoc placeholders across navbar, sidebar, auth, and landing pages.
 */
export default function DbitLogo({
  variant = "full",
  size = "md",
  theme = "auto",
  subtitle = "Incubation Centre",
  href,
  className,
  markClassName,
  collapseSubtitleOnMobile = false,
}: DbitLogoProps) {
  // Sizing matrix
  const pixelSizes = {
    sm: 28,
    md: 34,
    lg: 42,
    xl: 52,
  };

  const titleSizes = {
    sm: "text-[13px] tracking-tight",
    md: "text-[15px] tracking-tight",
    lg: "text-[18px] tracking-tight",
    xl: "text-[22px] tracking-tight",
  };

  const subtitleSizes = {
    sm: "text-[9px] tracking-[0.14em]",
    md: "text-[10.5px] tracking-[0.13em]",
    lg: "text-[11.5px] tracking-[0.15em]",
    xl: "text-[13px] tracking-[0.16em]",
  };

  const markPx = pixelSizes[size];

  // Theme-aware typography classes
  const isDark = theme === "dark";
  const isLight = theme === "light";

  const titleColor = isDark
    ? "text-white"
    : isLight
      ? "text-slate-900"
      : "text-ink dark:text-white";

  const subtitleColor = isDark
    ? "text-sky-300"
    : isLight
      ? "text-brand"
      : "text-brand dark:text-sky-400";

  const content = (
    <div
      className={cn(
        "group flex items-center gap-2.5 transition-opacity duration-150 hover:opacity-95 select-none",
        variant === "stacked" && "flex-col text-center gap-2",
        className
      )}
    >
      <DbitLogoMark size={markPx} className={markClassName} idPrefix={`logo-${size}-${theme}`} />

      {variant !== "mark" && (
        <div className={cn("flex flex-col leading-none text-left", variant === "stacked" && "text-center")}>
          <span className={cn("font-black font-heading leading-tight", titleSizes[size], titleColor)}>
            DBIT
          </span>
          <span
            className={cn(
              "font-bold uppercase leading-none mt-0.5",
              subtitleSizes[size],
              subtitleColor,
              collapseSubtitleOnMobile && "hidden sm:inline-block"
            )}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
