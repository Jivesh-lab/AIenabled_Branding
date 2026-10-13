"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  LayoutDashboard,
  FolderKanban,
  Route,
  CalendarDays,
} from "lucide-react";

const MOCK_USER = {
  name: "Riya Patel",
  role: "Student",
  initials: "RP",
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
      user={MOCK_USER}
      workspaceLabel="Student Workspace"
      allowedRole="student"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
