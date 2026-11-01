"use client";

import { useSession } from "next-auth/react";
import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  ShieldCheck,
  UserCheck,
  Users,
  Briefcase,
  LayoutDashboard,
  Sparkles,
  Zap,
  Activity,
} from "lucide-react";

const COORDINATOR_SECTIONS: NavSection[] = [
  {
    label: "Governance & Approvals",
    items: [
      { label: "Coordinator Control", icon: ShieldCheck, href: "/workspace/faculty/coordinator" },
      { label: "Management Hub", icon: Briefcase, href: "/workspace/faculty" },
    ],
  },
  {
    label: "Autonomous AI Agents",
    items: [
      { label: "AI Mentor Matching", icon: Sparkles, href: "/workspace/faculty/mentor-matching" },
      { label: "AI Workflow Automation", icon: Zap, href: "/workspace/faculty/workflow" },
      { label: "AI Startup Monitoring", icon: Activity, href: "/workspace/faculty/monitoring" },
    ],
  },
  {
    label: "Incubation Teams",
    items: [
      { label: "Student Projects", icon: Users, href: "/workspace/faculty/student-projects" },
      { label: "Research Oversight", icon: LayoutDashboard, href: "/workspace/faculty/oversight" },
    ],
  },
];

const VOLUNTEER_SECTIONS: NavSection[] = [
  {
    label: "Student Mentorship & Guidance",
    items: [
      { label: "Volunteer Workdesk", icon: UserCheck, href: "/workspace/faculty/volunteer" },
      { label: "Assigned Projects", icon: Users, href: "/workspace/faculty/student-projects" },
      { label: "AI Startup Monitoring", icon: Activity, href: "/workspace/faculty/monitoring" },
      { label: "Team Oversight", icon: Briefcase, href: "/workspace/faculty/oversight" },
    ],
  },
];

const DEFAULT_FACULTY_SECTIONS: NavSection[] = [
  {
    label: "Faculty Workspace",
    items: [
      { label: "Coordinator Portal", icon: ShieldCheck, href: "/workspace/faculty/coordinator" },
      { label: "Volunteer Portal", icon: UserCheck, href: "/workspace/faculty/volunteer" },
      { label: "Student Projects", icon: Users, href: "/workspace/faculty/student-projects" },
    ],
  },
  {
    label: "Autonomous AI Agents",
    items: [
      { label: "AI Mentor Matching", icon: Sparkles, href: "/workspace/faculty/mentor-matching" },
      { label: "AI Workflow Automation", icon: Zap, href: "/workspace/faculty/workflow" },
      { label: "AI Startup Monitoring", icon: Activity, href: "/workspace/faculty/monitoring" },
    ],
  },
];

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const userEmail = (session?.user?.email || "").toLowerCase();
  const facultyRole = (session?.user as Record<string, unknown> | undefined)?.facultyRole as string | undefined;

  const isVolunteer = facultyRole === "volunteer" || userEmail.includes("volunteer");
  const isCoordinator = facultyRole === "coordinator" || userEmail.includes("coordinator");

  const sections = isVolunteer
    ? VOLUNTEER_SECTIONS
    : isCoordinator
    ? COORDINATOR_SECTIONS
    : DEFAULT_FACULTY_SECTIONS;

  const displayName = session?.user?.name || (isVolunteer ? "Prof. Faculty Volunteer" : "Dr. Faculty Coordinator");
  const displayRole = isVolunteer ? "Faculty Volunteer" : "Faculty Coordinator";

  return (
    <BaseWorkspaceLayout
      sections={sections}
      user={{
        name: displayName,
        role: displayRole,
        initials: isVolunteer ? "FV" : "FC",
      }}
      workspaceLabel={isVolunteer ? "Faculty Volunteer Workspace" : "Faculty Coordinator Workspace"}
      allowedRole="faculty"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
