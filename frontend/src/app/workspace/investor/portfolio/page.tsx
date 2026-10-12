"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { Briefcase, Building2, ExternalLink } from "lucide-react";

export default function PortfolioPage() {
  return (
    <PageContainer
      title="My Portfolio"
      description="Track equity holdings and operational governance for invested companies."
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-line rounded-xl bg-card p-6">
          <Briefcase className="size-10 text-muted-ink/40 mb-3" />
          <h3 className="text-sm font-semibold text-ink">No portfolio companies recorded</h3>
          <p className="text-xs text-muted-ink mt-1 max-w-sm">
            Once an introduction progresses into a formal investment term sheet, your incubated portfolio positions will be tracked here.
          </p>
          <Link
            href="/workspace/investor/opportunities"
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
          >
            <Building2 className="size-3.5" /> Explore Approved Startups
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
