import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { FUNDING_OPPORTUNITIES } from "@/mock/student-dashboard";

/** A preview of the funding page — three opportunities, not the full system. */
export default function FundingOpportunities() {
  return (
    <section aria-label="Funding opportunities">
      <SectionHeading title="Funding Opportunities" action={{ label: "View all", href: "/student/funding" }} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {FUNDING_OPPORTUNITIES.map((item) => (
          <Card key={item.id} interactive className="flex flex-col p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-brand-cyan">
              {item.domain}
            </p>
            <h3 className="mt-1.5 text-[15px] font-semibold text-ink">{item.name}</h3>
            <p className="mt-1 text-[14px] font-semibold text-brand">{item.amount}</p>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <p className="flex items-center gap-1.5 text-[12px] text-muted-ink">
                <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                {item.deadline}
              </p>
              <Link
                href={item.href}
                className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand transition-colors duration-150 hover:text-brand-cyan"
              >
                View
                <ArrowRight
                  className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
