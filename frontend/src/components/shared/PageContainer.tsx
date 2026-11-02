/**
 * PageContainer — Single horizontal alignment system across Student, Mentor, Investor, and Admin roles.
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
        <div className="space-y-1 pb-2 border-b border-line/60 max-w-2xl">
          <h1 className="text-[20px] sm:text-[22px] font-semibold leading-tight tracking-tight text-ink">
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
