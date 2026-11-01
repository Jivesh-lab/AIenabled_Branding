import Link from "next/link";
import { ArrowRight, Coins } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";

export default function FundingOpportunities() {
  return (
    <section aria-label="Funding opportunities">
      <SectionHeading
        title="Funding & Grant Schemes"
        action={{ label: "Explore all schemes", href: "/workspace/student/funding" }}
      />

      <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-line bg-white">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded bg-teal-50 text-teal-800 border border-teal-200/60 mt-0.5">
            <Coins className="size-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Institutional Incubation & Prototype Grants</h3>
            <p className="text-[13px] text-muted-ink mt-0.5 max-w-xl leading-relaxed">
              Explore DST NIDHI EIR, MeitY TIDE 2.0, institutional pre-seed funds, and corporate prototype grants available for DBIT student ventures.
            </p>
          </div>
        </div>

        <Link
          href="/workspace/student/funding"
          className="inline-flex shrink-0 items-center gap-1.5 px-4 py-2 rounded-md bg-brand text-white text-[13px] font-medium hover:bg-brand-hover transition-colors"
        >
          View Funding Schemes
          <ArrowRight className="size-3.5" />
        </Link>
      </Card>
    </section>
  );
}
