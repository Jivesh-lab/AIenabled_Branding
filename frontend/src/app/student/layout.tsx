'use client';

/**
 * Student layout — shell that wraps all /student/* routes.
 * Renders: DashboardNavbar (top) + content area.
 * Sidebar will be added in the next component step.
 */
import { useState } from "react";
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
  Menu
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
    label: "Bottom",
    items: [
      { label: "Help & Support", icon: CircleHelp, href: "/student/support" },
    ],
  },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar
        sections={STUDENT_SECTIONS}
        user={MOCK_USER}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <div className="flex w-full items-center bg-white border-b border-[#E2E8F0]">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="md:hidden flex h-10 w-10 items-center justify-center text-slate-500 hover:text-slate-900 ml-2 shrink-0"
          >
            <Menu className="size-5" />
          </button>
          
          <div className="flex-1">
            <DashboardNavbar
              workspaceLabel="Student Workspace"
              user={MOCK_USER}
              notificationCount={4}
            />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
