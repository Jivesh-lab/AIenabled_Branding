import { AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StageState } from "../_lib/journey";

/**
 * The single marker used by both the stage tracks and the timeline, so a state
 * always looks the same everywhere on the page.
 *
 *   complete  blue fill + check        approved  green fill + check
 *   current   blue ring, cyan centre   revision  gold ring + warning
 *   rejected  red ring + cross         upcoming  light grey ring
 *   closed    grey, dashed (stages that will not happen after a rejection)
 */
const SIZE = { sm: "size-5", md: "size-6" } as const;
const ICON = { sm: "size-3", md: "size-3.5" } as const;

export const STATE_LABEL: Record<StageState, string> = {
  complete: "Completed",
  current: "Current",
  revision: "Revision requested",
  rejected: "Not approved",
  approved: "Approved",
  upcoming: "Upcoming",
  closed: "Not reached",
};

export default function StageMarker({ state, size = "md" }: { state: StageState; size?: "sm" | "md" }) {
  const base = cn("relative flex shrink-0 items-center justify-center rounded-full", SIZE[size]);
  const icon = ICON[size];

  switch (state) {
    case "complete":
      return (
        <span className={cn(base, "bg-brand text-white")}>
          <Check className={icon} strokeWidth={3} aria-hidden="true" />
        </span>
      );
    case "approved":
      return (
        <span className={cn(base, "bg-success text-white")}>
          <Check className={icon} strokeWidth={3} aria-hidden="true" />
        </span>
      );
    case "current":
      return (
        <span className={cn(base, "border-2 border-brand bg-white ring-4 ring-brand-cyan-soft")}>
          <span className="size-2 rounded-full bg-brand-cyan" />
        </span>
      );
    case "revision":
      return (
        <span className={cn(base, "border-2 border-brand-gold bg-brand-gold/15 text-brand-gold-ink")}>
          <AlertTriangle className={icon} strokeWidth={2.5} aria-hidden="true" />
        </span>
      );
    case "rejected":
      return (
        <span className={cn(base, "border-2 border-danger bg-danger/10 text-danger")}>
          <X className={icon} strokeWidth={3} aria-hidden="true" />
        </span>
      );
    case "closed":
      return <span className={cn(base, "border border-dashed border-line bg-canvas")} />;
    default:
      return (
        <span className={cn(base, "border-2 border-line bg-white")}>
          <span className="size-1.5 rounded-full bg-line" />
        </span>
      );
  }
}
