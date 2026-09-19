"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import DashboardNavbar, { NavbarUser } from "@/components/shared/DashboardNavbar";
import DashboardSidebar, { NavSection } from "@/components/shared/DashboardSidebar";

interface BaseWorkspaceLayoutProps {
  children: React.ReactNode;
  sections: NavSection[];
  user: NavbarUser;
  workspaceLabel: string;
  allowedRole: "student" | "mentor" | "industry";
}

export default function BaseWorkspaceLayout({
  children,
  sections,
  user,
  workspaceLabel,
  allowedRole,
}: BaseWorkspaceLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Mock Route Guard logic
  useEffect(() => {
    // During this phase, we mock the role in localStorage
    const currentRole = localStorage.getItem("mockUserRole");
    
    if (!currentRole) {
      // If no role, kick to login
      router.push("/login");
      return;
    }

    if (currentRole !== allowedRole) {
      // Redirect to their actual role workspace
      if (currentRole === "student") router.push("/workspace/student/dashboard");
      else if (currentRole === "mentor") router.push("/workspace/mentor/dashboard");
      else if (currentRole === "industry") router.push("/workspace/industry-partner/dashboard");
    }
  }, [allowedRole, router, pathname]);

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  const openMobile = useCallback(() => setIsMobileOpen(true), []);

  return (
    <div className="flex min-h-screen w-full bg-canvas">
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
  );
}
