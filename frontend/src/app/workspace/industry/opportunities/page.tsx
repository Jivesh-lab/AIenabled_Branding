import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { Handshake, Building2, Calendar, Users } from "lucide-react";

const OPPORTUNITIES = [
  { name: "AgriTech Pilot with GreenGrow", domain: "Deep Tech", type: "Pilot project", status: "Open", date: "2026-12-15", startups: 2 },
  { name: "Healthcare AI Mentorship", domain: "HealthTech", type: "Mentorship", status: "Open", date: "2026-11-30", startups: 3 },
  { name: "Clean Energy Hackathon", domain: "CleanTech", type: "Competition", status: "Registering", date: "2027-01-20", startups: 1 },
  { name: "Industry Speaker Series", domain: "EdTech", type: "Talk", status: "Open", date: "2026-12-05", startups: 0 },
] as const;

export default function IndustryOpportunitiesPage() {
  return (
    <PageContainer title="Collaboration Opportunities" description="Only opportunities authorized for your verified industry account appear here.">
      <div className="space-y-6">
        <PageHeader
          title="Collaboration Opportunities"
          description="Review, filter, and connect with researcher startups and programmes that match your industry expertise."
          action={{ label: "All Opportunities", href: "/workspace/industry/opportunities" }}
        />

        <SectionHeading title="Open opportunities" subtitle="Filter by domain or type to narrow the list." />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {OPPORTUNITIES.map((op) => (
            <Card key={op.name} className="p-5 flex flex-col">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-soft text-brand">{op.domain}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${op.status === "Open" ? "bg-emerald-50/50 border border-emerald-200 text-emerald-700" : "bg-amber-50/50 border border-amber-200 text-amber-700"}`}>
                  {op.status}
                </span>
              </div>
              <h3 className="text-base font-bold text-ink mb-1">{op.name}</h3>
              <p className="text-[12px] text-muted-ink mb-4 flex-1">{op.type} opportunity for verified industry partners.</p>
              <div className="grid grid-cols-2 gap-2 mb-4 text-[11px] text-muted-ink">
                <div>
                  <span className="block text-[10px] font-medium text-muted-ink uppercase">Startups</span>
                  <span className="block text-ink font-semibold">{op.startups}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-muted-ink uppercase">Respond by</span>
                  <span className="block text-ink font-semibold">{op.date}</span>
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[12px] font-semibold text-ink transition-colors hover:bg-canvas">
                  <Building2 className="size-3.5" /> Review
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-brand-hover">
                  <Handshake className="size-3.5" /> Connect
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
