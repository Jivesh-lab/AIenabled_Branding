"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface DbitLogoProps {
  /**
   * Display variant:
   * - "full": Full horizontal lockup (Hex Prism Mark + DBIT + Incubation Centre)
   * - "mark": Standalone Hex Prism "D+I" mark (for collapsed rail, mobile icons, buttons)
   * - "stacked": Stacked logo
   */
  variant?: "full" | "mark" | "stacked";
  /** Size scale */
  size?: "sm" | "md" | "lg" | "xl";
  /** Theme: "light" (dark text), "dark" (white text for hero / dark nav), "auto" */
  theme?: "light" | "dark" | "auto";
  /** Custom subtitle */
  subtitle?: string;
  /** Optional clickable link */
  href?: string;
  /** Custom container styling */
  className?: string;
  /** Custom mark styling */
  markClassName?: string;
  /** Mobile collapse flag */
  collapseSubtitleOnMobile?: boolean;
}

// Version stamp to guarantee instant cache busting across browser and Turbopack proxy
const BRAND_VERSION = "hex_v3_2026";

/**
 * High-resolution Standalone Hex Prism Mark for DBIT Incubation Centre.
 * The official Minimalist Isometric "D" and "I" geometric emblem.
 */
export function DbitLogoMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
  idPrefix?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 select-none overflow-hidden transition-transform duration-200 group-hover:scale-105",
        className
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Image
        src={`/brand/dbit-hex-mark.png?v=${BRAND_VERSION}`}
        alt="DBIT Incubation Centre Mark"
        width={size}
        height={size}
        unoptimized
        priority
        className="h-full w-full object-contain"
      />
    </div>
  );
}

/**
 * Universal Brand Component for DBIT Incubation Centre.
 * Uses the official Minimalist Hex Prism (D + I) identity.
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
  const heightMap = {
    sm: 28,
    md: 36,
    lg: 46,
    xl: 56,
  };

  const markHeight = heightMap[size];

  // If mark-only is requested
  if (variant === "mark") {
    const markContent = <DbitLogoMark size={markHeight} className={markClassName} />;
    if (href) {
      return (
        <Link
          href={href}
          className={cn(
            "inline-flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
            className
          )}
        >
          {markContent}
        </Link>
      );
    }
    return markContent;
  }

  // Full horizontal lockup
  const logoSrc = theme === "dark"
    ? `/brand/dbit-hex-logo-white.png?v=${BRAND_VERSION}`
    : `/brand/dbit-hex-logo.png?v=${BRAND_VERSION}`;

  // Aspect ratio is 806 x 240 (~3.36:1)
  const calculatedWidth = Math.round(markHeight * 3.36);

  const content = (
    <div
      className={cn(
        "group inline-flex items-center transition-opacity duration-150 hover:opacity-95 select-none",
        className
      )}
    >
      <Image
        src={logoSrc}
        alt={`DBIT ${subtitle}`}
        width={calculatedWidth}
        height={markHeight}
        unoptimized
        priority
        className="h-auto w-auto object-contain"
        style={{ height: `${markHeight}px` }}
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {content}
      </Link>
    );
  }

  return content;
}
