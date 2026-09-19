"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  LayoutDashboard,
  BarChart4,
  Rocket,
  Wand2,
  Newspaper,
  Presentation
} from "lucide-react";

const MOCK_USER = {
  name: "Alex Founder",
  role: "Startup / Alumni",
  initials: "AF",
};

const STARTUP_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/workspace/startup/dashboard" }],
  },
  {
    label: "Growth & Ops",
    items: [
      { label: "KPI Tracking", icon: BarChart4, href: "/workspace/startup/kpis" },
      { label: "Burn Rate", icon: Rocket, href: "/workspace/startup/burn-rate" },
    ],
  },
  {
    label: "Brand & PR",
    items: [
      { label: "AI Branding Engine", icon: Wand2, href: "/workspace/startup/branding", isAI: true },
      { label: "Pitch Decks", icon: Presentation, href: "/workspace/startup/pitch-decks", isAI: true },
      { label: "Press Releases", icon: Newspaper, href: "/workspace/startup/pr", isAI: true },
    ],
  },
];

export default function StartupLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseWorkspaceLayout
      sections={STARTUP_SECTIONS}
      user={MOCK_USER}
      workspaceLabel="Startup Workspace"
      allowedRole="startup"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
