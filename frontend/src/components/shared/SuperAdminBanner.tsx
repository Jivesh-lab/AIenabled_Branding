"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Shield, Eye, ArrowLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const WORKSPACE_OPTIONS = [
  { label: "Super Admin Portal", path: "/workspace/super-admin/dashboard" },
  { label: "Admin Operational Workspace", path: "/workspace/admin/dashboard" },
  { label: "Student Workspace", path: "/workspace/student/dashboard" },
  { label: "Faculty Workspace", path: "/workspace/faculty/dashboard" },
  { label: "Mentor Workspace", path: "/workspace/mentor/dashboard" },
  { label: "Investor Workspace", path: "/workspace/investor/dashboard" },
];

export default function SuperAdminBanner() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isSuperAdmin = session?.user?.role === "super_admin";
  const isAdmin = session?.user?.role === "admin";

  if (!session?.user || (!isSuperAdmin && !isAdmin)) {
    return null;
  }

  const isHomeWorkspace = isSuperAdmin
    ? pathname.startsWith("/workspace/super-admin")
    : pathname.startsWith("/workspace/admin");

  const returnPath = isSuperAdmin
    ? "/workspace/super-admin/dashboard"
    : "/workspace/admin/dashboard";

  const returnLabel = isSuperAdmin ? "Return to Super Admin" : "Return to Admin Portal";

  return (
    <div className="w-full bg-slate-900 text-slate-100 border-b border-amber-500/30 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md z-50 sticky top-0">
      <div className="flex items-center gap-2 font-medium">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold tracking-wide uppercase text-[10px]">
          <Shield className="size-3 text-amber-400" />
          {isSuperAdmin ? "Super Admin Mode" : "Admin Oversight Mode"}
        </span>
        <span className="text-slate-300 hidden sm:inline">
          {isHomeWorkspace ? (
            isSuperAdmin ? "System Owner Portal — Full Administrative Access" : "Operational Admin Workspace — Management Portal"
          ) : (
            <span className="flex items-center gap-1 text-amber-200">
              <Eye className="size-3.5" /> Inspecting Workspace View (Read/Inspect)
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor="ws-switcher" className="text-slate-400 text-[11px] hidden md:inline">
            Switch View:
          </label>
          <select
            id="ws-switcher"
            value={WORKSPACE_OPTIONS.find((w) => pathname.startsWith(w.path))?.path || ""}
            onChange={(e) => {
              if (e.target.value) {
                router.push(e.target.value);
              }
            }}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-400 outline-none"
          >
            <option value="" disabled>Select Workspace View...</option>
            {WORKSPACE_OPTIONS.map((ws) => (
              <option key={ws.path} value={ws.path}>
                {ws.label}
              </option>
            ))}
          </select>
        </div>

        {!isHomeWorkspace && (
          <Link
            href={returnPath}
            className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded transition-colors text-xs font-medium"
          >
            <ArrowLeft className="size-3" />
            {returnLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
