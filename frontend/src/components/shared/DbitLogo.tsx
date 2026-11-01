"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface DbitLogoProps {
  /**
   * Display variant:
   * - "full": Full horizontal lockup (Rocket-wing Mark + DBIT + Incubation Centre)
   * - "mark": Standalone rocket-wing "D" mark (for collapsed rail, mobile icons, buttons)
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

/**
 * High-resolution Standalone Mark component for DBIT Incubation Centre.
 * The official Dynamic Venture Wing & Rocket Liftoff "D" symbol.
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
        src="/logo-mark.png"
        alt="DBIT Incubation Centre Mark"
        width={size}
        height={size}
        priority
        className="h-full w-full object-contain"
      />
    </div>
  );
}

/**
 * Universal Brand Component for DBIT Incubation Centre.
 * Uses the official Option 3: Dynamic Venture Wing & Rocket Launch identity.
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
  const logoSrc = theme === "dark" ? "/logo-horizontal-white.png" : "/logo-horizontal.png";
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
