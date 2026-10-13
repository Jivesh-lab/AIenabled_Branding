import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Standard page header — Deliberate incubation studio craft.
 * Title in Space Grotesk display styling with restrained tracking,
 * sentence-case description, and purposeful single primary action.
 */
export default function PageHeader({
  title,
  description,
  action,
  actions,
  badge,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between border-b border-line/60">
      <div className="min-w-0 max-w-2xl">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-[24px] sm:text-[26px] font-semibold leading-snug tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-muted-ink">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2 self-start">{actions}</div>}

      {!actions && action && (
        <Link
          href={action.href}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-md bg-brand px-3.5",
            "text-[13px] font-medium text-white transition-all duration-150",
            "hover:bg-brand-hover active:scale-[0.99]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          )}
        >
          <Plus className="-ml-0.5 size-4" aria-hidden="true" />
          {action.label}
        </Link>
      )}
    </header>
  );
}
