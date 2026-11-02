import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

/**
 * Standard page header: title, one supporting line, optional primary action.
 * Pages should use this rather than hand-building their own header.
 */
export default function PageHeader({
  title,
  description,
  action,
  actions,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[24px] lg:text-[30px] font-black leading-tight tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-muted-ink max-w-2xl">{description}</p>}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-3 self-start">{actions}</div>}

      {!actions && action && (
        <Link
          href={action.href}
          className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-xl bg-brand px-5 text-[14px] font-semibold text-white transition-colors duration-200 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden="true" />
          {action.label}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      )}
    </header>
  );
}
