"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import type { NavbarUser } from "@/components/shared/DashboardNavbar";
import { NavSection } from "@/components/shared/DashboardSidebar";
import { LayoutDashboard, FolderKanban, Route, CalendarDays, Coins } from "lucide-react";

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

/** `user` comes from the server-verified session (see ../layout.tsx), not a placeholder. */
export default function StudentShell({ user, children }: { user: NavbarUser; children: React.ReactNode }) {
  return (
    <BaseWorkspaceLayout sections={STUDENT_SECTIONS} user={user} workspaceLabel="Student Workspace" allowedRole="student">
      {children}
    </BaseWorkspaceLayout>
  );
}
