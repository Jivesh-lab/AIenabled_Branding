"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageContainer from "@/components/shared/PageContainer";
import {
  Shield,
  Users,
  Activity,
  Lock,
  LayoutDashboard,
  Eye,
  Bell,
  UserCog,
  RefreshCw,
  Search,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  Key,
  Trash2,
  UserCheck,
  Megaphone,
  GraduationCap,
  Briefcase,
  Award,
  TrendingUp,
  Building2,
  ArrowRight,
  ShieldCheck,
  FileText,
} from "lucide-react";
import Link from "next/link";
import AuditLogViewer from "../_components/AuditLogViewer";
import SecurityPolicyPanel from "../_components/SecurityPolicyPanel";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  roleBreakdown: Record<string, number>;
  moderationItemsCount: number;
  pendingApprovalsCount: number;
  mentorStudentRatio: string;
}

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  isInvestorVerified?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: UserCog },
  { id: "workspaces", label: "Workspace Inspector", icon: Eye },
  { id: "announce", label: "Broadcast", icon: Megaphone },
  { id: "audit", label: "Audit Logs", icon: FileText },
  { id: "security", label: "Security Policy", icon: Shield },
] as const;

type TabId = (typeof TABS)[number]["id"];

const ROLE_COLORS: Record<string, string> = {
  student: "bg-blue-100 text-blue-800",
  faculty: "bg-purple-100 text-purple-800",
  mentor: "bg-emerald-100 text-emerald-800",
  investor: "bg-cyan-100 text-cyan-800",
  admin: "bg-orange-100 text-orange-800",
  super_admin: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const WORKSPACES = [
  {
    title: "Student Workspace",
    role: "student",
    path: "/workspace/student/dashboard",
    icon: GraduationCap,
    color: "from-blue-500/10 to-indigo-500/10 border-blue-200",
    iconColor: "text-blue-600",
    badgeColor: "bg-blue-100 text-blue-800",
    description: "Inspect student project submissions, milestone trackers, meeting requests, and team profiles.",
  },
  {
    title: "Faculty Workspace",
    role: "faculty",
    path: "/workspace/faculty/dashboard",
    icon: Award,
    color: "from-purple-500/10 to-pink-500/10 border-purple-200",
    iconColor: "text-purple-600",
    badgeColor: "bg-purple-100 text-purple-800",
    description: "Inspect project evaluations, academic research supervision, grade rubric assignments, and approvals.",
  },
  {
    title: "Mentor Workspace",
    role: "mentor",
    path: "/workspace/mentor/dashboard",
    icon: Briefcase,
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-200",
    iconColor: "text-emerald-600",
    badgeColor: "bg-emerald-100 text-emerald-800",
    description: "Inspect assigned mentorship sessions, feedback logs, availability calendar, and guidance history.",
  },
  {
    title: "Investor Workspace",
    role: "investor",
    path: "/workspace/investor/dashboard",
    icon: TrendingUp,
    color: "from-cyan-500/10 to-blue-500/10 border-cyan-200",
    iconColor: "text-cyan-600",
    badgeColor: "bg-cyan-100 text-cyan-800",
    description: "Inspect deal flow pipeline, venture evaluation decks, funding rounds, cap tables, and pitch requests.",
  },
  {
    title: "Admin Workspace",
    role: "admin",
    path: "/workspace/admin/dashboard",
    icon: Building2,
    color: "from-orange-500/10 to-amber-500/10 border-orange-200",
    iconColor: "text-orange-600",
    badgeColor: "bg-orange-100 text-orange-800",
    description: "Inspect admin control panel: cohort management, user approvals, announcement board, and moderation.",
  },
];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-[11px] font-semibold mt-0.5 text-slate-500">{sub}</p>}
      </div>
      <div className={`flex size-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-5" />
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, loading }: { stats: SystemStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 border border-slate-200" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        <AlertCircle className="size-5 mx-auto mb-2" />
        Failed to load system stats. Backend may be unavailable.
      </div>
    );
  }

  const roleStat = (role: string) => stats.roleBreakdown?.[role] ?? 0;

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          sub={`${stats.activeUsers} active`}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Pending Approvals"
          value={stats.pendingApprovalsCount}
          sub="Awaiting review"
          icon={UserCheck}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Moderation Queue"
          value={stats.moderationItemsCount}
          sub="Items flagged"
          icon={AlertCircle}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          label="Mentor:Student Ratio"
          value={stats.mentorStudentRatio}
          sub="Current cohort"
          icon={Activity}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Role breakdown */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Users by Role</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {["student", "faculty", "mentor", "investor", "admin", "super_admin"].map((role) => (
            <div
              key={role}
              className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm"
            >
              <p className="text-2xl font-bold text-slate-900">{roleStat(role)}</p>
              <span
                className={`mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ROLE_COLORS[role] || "bg-slate-100 text-slate-700"}`}
              >
                {role.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Security status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <ShieldCheck className="size-5 text-emerald-600" />
          <div>
            <p className="text-xs text-emerald-700 font-semibold">2FA Enforcement</p>
            <p className="text-sm font-bold text-emerald-900">TOTP Active (RFC 6238)</p>
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
          <Lock className="size-5 text-blue-600" />
          <div>
            <p className="text-xs text-blue-700 font-semibold">Super Admin Access</p>
            <p className="text-sm font-bold text-blue-900">CLI Seed Only (No Signup)</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <FileText className="size-5 text-amber-600" />
          <div>
            <p className="text-xs text-amber-700 font-semibold">Audit Trail</p>
            <p className="text-sm font-bold text-amber-900">MongoDB AuditLog Active</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Management Tab ──────────────────────────────────────────────────────

function UserManagementTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionTarget, setActionTarget] = useState<UserRow | null>(null);
  const [actionType, setActionType] = useState<"reset" | "role" | "deactivate" | null>(null);
  const [actionValue, setActionValue] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`${API}/api/admin/users?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function submitAction() {
    if (!actionTarget || !actionType) return;
    setSubmitting(true);
    setActionMsg(null);
    try {
      let res: Response;
      if (actionType === "reset") {
        res = await fetch(`${API}/api/admin/users/${actionTarget._id}/reset-password`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: actionValue || undefined, mustChangePassword: true }),
        });
      } else if (actionType === "role") {
        res = await fetch(`${API}/api/admin/users/${actionTarget._id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: actionValue }),
        });
      } else {
        // deactivate
        res = await fetch(`${API}/api/admin/users/${actionTarget._id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "inactive" }),
        });
      }
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ type: "ok", text: data.message || "Action completed." });
        await fetchUsers();
      } else {
        setActionMsg({ type: "err", text: data.message || "Action failed." });
      }
    } catch {
      setActionMsg({ type: "err", text: "Network error. Check backend connection." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "student", "faculty", "mentor", "investor", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
                roleFilter === r
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {r === "all" ? "All Roles" : r}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["all", "active", "pending", "inactive"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
                statusFilter === s
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "All Status" : s}
            </button>
          ))}
        </div>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Name / Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-3 w-40 rounded bg-slate-100" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-16 rounded bg-slate-100" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-14 rounded bg-slate-100" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-20 rounded bg-slate-100" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-24 rounded bg-slate-100 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ROLE_COLORS[u.role] || "bg-slate-100 text-slate-700"}`}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${STATUS_COLORS[u.status] || ""}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          title="Reset Password"
                          onClick={() => { setActionTarget(u); setActionType("reset"); setActionValue(""); setActionMsg(null); }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors text-slate-500"
                        >
                          <Key className="size-3.5" />
                        </button>
                        <button
                          title="Change Role"
                          onClick={() => { setActionTarget(u); setActionType("role"); setActionValue(u.role); setActionMsg(null); }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-slate-500"
                        >
                          <UserCog className="size-3.5" />
                        </button>
                        {u.status === "active" && u.role !== "super_admin" && (
                          <button
                            title="Deactivate"
                            onClick={() => { setActionTarget(u); setActionType("deactivate"); setActionValue(""); setActionMsg(null); }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors text-slate-500"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors">← Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {actionType === "reset" && "Reset Password"}
                  {actionType === "role" && "Change Role"}
                  {actionType === "deactivate" && "Deactivate Account"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {actionTarget.name} · {actionTarget.email}
                </p>
              </div>
              <button onClick={() => { setActionTarget(null); setActionType(null); }} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="size-4" />
              </button>
            </div>

            {actionMsg && (
              <div className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${actionMsg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {actionMsg.type === "ok" ? <Check className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                {actionMsg.text}
              </div>
            )}

            {actionType === "reset" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">New Password (leave blank to auto-generate)</label>
                <input
                  type="text"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder="Auto-generate if empty"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <p className="text-[11px] text-slate-400">User will be required to change their password on next login.</p>
              </div>
            )}

            {actionType === "role" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">New Role</label>
                <select
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {["student", "faculty", "mentor", "investor", "admin"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {actionType === "deactivate" && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 border border-red-100">
                This will set the user&apos;s account status to <strong>inactive</strong>. They will be unable to log in until reactivated.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setActionTarget(null); setActionType(null); }}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-60"
              >
                {submitting ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Workspace Inspector Tab ───────────────────────────────────────────────────

function WorkspaceInspectorTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">System Workspace Inspection Switcher</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Instantly navigate into any role workspace below without needing separate credentials.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
          <ShieldCheck className="size-3.5" /> Full Access Unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKSPACES.map((ws) => {
          const IconComponent = ws.icon;
          return (
            <div
              key={ws.role}
              className={`rounded-xl border bg-gradient-to-br ${ws.color} p-5 flex flex-col justify-between hover:shadow-md transition-all duration-200 group`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100">
                    <IconComponent className={`size-5 ${ws.iconColor}`} />
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ws.badgeColor}`}>
                    {ws.role.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {ws.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{ws.description}</p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Eye className="size-3" /> Read / Inspect Mode
                </span>
                <Link
                  href={ws.path}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Inspect View <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Broadcast Tab ─────────────────────────────────────────────────────────────

function BroadcastTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [announcements, setAnnouncements] = useState<{ _id: string; title: string; targetRole: string; priority: string; createdAt: string }[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    setLoadingList(true);
    fetch(`${API}/api/admin/announcements`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.announcements) setAnnouncements(d.announcements); })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [msg]);

  async function handlePublish() {
    if (!title.trim() || !body.trim()) {
      setMsg({ type: "err", text: "Title and message body are required." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/admin/announcements`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), targetRole, priority }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "ok", text: "Announcement published to all matching users." });
        setTitle("");
        setBody("");
      } else {
        setMsg({ type: "err", text: data.message || "Failed to publish." });
      }
    } catch {
      setMsg({ type: "err", text: "Network error." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Compose form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Megaphone className="size-5 text-indigo-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Broadcast Announcement</h2>
            <p className="text-xs text-slate-500">Send a system-wide message to one or more role groups.</p>
          </div>
        </div>

        {msg && (
          <div className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg.type === "ok" ? <Check className="size-3.5" /> : <AlertCircle className="size-3.5" />}
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Target Audience</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="all">All Users (System-wide)</option>
              <option value="student">Students Only</option>
              <option value="faculty">Faculty Coordinators</option>
              <option value="mentor">Mentors</option>
              <option value="investor">Investors</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Announcement Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. System Maintenance on 15 Nov 2026"
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Message Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Write your announcement here..."
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handlePublish}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60"
          >
            {submitting ? <RefreshCw className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
            Publish Announcement
          </button>
        </div>
      </div>

      {/* Recent announcements */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Recent Announcements</h3>
        {loadingList ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-slate-100" />)}
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No announcements published yet.</p>
        ) : (
          announcements.slice(0, 10).map((a) => (
            <div key={a._id} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
              <div>
                <p className="text-xs font-semibold text-slate-900">{a.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Target: <span className="font-medium capitalize">{a.targetRole}</span> · {new Date(a.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                a.priority === "urgent" ? "bg-red-50 text-red-700 border-red-200" :
                a.priority === "high" ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                {a.priority}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard Page ───────────────────────────────────────────────────────

function SuperAdminDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "overview"
  );
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabSelect = (tabId: TabId) => {
    setActiveTab(tabId);
    router.replace(`/workspace/super-admin/dashboard?tab=${tabId}`, { scroll: false });
  };

  useEffect(() => {
    setStatsLoading(true);
    fetch(`${API}/api/admin/stats`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.stats) setStats(d.stats); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <PageContainer
      title="Super Admin Control Center"
      description="Full system access portal — user management, workspace inspection, broadcast, audit trail, and security governance."
    >
      <div className="space-y-5">
        {/* Tab navigation */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-0 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && <OverviewTab stats={stats} loading={statsLoading} />}
        {activeTab === "users" && <UserManagementTab />}
        {activeTab === "workspaces" && <WorkspaceInspectorTab />}
        {activeTab === "announce" && <BroadcastTab />}
        {activeTab === "audit" && <AuditLogViewer />}
        {activeTab === "security" && <SecurityPolicyPanel />}
      </div>
    </PageContainer>
  );
}

export default function SuperAdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Super Admin Control Center...</div>}>
      <SuperAdminDashboardContent />
    </Suspense>
  );
}
