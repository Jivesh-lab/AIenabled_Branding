import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import { Card, SectionHeading, StatusBadge, MaturityTag } from "@/components/shared/Surface";
import { Users, Lightbulb, Building2, BarChart3, Calendar, ArrowRight } from "lucide-react";

const PORTFOLIO_ITEMS = [
  ["Make-a-thon Project", "Ideation", "Lightbulb", "submitted 2 weeks ago"],
  ["Clean Energy Prototype", "Prototype", "Building2", "in review"],
  ["AgriSense Pilot", "MVP", "BarChart3", "approved"],
];

export default function ProfilePage() {
  return (
    <PageContainer>
      <PageHeader title="My Profile" description="Your personal details, project activity, and incubation status." />
      <div className="space-y-8">
        {/* Profile header */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-[18px] font-bold text-white">DS</div>
              <div>
                <h2 className="text-lg font-bold text-ink">Devansh Sharma</h2>
                <p className="text-[12px] text-muted-ink">Student · Computer Science & Engineering</p>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand">
                  Verified student account · Roll: CS2021-042
                  <Users className="size-3.5" />
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <StatusBadge label="Founder" tone="success" />
                <StatusBadge label="Active" tone="success" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/workspace/student/settings" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[12px] font-semibold text-ink transition-colors hover:bg-canvas">
                <ArrowRight className="size-3.5" /> Edit profile
              </Link>
            </div>
          </div>
        </Card>

        {/* Project summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <SectionHeading title="Project portfolio" subtitle="Your saved and submitted projects across the incubation pipeline." />
            <Link href="/workspace/student/projects" className="text-[12px] font-bold text-brand transition-colors hover:text-brand-deep">View all <ArrowRight className="size-3.5" /></Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {PORTFOLIO_ITEMS.map(([name, stage, iconName, meta]) => {
              const Icon = iconName === "Lightbulb" ? Lightbulb : iconName === "Building2" ? Building2 : BarChart3;
              return (
                <div key={name} className="p-4 rounded-xl border border-line bg-white">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-canvas text-brand mb-3">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="text-[13px] font-bold text-ink mb-1">{name}</h3>
                  <MaturityTag label={stage} />
                  <p className="mt-1 text-[11px] text-muted-ink">{meta}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Incubation status */}
        <Card className="p-6">
          <SectionHeading title="Incubation status" subtitle="Where you stand in the incubation journey and what to do next." />
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-canvas">
              <div>
                <p className="text-[12px] font-medium text-ink">Application status</p>
                <p className="text-[11px] text-muted-ink">Submitted · Under faculty review</p>
              </div>
              <StatusBadge label="In review" tone="progress" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-canvas">
              <div>
                <p className="text-[12px] font-medium text-ink">Next milestone</p>
                <p className="text-[11px] text-muted-ink">Mentor onboarding meeting</p>
              </div>
              <span className="text-[11px] font-medium text-brand">Nov 15, 2026</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-canvas">
              <div>
                <p className="text-[12px] font-medium text-ink">Assigned mentor</p>
                <p className="text-[11px] text-muted-ink">Not yet assigned</p>
              </div>
              <Link href="/workspace/student/meetings" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand transition-colors">
                Schedule meeting <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
