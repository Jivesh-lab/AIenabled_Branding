"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  Squares2X2Icon,
  UsersIcon,
} from "@heroicons/react/24/outline";

const FALLBACK_USER = {
  name: "Mentor",
  role: "Mentor",
  initials: "ME",
};

const MENTOR_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: Squares2X2Icon, href: "/workspace/mentor/dashboard" }],
  },
  {
    label: "Mentorship",
    items: [
      { label: "My Mentees", icon: UsersIcon, href: "/workspace/mentor/mentees" },
      { label: "Startup Roadblocks", icon: ExclamationCircleIcon, href: "/workspace/mentor/roadblocks" },
      { label: "Schedule", icon: CalendarDaysIcon, href: "/workspace/mentor/schedule" },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { label: "AI Meeting Summaries", icon: SparklesIcon, href: "/workspace/mentor/meeting-summaries", isAI: true },
    ],
  },
  {
    label: "Evaluation",
    items: [
      { label: "Feedback", icon: CheckCircleIcon, href: "/workspace/mentor/feedback" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Shared Resources", icon: DocumentDuplicateIcon, href: "/workspace/mentor/resources" },
    ],
  },
];

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseWorkspaceLayout
      sections={MENTOR_SECTIONS}
      user={FALLBACK_USER}
      workspaceLabel="Mentor Workspace"
      allowedRole="mentor"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
