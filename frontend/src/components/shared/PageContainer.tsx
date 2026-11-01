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
    <div className={cn("mx-auto w-full max-w-[1440px] px-6 pt-2 pb-6 lg:px-8 lg:pt-2.5 lg:pb-8 space-y-6", className)}>
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
