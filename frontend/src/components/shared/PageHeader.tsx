import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Standard page header: title, one supporting line, optional primary action.
 * Pages should use this rather than hand-building their own header.
 *
 * `action` renders the standard primary link. Pass `actions` instead when the
 * header needs something else (e.g. a button that opens an in-page panel).
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
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 text-[14px] text-muted-ink">{description}</p>}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2 self-start">{actions}</div>}

      {!actions && action && (
        <Link
          href={action.href}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 self-start rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
        >
          <Plus className="-ml-0.5 size-4" aria-hidden="true" />
          {action.label}
        </Link>
      )}
    </header>
  );
}
