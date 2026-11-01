/**
 * PageContainer
 * The single horizontal alignment system for every authenticated page.
 *
 * All role pages must render content inside this component so titles, sections,
 * cards, tables and forms share one content grid.
 *
 * Spacing: generous premium padding. Width: fluid, capped at 1440px.
 */
import { cn } from "@/lib/utils";

export default function PageContainer({
  children,
  title,
  description,
  className,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] px-6 pt-4 pb-10 lg:px-8 lg:pt-6 lg:pb-12 space-y-8", className)}>
      {title && (
        <div className="space-y-1">
          <h1 className="text-[24px] lg:text-[30px] font-black leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {description && <p className="mt-1 text-[14px] text-muted-ink max-w-2xl">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
