"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  LayoutDashboard,
  Lightbulb,
  FolderKanban,
  Sparkles,
  Route,
  CalendarDays,
  Files,
  Landmark,
  CircleHelp,
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
      { label: "Ideation Sandbox", icon: Lightbulb, href: "/workspace/student/ideation" },
      { label: "AI Co-founder Matchmaking", icon: Sparkles, href: "/workspace/student/ai-match", isAI: true },
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
  {
    label: "Resources",
    items: [
      { label: "Documents", icon: Files, href: "/workspace/student/documents" },
      { label: "Funding", icon: Landmark, href: "/workspace/student/funding" },
    ],
  },
  {
    label: "Support",
    items: [{ label: "Help & Support", icon: CircleHelp, href: "/workspace/student/support" }],
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
