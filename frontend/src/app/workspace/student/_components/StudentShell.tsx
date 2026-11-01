"use client";

import BaseWorkspaceLayout from "@/components/shared/BaseWorkspaceLayout";
import StudentSearch from "./StudentSearch";
import type { NavbarUser } from "@/components/shared/DashboardNavbar";
import { NavSection } from "@/components/shared/DashboardSidebar";
import {
  BanknotesIcon,
  CalendarDaysIcon,
  FolderIcon,
  MapIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

const STUDENT_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: Squares2X2Icon, href: "/workspace/student/dashboard" }],
  },
  {
    label: "Innovation",
    items: [
      { label: "My Projects", icon: FolderIcon, href: "/workspace/student/projects" },
      { label: "Funding & Grants", icon: BanknotesIcon, href: "/workspace/student/funding" },
    ],
  },
  {
    label: "Collaboration",
    items: [
      { label: "Journey Timeline", icon: MapIcon, href: "/workspace/student/journey" },
      { label: "Meetings", icon: CalendarDaysIcon, href: "/workspace/student/meetings" },
    ],
  },
];

/** `user` comes from the server-verified session (see ../layout.tsx), not a placeholder. */
export default function StudentShell({ user, children }: { user: NavbarUser; children: React.ReactNode }) {
  // `student-portal` scopes the "no visible scrollbars" rule in globals.css to this workspace only.
  return (
    <div className="student-portal">
      <BaseWorkspaceLayout
        sections={STUDENT_SECTIONS}
        user={user}
        workspaceLabel="Researcher Workspace"
        allowedRole="student"
        searchSlot={<StudentSearch />}
      >
        {children}
      </BaseWorkspaceLayout>
    </div>
  );
}
