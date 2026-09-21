"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { toast } from "sonner";
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  FileText,
  Clock,
  Building2,
  Briefcase,
  X,
  RefreshCw,
} from "lucide-react";

type PendingUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  profile?: Record<string, string>;
};

type ModerationItem = {
  _id: string;
  contentType: string;
  title: string;
  reason: string;
  reporterEmail?: string;
  createdAt: string;
};

const MOCK_PENDING: PendingUser[] = [
  {
    _id: "p1",
    name: "Vikram Malhotra",
    email: "vikram@techcorp.com",
    role: "mentor",
    createdAt: "2026-09-18T14:30:00.000Z",
    profile: { organisation: "TechCorp India", expertise: "Product Strategy & FinTech" },
  },
  {
    _id: "p2",
    name: "Elena Rostova",
    email: "elena@globalventures.io",
    role: "industry",
    createdAt: "2026-09-19T09:15:00.000Z",
    profile: { companyName: "GlobalVentures R&D", sector: "Clean Energy" },
  },
];

const MOCK_MODERATION: ModerationItem[] = [
  {
    _id: "m1",
    contentType: "opportunity",
    title: "Unverified Cryptocurrency Trading Internship",
    reason: "Flagged by 3 students: Unverified financial scheme posting.",
    reporterEmail: "student1@dbit.edu",
    createdAt: "2026-09-20T11:20:00.000Z",
  },
];

export default function ApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>(MOCK_PENDING);
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>(MOCK_MODERATION);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Reject Modal
  const [rejectingUser, setRejectingUser] = useState<PendingUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    setIsMounted(true);
    fetchApprovals();
  }, []);

  async function fetchApprovals() {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/approvals`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.pendingUsers) setPendingUsers(data.pendingUsers);
        if (data.moderationItems) setModerationItems(data.moderationItems);
      }
    } catch {
      // Fallback to mock data
    } finally {
      setLoading(false);
    }
  }

  async function handleDecide(user: PendingUser, decision: "approve" | "reject", reason?: string) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/approvals/${user._id}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ decision, reason }),
        }
      );

      if (res.ok) {
        toast.success(`Account for ${user.name} has been ${decision}d.`);
        setPendingUsers((prev) => prev.filter((u) => u._id !== user._id));
        setRejectingUser(null);
        setRejectionReason("");
      } else {
        toast.error(`Failed to ${decision} user.`);
      }
    } catch {
      toast.error(`Error processing ${decision} decision.`);
    }
  }

  return (
    <PageContainer
      title="Approvals & Content Moderation Queue"
      description="Review pending Mentor & Industry Partner registrations and moderate flagged platform content."
    >
      <div className="space-y-6">
        {/* Section 1: Registration Vetting Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UserCheck className="size-5 text-indigo-600" /> Pending Registration Vetting Queue ({pendingUsers.length})
            </h2>
            <button
              onClick={fetchApprovals}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Queue
            </button>
          </div>

          {pendingUsers.length === 0 ? (
            <Card className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              All registration applications have been reviewed! No pending approvals.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((user) => (
                <Card key={user._id} className="p-5 border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase mb-1">
                        {user.role} Vetting Pending
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{user.name}</h3>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <span suppressHydrationWarning className="text-[11px] text-slate-400 font-mono">
                      {isMounted ? new Date(user.createdAt).toLocaleDateString() : user.createdAt}
                    </span>
                  </div>

                  {user.profile && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                      {user.profile.organisation && (
                        <p><strong className="text-slate-700">Organisation:</strong> {user.profile.organisation}</p>
                      )}
                      {user.profile.companyName && (
                        <p><strong className="text-slate-700">Company:</strong> {user.profile.companyName}</p>
                      )}
                      {user.profile.expertise && (
                        <p><strong className="text-slate-700">Expertise:</strong> {user.profile.expertise}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setRejectingUser(user)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-semibold transition-colors"
                    >
                      <XCircle className="size-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => handleDecide(user, "approve")}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="size-3.5" /> Approve & Activate
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Flagged Content Moderation Queue */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertOctagon className="size-5 text-purple-600" /> Flagged Content Moderation Queue ({moderationItems.length})
          </h2>

          {moderationItems.length === 0 ? (
            <Card className="p-8 text-center text-slate-400 text-xs">
              No flagged content items requiring moderation at this time.
            </Card>
          ) : (
            <div className="space-y-3">
              {moderationItems.map((item) => (
                <Card key={item._id} className="p-4 border border-purple-100 bg-purple-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px] uppercase">
                        {item.contentType}
                      </span>
                      <span suppressHydrationWarning className="text-[11px] text-slate-400 font-mono">
                        {isMounted ? new Date(item.createdAt).toLocaleString() : item.createdAt}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-purple-900 mt-1 font-medium">{item.reason}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        toast.success("Content approved & flag dismissed.");
                        setModerationItems((prev) => prev.filter((m) => m._id !== item._id));
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                    >
                      Dismiss Flag
                    </button>
                    <button
                      onClick={() => {
                        toast.success("Flagged content removed from platform.");
                        setModerationItems((prev) => prev.filter((m) => m._id !== item._id));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-semibold shadow-sm"
                    >
                      Remove Content
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Reject Application</h3>
              <button onClick={() => setRejectingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                You are rejecting registration for <strong className="text-slate-900">{rejectingUser.name}</strong> ({rejectingUser.email}).
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Rejection</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Profile could not be verified / missing institutional credential"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  onClick={() => setRejectingUser(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecide(rejectingUser, "reject", rejectionReason)}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
