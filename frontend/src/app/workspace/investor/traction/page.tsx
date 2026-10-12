"use client";

import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { TrendingUp, Building2 } from "lucide-react";

export default function TractionPage() {
  return (
    <PageContainer
      title="Traction Dashboards"
      description="Post-investment operational telemetry and financial KPI metrics."
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-line rounded-xl bg-card p-6">
          <TrendingUp className="size-10 text-muted-ink/40 mb-3" />
          <h3 className="text-sm font-semibold text-ink">No traction reports available</h3>
          <p className="text-xs text-muted-ink mt-1 max-w-sm">
            Live telemetry and operational monthly reporting become active once portfolio agreements and introduction milestones conclude.
          </p>
          <Link
            href="/workspace/investor/opportunities"
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
          >
            <Building2 className="size-3.5" /> View Active Opportunities
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
