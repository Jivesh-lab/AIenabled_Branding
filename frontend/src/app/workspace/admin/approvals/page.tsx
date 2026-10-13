"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { toast } from "sonner";
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  RefreshCw,
  X,
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
    role: "investor",
    createdAt: "2026-09-19T09:15:00.000Z",
    profile: { firmName: "GlobalVentures Capital", investmentFocus: "Clean Energy & DeepTech" },
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

  // Decline Modal
  const [decliningUser, setDecliningUser] = useState<PendingUser | null>(null);
  const [declineReason, setDeclineReason] = useState("");

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

  async function handleDecide(user: PendingUser, decision: "approve" | "decline", reason?: string) {
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
        if (decision === "approve") {
          toast.success(`Account for ${user.name} has been approved.`);
        } else {
          toast.success(`Account application for ${user.name} has been declined.`);
        }
        setPendingUsers((prev) => prev.filter((u) => u._id !== user._id));
        setDecliningUser(null);
        setDeclineReason("");
      } else {
        toast.error(`Unable to ${decision} application.`);
      }
    } catch {
      toast.error(`Error processing ${decision} decision.`);
    }
  }

  return (
    <PageContainer
      title="Credential Vetting & Moderation Queue"
      description="Review incoming Mentor and Industry Partner registrations and adjudicate flagged platform submissions."
    >
      <div className="space-y-6">
        {/* Section 1: Registration Vetting Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink flex items-center gap-2">
              <UserCheck className="size-4 text-indigo-700" />
              Registration Vetting Queue ({pendingUsers.length})
            </h2>
            <button
              type="button"
              onClick={fetchApprovals}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line bg-white text-muted-ink hover:text-ink hover:bg-slate-50 text-[12px] font-medium transition-colors"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="p-8 text-center rounded-lg border border-dashed border-line bg-white">
              <CheckCircle2 className="size-6 mx-auto text-emerald-600 mb-2 opacity-80" />
              <p className="text-[13px] font-medium text-ink">All registration applications have been reviewed</p>
              <p className="text-[12px] text-muted-ink mt-0.5">No accounts are currently pending vetting.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((user) => (
                <div
                  key={user._id}
                  className="rounded-lg border border-line bg-white p-5 space-y-3 transition-colors hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 mb-1.5">
                        {user.role === "mentor" ? "Mentor vetting" : "Industry partner accreditation"}
                      </span>
                      <h3 className="text-[15px] font-semibold text-ink">{user.name}</h3>
                      <p className="text-[13px] text-muted-ink">{user.email}</p>
                    </div>
                    <span suppressHydrationWarning className="text-[11px] text-slate-400 tabular-nums">
                      {isMounted ? new Date(user.createdAt).toLocaleDateString() : user.createdAt}
                    </span>
                  </div>

                  {user.profile && (
                    <div className="p-3 rounded-md bg-[#FAFBFB] border border-line/60 text-[12px] space-y-1">
                      {user.profile.organisation && (
                        <p><span className="text-muted-ink">Organisation:</span> <strong className="font-medium text-ink">{user.profile.organisation}</strong></p>
                      )}
                      {user.profile.firmName && (
                        <p><span className="text-muted-ink">Firm:</span> <strong className="font-medium text-ink">{user.profile.firmName}</strong></p>
                      )}
                      {user.profile.investmentFocus && (
                        <p><span className="text-muted-ink">Thesis:</span> <span className="text-ink">{user.profile.investmentFocus}</span></p>
                      )}
                      {user.profile.expertise && (
                        <p><span className="text-muted-ink">Expertise:</span> <span className="text-ink">{user.profile.expertise}</span></p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-line/60">
                    <button
                      type="button"
                      onClick={() => setDecliningUser(user)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white border border-line text-red-700 hover:bg-red-50 text-[12px] font-medium transition-colors"
                    >
                      <XCircle className="size-3.5" /> Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecide(user, "approve")}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 text-[12px] font-medium transition-colors"
                    >
                      <CheckCircle2 className="size-3.5" /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Flagged Content Moderation Queue */}
        <div className="space-y-3 pt-6 border-t border-line">
          <h2 className="text-[15px] font-semibold text-ink flex items-center gap-2">
            <AlertOctagon className="size-4 text-purple-700" />
            Reported Content Moderation ({moderationItems.length})
          </h2>

          {moderationItems.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-line bg-white text-[13px] text-muted-ink">
              No content items flagged for moderation at this time.
            </div>
          ) : (
            <div className="space-y-3">
              {moderationItems.map((item) => (
                <div
                  key={item._id}
                  className="rounded-lg border border-line bg-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-medium text-[11px] border border-purple-200/50 capitalize">
                        {item.contentType}
                      </span>
                      <h4 className="text-[14px] font-semibold text-ink">{item.title}</h4>
                    </div>
                    <p className="text-[13px] text-red-800 mt-1">{item.reason}</p>
                    {item.reporterEmail && (
                      <p className="text-[11px] text-muted-ink mt-0.5">
                        Reported by: {item.reporterEmail}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        toast.success("Content report dismissed.");
                        setModerationItems((prev) => prev.filter((m) => m._id !== item._id));
                      }}
                      className="px-3 py-1.5 rounded-md border border-line bg-white text-ink text-[12px] font-medium hover:bg-slate-50 transition-colors"
                    >
                      Dismiss Report
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toast.success("Flagged content removed.");
                        setModerationItems((prev) => prev.filter((m) => m._id !== item._id));
                      }}
                      className="px-3 py-1.5 rounded-md bg-red-700 text-white text-[12px] font-medium hover:bg-red-800 transition-colors"
                    >
                      Remove Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Decline Confirmation Modal */}
      {decliningUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-white p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-[15px] font-semibold text-ink">Decline Application</h3>
              <button
                type="button"
                onClick={() => setDecliningUser(null)}
                className="text-slate-400 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-[13px] text-muted-ink">
              Specify the rationale for declining the registration of{" "}
              <strong className="font-medium text-ink">{decliningUser.name}</strong> ({decliningUser.email}).
            </p>

            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Unverified organizational credentials, duplicate applicant..."
              className="w-full p-2.5 text-[13px] border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white text-ink resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setDecliningUser(null)}
                className="px-3.5 py-1.5 rounded-md border border-line text-[12px] font-medium text-muted-ink hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecide(decliningUser, "decline", declineReason)}
                className="px-3.5 py-1.5 rounded-md bg-red-700 text-white text-[12px] font-medium hover:bg-red-800"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
