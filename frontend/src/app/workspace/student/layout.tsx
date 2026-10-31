"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  LayoutDashboard,
  FolderKanban,
  Route,
  CalendarDays,
  Coins,
} from "lucide-react";

const FALLBACK_USER = {
  name: "Student",
  role: "Student",
  initials: "ST",
};

const STUDENT_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/workspace/student/dashboard" }],
  },
  {
    label: "Innovation",
    items: [
      { label: "My Projects", icon: FolderKanban, href: "/workspace/student/projects" },
      { label: "Funding & Grants", icon: Coins, href: "/workspace/student/funding" },
    ],
  },
  {
    label: "Collaboration",
    items: [
      { label: "Journey Timeline", icon: Route, href: "/workspace/student/journey" },
      { label: "Meetings", icon: CalendarDays, href: "/workspace/student/meetings" },
    ],
  },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseWorkspaceLayout
      sections={STUDENT_SECTIONS}
      user={FALLBACK_USER}
      workspaceLabel="Student Workspace"
      allowedRole="student"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
