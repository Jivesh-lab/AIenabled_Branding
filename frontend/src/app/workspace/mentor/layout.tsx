"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CheckSquare,
  Files,
  AlertCircle,
  Sparkles
} from "lucide-react";

const MOCK_USER = {
  name: "Dr. Mentor",
  role: "Mentor",
  initials: "DM",
};

const MENTOR_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/workspace/mentor/dashboard" }],
  },
  {
    label: "Mentorship",
    items: [
      { label: "My Mentees", icon: Users, href: "/workspace/mentor/mentees" },
      { label: "Startup Roadblocks", icon: AlertCircle, href: "/workspace/mentor/roadblocks" },
      { label: "Schedule", icon: CalendarDays, href: "/workspace/mentor/schedule" },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { label: "AI Meeting Summaries", icon: Sparkles, href: "/workspace/mentor/meeting-summaries", isAI: true },
    ],
  },
  {
    label: "Evaluation",
    items: [
      { label: "Feedback", icon: CheckSquare, href: "/workspace/mentor/feedback" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Shared Resources", icon: Files, href: "/workspace/mentor/resources" },
    ],
  },
];

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseWorkspaceLayout
      sections={MENTOR_SECTIONS}
      user={MOCK_USER}
      workspaceLabel="Mentor Workspace"
      allowedRole="mentor"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
