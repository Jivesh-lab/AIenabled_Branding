"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import {
  LayoutDashboard,
  Shield,
  FileText,
  Users,
  Settings,
  Activity,
  Layers,
} from "lucide-react";
import { NavSection } from "@/components/shared/DashboardSidebar";

const SUPER_ADMIN_NAV: NavSection[] = [
  {
    label: "Main",
    items: [
      {
        href: "/workspace/super-admin/dashboard",
        icon: LayoutDashboard,
        label: "Super Admin Portal",
      },
      {
        href: "/workspace/student/dashboard",
        icon: Layers,
        label: "Workspace Switcher",
      },
    ],
  },
  {
    label: "Governance & Security",
    items: [
      {
        href: "/workspace/super-admin/dashboard#audit-logs",
        icon: FileText,
        label: "System Audit Logs",
      },
      {
        href: "/workspace/super-admin/dashboard#security-policy",
        icon: Shield,
        label: "Security & MFA Policy",
      },
    ],
  },
];

const mockSuperAdminUser = {
  name: "System Owner",
  role: "Super Admin",
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
