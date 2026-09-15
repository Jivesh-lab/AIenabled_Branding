"use client";

/**
 * Student layout — the authenticated application shell for all /student/* routes.
 *
 * Shell contract (shared by every role dashboard):
 *   - fixed 240px sidebar (sticky, full viewport height)
 *   - 60px sticky top header
 *   - ONE document-level vertical scrollbar for page content
 *
 * Pages rendered as {children} must NOT set their own height, padding or
 * scroll containers — they wrap their content in <PageContainer /> instead.
 */
import { useCallback, useState } from "react";
import DashboardNavbar from "@/components/shared/DashboardNavbar";
import DashboardSidebar, { NavSection } from "@/components/shared/DashboardSidebar";
import {
  LayoutDashboard,
  Lightbulb,
  FolderKanban,
  Sparkles,
  Route,
  CalendarDays,
  Files,
  Landmark,
  CircleHelp,
} from "lucide-react";

// Mock user — replace with real session data during backend integration.
const MOCK_USER = {
  name: "Riya Patel",
  role: "Student",
  initials: "RP",
};

const STUDENT_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/student/dashboard" }],
  },
  {
    label: "Innovation",
    items: [
      { label: "Submit New Idea", icon: Lightbulb, href: "/student/submit" },
      {
        label: "My Projects",
        icon: FolderKanban,
        subItems: [
          { label: "AI Medical Scanner", href: "/student/projects/1" },
          { label: "Smart Grid Tool", href: "/student/projects/2" },
        ],
      },
      { label: "AI Workspace", icon: Sparkles, href: "/student/ai-workspace", isAI: true },
    ],
  },
  {
    label: "Collaboration",
    items: [
      { label: "Journey Timeline", icon: Route, href: "/student/journey" },
      { label: "Meetings", icon: CalendarDays, href: "/student/meetings" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Documents", icon: Files, href: "/student/documents" },
      { label: "Funding", icon: Landmark, href: "/student/funding" },
    ],
  },
  {
    label: "Support",
    items: [{ label: "Help & Support", icon: CircleHelp, href: "/student/support" }],
  },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Stable identity — the sidebar closes the drawer from an effect on route change.
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  const openMobile = useCallback(() => setIsMobileOpen(true), []);

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <DashboardSidebar
        sections={STUDENT_SECTIONS}
        user={MOCK_USER}
        isMobileOpen={isMobileOpen}
        onMobileClose={closeMobile}
      />

      {/* Main column — min-w-0 keeps wide tables from pushing the shell wider. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardNavbar
          workspaceLabel="Student Workspace"
          user={MOCK_USER}
          notificationCount={4}
          onMenuClick={openMobile}
        />

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
