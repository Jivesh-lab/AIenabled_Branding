"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  LayoutDashboard,
  ShieldAlert,
  Calculator,
  FileText,
  Users,
  Briefcase,
  ShieldCheck,
  UserCheck
} from "lucide-react";

const MOCK_USER = {
  name: "Dr. Faculty Member",
  role: "Faculty",
  initials: "FM",
};

const FACULTY_SECTIONS: NavSection[] = [
  {
    label: "Governance & Roles",
    items: [
      { label: "Faculty Coordinator", icon: ShieldCheck, href: "/workspace/faculty/coordinator" },
      { label: "Faculty Volunteer", icon: UserCheck, href: "/workspace/faculty/volunteer" },
      { label: "Management Hub", icon: Briefcase, href: "/workspace/faculty" },
      { label: "Research Dashboard", icon: LayoutDashboard, href: "/workspace/faculty/dashboard" },
    ],
  },
  {
    label: "Incubation Teams",
    items: [
      { label: "Student Projects", icon: Users, href: "/workspace/faculty/student-projects" },
      { label: "Research Oversight", icon: Briefcase, href: "/workspace/faculty/oversight" },
    ],
  },
  {
    label: "IP & Grants",
    items: [
      { label: "IP Development", icon: ShieldAlert, href: "/workspace/faculty/ip" },
      { label: "TRL Calculator", icon: Calculator, href: "/workspace/faculty/trl-calculator", isAI: true },
      { label: "Grant Drafting", icon: FileText, href: "/workspace/faculty/grant-drafting", isAI: true },
    ],
  },
];

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseWorkspaceLayout
      sections={FACULTY_SECTIONS}
      user={MOCK_USER}
      workspaceLabel="Faculty Workspace"
      allowedRole="faculty"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
