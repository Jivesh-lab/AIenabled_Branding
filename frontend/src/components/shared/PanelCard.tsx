import Link from "next/link";
import { Card } from "@/components/shared/Surface";

/**
 * The one shell every mentor dashboard panel uses: the portal's standard card, a header row with the title (and an
 * optional description), and either a link or a small count on the right. Replaces four hand-rolled copies.
 */
export default function PanelCard({
  title,
  description,
  action,
  count,
  children,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  /** A quiet count shown instead of a link. */
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted-ink">{description}</p>}
        </div>
        {typeof count === "number" ? (
          <span className="shrink-0 rounded-md border border-line bg-canvas px-2 py-0.5 text-[12px] font-semibold tabular-nums text-muted-ink">
            {count}
          </span>
        ) : (
          action && (
            <Link
              href={action.href}
              className="shrink-0 rounded text-[13px] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {action.label}
            </Link>
          )
        )}
      </div>
      {children}
    </Card>
  );
}

/** A calm one-line message inside a panel: empty, or "couldn't load" with an optional retry. */
export function PanelMessage({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
      <p className="text-[13px] text-muted-ink">{children}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-8 items-center rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-brand transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Try again
        </button>
      )}
    </div>
  );
}
