"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Eye,
  BarChart3,
  Megaphone,
  FileText,
  Settings,
} from "lucide-react";
import { NavSection } from "@/components/shared/DashboardSidebar";

const ADMIN_NAV: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/workspace/admin/dashboard",
        icon: LayoutDashboard,
        label: "Admin Dashboard",
      },
      {
        href: "/workspace/admin/users",
        icon: Users,
        label: "User Management",
      },
      {
        href: "/workspace/admin/approvals",
        icon: UserCheck,
        label: "Approvals & Vetting",
      },
    ],
  },
  {
    label: "Operations & Oversight",
    items: [
      {
        href: "/workspace/admin/workspaces",
        icon: Eye,
        label: "Workspace Oversight",
      },
      {
        href: "/workspace/admin/reports",
        icon: BarChart3,
        label: "Reports & Analytics",
      },
      {
        href: "/workspace/admin/announcements",
        icon: Megaphone,
        label: "Announcements",
      },
    ],
  },
  {
    label: "Governance",
    items: [
      {
        href: "/workspace/admin/audit",
        icon: FileText,
        label: "Admin Audit Log",
      },
      {
        href: "/workspace/admin/settings",
        icon: Settings,
        label: "Settings",
      },
    ],
  },
];

const mockAdminUser = {
  name: "Operations Manager",
  role: "Admin",
  initials: "AM",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BaseWorkspaceLayout
      sections={ADMIN_NAV}
      user={mockAdminUser}
      workspaceLabel="Admin Operational Portal"
      allowedRole="admin"
    >
      {children}
    </BaseWorkspaceLayout>
  );
}
