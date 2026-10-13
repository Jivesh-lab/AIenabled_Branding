/**
 * PageContainer — Deliberate incubation studio layout frame.
 * Single horizontal alignment across Student, Mentor, Investor, and Admin roles.
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
    <div className={cn("mx-auto w-full max-w-[1400px] px-5 py-6 sm:px-8 sm:py-8 space-y-6", className)}>
      {title && (
        <div className="space-y-1 pb-2 border-b border-line/60 max-w-2xl">
          <h1 className="font-heading text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {description && (
            <p className="text-[13px] leading-relaxed text-muted-ink">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
