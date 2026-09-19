"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  LayoutDashboard,
  TrendingUp,
  FolderOpen,
  Zap,
  Target,
  FileCheck2
} from "lucide-react";

const MOCK_USER = {
  name: "Sarah Investor",
  role: "Investor",
  initials: "SI",
};

const INVESTOR_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/workspace/investor/dashboard" }],
  },
  {
    label: "Deal Flow",
    items: [
      { label: "Pitch Deck Queue", icon: FileCheck2, href: "/workspace/investor/pitch-queue", isAI: true },
      { label: "AI Matchmaking", icon: Zap, href: "/workspace/investor/matchmaking", isAI: true },
      { label: "Opportunities", icon: Target, href: "/workspace/investor/opportunities" },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { label: "My Portfolio", icon: FolderOpen, href: "/workspace/investor/portfolio" },
      { label: "Traction Dashboards", icon: TrendingUp, href: "/workspace/investor/traction" },
    ],
  },
];

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseWorkspaceLayout
      sections={INVESTOR_SECTIONS}
      user={MOCK_USER}
      workspaceLabel="Investor Workspace"
      allowedRole="investor"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
