"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  LayoutDashboard,
  Search,
  Target,
  Inbox,
  CalendarDays,
  FileSignature,
  FileText,
  Wand2
} from "lucide-react";

const MOCK_USER = {
  name: "Jane Partner",
  role: "Industry Partner",
  initials: "JP",
};

const INDUSTRY_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/workspace/industry-partner/dashboard" }],
  },
  {
    label: "Discovery",
    items: [
      { label: "Startup Directory", icon: Search, href: "/workspace/industry-partner/directory" },
      { label: "Tech Matchmaking", icon: Wand2, href: "/workspace/industry-partner/matchmaking", isAI: true },
    ],
  },
  {
    label: "Engagement",
    items: [
      { label: "Problem Statements", icon: FileText, href: "/workspace/industry-partner/problems" },
      { label: "Opportunities", icon: Target, href: "/workspace/industry-partner/opportunities" },
      { label: "Applications", icon: Inbox, href: "/workspace/industry-partner/applications" },
      { label: "Meetings & Events", icon: CalendarDays, href: "/workspace/industry-partner/meetings" },
    ],
  },
  {
    label: "Legal",
    items: [
      { label: "Agreements", icon: FileSignature, href: "/workspace/industry-partner/agreements" },
    ],
  },
];

export default function IndustryPartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseWorkspaceLayout
      sections={INDUSTRY_SECTIONS}
      user={MOCK_USER}
      workspaceLabel="Industry Partner Workspace"
      allowedRole="industry"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
