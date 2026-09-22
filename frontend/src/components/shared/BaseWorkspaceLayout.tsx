"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardNavbar, { NavbarUser } from "@/components/shared/DashboardNavbar";
import DashboardSidebar, { NavSection } from "@/components/shared/DashboardSidebar";
import SuperAdminBanner from "@/components/shared/SuperAdminBanner";

export type AllowedRole =
  | "student"
  | "faculty"
  | "mentor"
  | "industry"
  | "investor"
  | "startup"
  | "admin"
  | "super_admin";

interface BaseWorkspaceLayoutProps {
  children: React.ReactNode;
  sections: NavSection[];
  user: NavbarUser;
  workspaceLabel: string;
  allowedRole: AllowedRole;
}

export default function BaseWorkspaceLayout({
  children,
  sections,
  user: staticUser,
  workspaceLabel,
  allowedRole,
}: BaseWorkspaceLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { data: session } = useSession();

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  const openMobile = useCallback(() => setIsMobileOpen(true), []);

  // Prefer real session data; fall back to static mock during dev/SSR
  const user: NavbarUser = session?.user
    ? {
        name: session.user.name ?? staticUser.name,
        role:
          session.user.role
            ? (session.user.role.charAt(0).toUpperCase() +
               session.user.role.slice(1))
            : staticUser.role,
        initials: session.user.name
          ? session.user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          : staticUser.initials,
      }
    : staticUser;

  // Note: route-level RBAC is enforced by middleware.ts at the Edge.
  // This component does not need a client-side guard; it simply
  // renders for the authenticated+authorised user that passed middleware.

  return (
    <div className="flex flex-col min-h-screen w-full bg-canvas">
      <SuperAdminBanner />
      <div className="flex flex-1 min-w-0">
        <DashboardSidebar
          sections={sections}
          user={user}
          isMobileOpen={isMobileOpen}
          onMobileClose={closeMobile}
        />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardNavbar
          workspaceLabel={workspaceLabel}
          user={user}
          notificationCount={4}
          onMenuClick={openMobile}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  </div>
);
}
