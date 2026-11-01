import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { Card, SectionHeading } from "@/components/shared/Surface";

/** One flat, single-row call to action: text on the left, the action aligned to the same centre line on the right. */
export default function FundingOpportunities() {
  return (
    <section aria-label="Funding opportunities">
      <SectionHeading
        title="Funding & Grant Opportunities"
        action={{ label: "Explore all schemes", href: "/workspace/student/funding" }}
      />

      <Card className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-ink">Institutional Incubation &amp; Seed Grants</h3>
          <p className="mt-0.5 max-w-2xl text-[13px] text-muted-ink">
            DST NIDHI, MeitY TIDE 2.0, institutional seed funds and corporate prototype grants for DBIT researcher innovators.
          </p>
        </div>

        <Link
          href="/workspace/student/funding"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 sm:self-auto"
        >
          View Funding Schemes
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </Link>
      </Card>
    </section>
  );
}
