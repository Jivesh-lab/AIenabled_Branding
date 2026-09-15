/**
 * PageContainer
 * The single horizontal alignment system for every authenticated page.
 *
 * All role pages (Student / Faculty / Mentor / …) must render their content
 * inside this component so titles, sections, cards, tables and forms share one
 * content grid. Do not add ad-hoc page padding or max-widths elsewhere.
 *
 * Spacing: 24px padding on mobile, 32px from `lg` up (4px system).
 * Width:   fluid, capped at 1440px so wide viewports do not stretch cards.
 */
import { cn } from "@/lib/utils";

export default function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] px-6 py-6 lg:px-8 lg:py-8", className)}>
      {children}
    </div>
  );
}
