"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import { LayoutDashboard, Handshake } from "lucide-react";
import type { NavSection } from "@/components/shared/DashboardSidebar";

const INDUSTRY_SECTIONS: NavSection[] = [
  { label: "Overview", items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/workspace/industry/dashboard" }] },
  { label: "Collaboration", items: [{ label: "Collaboration Opportunities", icon: Handshake, href: "/workspace/industry/opportunities" }] },
];

export default function IndustryLayout({ children }: { children: React.ReactNode }) {
  return <BaseWorkspaceLayout sections={INDUSTRY_SECTIONS} user={{ name: "Industry Partner", role: "Industry", initials: "IP" }} workspaceLabel="Industry Workspace" allowedRole="industry">{children}</BaseWorkspaceLayout>;
}
