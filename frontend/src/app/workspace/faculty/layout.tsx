"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  LayoutDashboard,
  ShieldAlert,
  Calculator,
  FileText,
  Users,
  Briefcase
} from "lucide-react";

const MOCK_USER = {
  name: "Dr. Faculty Member",
  role: "Faculty",
  initials: "FM",
};

const FACULTY_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/workspace/faculty/dashboard" }],
  },
  {
    label: "IP & Research",
    items: [
      { label: "IP Development", icon: ShieldAlert, href: "/workspace/faculty/ip" },
      { label: "TRL Calculator", icon: Calculator, href: "/workspace/faculty/trl-calculator", isAI: true },
      { label: "Grant Drafting", icon: FileText, href: "/workspace/faculty/grant-drafting", isAI: true },
    ],
  },
  {
    label: "Supervision",
    items: [
      { label: "Student Projects", icon: Users, href: "/workspace/faculty/student-projects" },
      { label: "Research Oversight", icon: Briefcase, href: "/workspace/faculty/oversight" },
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
