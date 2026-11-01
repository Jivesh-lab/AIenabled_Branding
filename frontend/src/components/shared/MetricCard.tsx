import { cn } from "@/lib/utils";
import { KpiCardSkeleton } from "@/components/shared/loading/primitives";

/**
 * One KPI card, shared by every role's dashboards so they all read like the Student Portal: a muted label, a bold
 * number, an optional one-line caption, and a single outline icon top-right. No per-card colour; colour only signals
 * something that needs attention, and only when there is something to attend to (a zero never turns red).
 */
export default function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  loading = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  /** "attention" (amber) and "danger" (red) apply only when `value` is a positive number. */
  tone?: "default" | "attention" | "danger";
  /** Shows a placeholder of the same shape instead of a misleading 0 while the data loads. */
  loading?: boolean;
  className?: string;
}) {
  if (loading) return <KpiCardSkeleton withCaption={!!sub} label={label} className={className} />;

  const raised = tone !== "default" && Number(value) > 0;
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm",
        raised ? (tone === "danger" ? "border-danger/30" : "border-brand-gold/40") : "border-line",
        className
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-muted-ink">{label}</p>
        <p
          className={cn(
            "mt-1 text-[24px] font-bold leading-none tabular-nums",
            raised ? (tone === "danger" ? "text-danger" : "text-brand-gold-ink") : "text-brand"
          )}
        >
          {value}
        </p>
        {sub && <p className="mt-1.5 truncate text-[12px] text-muted-ink">{sub}</p>}
      </div>
      <Icon
        className={cn("size-[18px] shrink-0", raised ? (tone === "danger" ? "text-danger" : "text-brand-gold") : "text-brand-cyan")}
        aria-hidden="true"
      />
    </div>
  );
}
