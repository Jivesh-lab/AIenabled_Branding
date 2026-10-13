import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { SectionHeading } from "@/components/shared/Surface";
import { FUNDING_OPPORTUNITIES } from "@/mock/student-dashboard";

/** Clean funding opportunities preview without tracked-out uppercase or trailing arrows. */
export default function FundingOpportunities() {
  return (
    <section aria-label="Funding opportunities">
      <SectionHeading
        title="Funding Opportunities"
        action={{ label: "Browse directory", href: "/workspace/student/funding" }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {FUNDING_OPPORTUNITIES.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-lg border border-line bg-white p-5 transition-colors hover:border-brand/40"
          >
            <div>
              <span className="inline-flex items-center rounded bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 border border-teal-200/60">
                {item.domain}
              </span>
              <h3 className="mt-2 text-[15px] font-semibold text-ink leading-snug">{item.name}</h3>
              <p className="mt-1 text-[14px] font-semibold text-brand tabular-nums">{item.amount}</p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-3">
              <p className="flex items-center gap-1.5 text-[12px] text-muted-ink">
                <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                <span>Deadline: {item.deadline}</span>
              </p>
              <Link
                href={item.href}
                className="text-[13px] font-medium text-brand hover:underline"
              >
                View grant
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
