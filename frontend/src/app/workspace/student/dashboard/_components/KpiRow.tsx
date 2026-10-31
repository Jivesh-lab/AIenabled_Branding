import Link from "next/link";
import { CalendarDays, ClipboardCheck, FolderKanban, Target } from "lucide-react";
import { Card } from "@/components/shared/Surface";

export default function KpiRow({
  projects = [],
  meetings = [],
  loading = false,
}: {
  projects?: any[];
  meetings?: any[];
  loading?: boolean;
}) {
  const activeProjectsCount = projects.length;
  const pendingReviewsCount = projects.filter(
    (p: any) =>
      p.status === "pending" ||
      p.status === "in_review" ||
      p.stage === "Faculty Review" ||
      p.stage === "Under Review"
  ).length;
  const upcomingMeetingsCount = meetings.filter(
    (m: any) => m.invitationStatus !== "Completed" && m.status !== "cancelled"
  ).length;
  const milestonesDueCount = projects.reduce(
    (acc: number, p: any) => acc + (p.overdueMilestonesCount || (p.progress < 100 ? 1 : 0)),
    0
  );

  const stats = [
    {
      id: "active-projects",
      label: "Active Projects",
      value: loading ? "—" : activeProjectsCount,
      icon: FolderKanban,
      href: "/workspace/student/projects",
    },
    {
      id: "pending-reviews",
      label: "Pending Reviews",
      value: loading ? "—" : pendingReviewsCount,
      icon: ClipboardCheck,
      href: "/workspace/student/journey",
    },
    {
      id: "upcoming-meetings",
      label: "Upcoming Meetings",
      value: loading ? "—" : upcomingMeetingsCount,
      icon: CalendarDays,
      href: "/workspace/student/meetings",
    },
    {
      id: "milestones-due",
      label: "Milestones Due",
      value: loading ? "—" : milestonesDueCount,
      icon: Target,
      href: "/workspace/student/journey",
    },
  ];

  return (
    <section aria-label="At a glance">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.id} href={stat.href} className="block">
            <Card interactive className="flex h-full items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-muted-ink">{stat.label}</p>
                <p className="mt-1 text-[28px] font-bold leading-none text-brand">{stat.value}</p>
              </div>
              <stat.icon className="size-[18px] shrink-0 text-brand-cyan" aria-hidden="true" />
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
