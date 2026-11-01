"use client";

import { useSession } from "next-auth/react";
import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  BriefcaseIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UserCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { Sparkles, Zap, Activity } from "lucide-react";

const COORDINATOR_SECTIONS: NavSection[] = [
  {
    label: "Governance & Approvals",
    items: [
      { label: "Coordinator Control", icon: ShieldCheckIcon, href: "/workspace/faculty/coordinator" },
      { label: "Management Hub", icon: BriefcaseIcon, href: "/workspace/faculty" },
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
      { label: "Researcher Projects", icon: UsersIcon, href: "/workspace/faculty/student-projects" },
      { label: "Research Oversight", icon: Squares2X2Icon, href: "/workspace/faculty/oversight" },
    ],
  },
];

const VOLUNTEER_SECTIONS: NavSection[] = [
  {
    label: "Researcher Mentorship & Guidance",
    items: [
      { label: "Volunteer Workdesk", icon: UserCircleIcon, href: "/workspace/faculty/volunteer" },
      { label: "Assigned Projects", icon: UsersIcon, href: "/workspace/faculty/student-projects" },
      { label: "AI Startup Monitoring", icon: Activity, href: "/workspace/faculty/monitoring" },
      { label: "Team Oversight", icon: BriefcaseIcon, href: "/workspace/faculty/oversight" },
    ],
  },
];

const DEFAULT_FACULTY_SECTIONS: NavSection[] = [
  {
    label: "Faculty Workspace",
    items: [
      { label: "Coordinator Portal", icon: ShieldCheckIcon, href: "/workspace/faculty/coordinator" },
      { label: "Volunteer Portal", icon: UserCircleIcon, href: "/workspace/faculty/volunteer" },
      { label: "Researcher Projects", icon: UsersIcon, href: "/workspace/faculty/student-projects" },
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
      waitForSession
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
