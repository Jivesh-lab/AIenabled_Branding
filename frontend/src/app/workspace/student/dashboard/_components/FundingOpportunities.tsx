import Link from "next/link";
import { ArrowRight, Coins } from "lucide-react";
import { Card, SectionHeading } from "@/components/shared/Surface";

export default function FundingOpportunities() {
  return (
    <section aria-label="Funding opportunities">
      <SectionHeading
        title="Funding & Grant Opportunities"
        action={{ label: "Explore all schemes", href: "/workspace/student/funding" }}
      />

      <Card className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-line bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/40">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Coins className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Institutional Incubation & Seed Grants</h3>
            <p className="text-xs text-muted-ink mt-1 max-w-xl leading-relaxed">
              Explore DST NIDHI, MeitY TIDE 2.0, institutional seed funds, and corporate prototype grants available for DBIT student innovators.
            </p>
          </div>
        </div>

        <Link
          href="/workspace/student/funding"
          className="inline-flex shrink-0 items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
        >
          View Funding Schemes
          <ArrowRight className="size-3.5" />
        </Link>
      </Card>
    </section>
  );
}
