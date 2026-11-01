"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import {
  LayoutDashboard,
  Shield,
  FileText,
  Users,
  Layers,
  Megaphone,
  Sparkles,
  Zap,
  Activity,
} from "lucide-react";
import { NavSection } from "@/components/shared/DashboardSidebar";

const SUPER_ADMIN_NAV: NavSection[] = [
  {
    label: "Super Admin Controls",
    items: [
      {
        href: "/workspace/super-admin/dashboard?tab=overview",
        icon: LayoutDashboard,
        label: "Control Center",
      },
      {
        href: "/workspace/super-admin/dashboard?tab=users",
        icon: Users,
        label: "User Management",
      },
      {
        href: "/workspace/super-admin/dashboard?tab=workspaces",
        icon: Layers,
        label: "Workspace Inspector",
      },
      {
        href: "/workspace/super-admin/dashboard?tab=announce",
        icon: Megaphone,
        label: "Broadcast Center",
      },
    ],
  },
  {
    label: "AI Agent Governance",
    items: [
      {
        href: "/workspace/super-admin/mentor-matching",
        icon: Sparkles,
        label: "Mentor-Matching Agent",
      },
      {
        href: "/workspace/super-admin/workflow",
        icon: Zap,
        label: "Workflow Agent",
      },
      {
        href: "/workspace/super-admin/monitoring",
        icon: Activity,
        label: "Monitoring Agent",
      },
    ],
  },
  {
    label: "Governance & Security",
    items: [
      {
        href: "/workspace/super-admin/dashboard?tab=audit",
        icon: FileText,
        label: "System Audit Logs",
      },
      {
        href: "/workspace/super-admin/dashboard?tab=security",
        icon: Shield,
        label: "Security & MFA Policy",
      },
    ],
  },
];

const mockSuperAdminUser = {
  name: "Super Admin",
  role: "System Owner",
  initials: "SA",
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BaseWorkspaceLayout
      sections={SUPER_ADMIN_NAV}
      user={mockSuperAdminUser}
      workspaceLabel="Super Admin Control System"
      allowedRole="super_admin"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
