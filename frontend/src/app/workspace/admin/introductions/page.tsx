"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { toast } from "sonner";
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  User,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  MessageSquare,
  RefreshCw,
  X,
  Filter,
} from "lucide-react";

type InvestorInfo = {
  _id: string;
  name: string;
  email: string;
  isInvestorVerified?: boolean;
  profile?: {
    firmName?: string;
    firmType?: string;
    checkSizeMin?: number;
    checkSizeMax?: number;
  };
};

type StartupInfo = {
  _id: string;
  name: string;
  sector?: string;
  stage?: string;
};

type IntroductionItem = {
  _id: string;
  investorId: InvestorInfo | null;
  startupId: StartupInfo | null;
  type: "expression_of_interest" | "meeting_request";
  message: string;
  proposedTimes?: string[];
  status: "pending_admin_review" | "forwarded_to_founder" | "declined";
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
};

export default function AdminIntroductionsPage() {
  const [introductions, setIntroductions] = useState<IntroductionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending_admin_review");
  const [isMounted, setIsMounted] = useState(false);

  // Decision Modal State
  const [selectedIntro, setSelectedIntro] = useState<IntroductionItem | null>(null);
  const [decisionType, setDecisionType] = useState<"forward" | "decline">("forward");
  const [adminNotes, setAdminNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  async function fetchQueue(status: string) {
    try {
      const url =
        status === "all"
          ? "/api/admin/investors/introductions"
          : `/api/admin/investors/introductions?status=${encodeURIComponent(status)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setIntroductions(data.introductions || []);
      } else {
        toast.error(data.message || "Failed to load introduction queue.");
      }
    } catch (err) {
      console.error("Queue fetch error:", err);
      toast.error("Network error while loading queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) {
        setIsMounted(true);
        await fetchQueue(filterStatus);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [filterStatus]);

  async function handleConfirmDecision() {
    if (!selectedIntro) return;
    setSubmittingDecision(true);
    try {
      const res = await fetch(`/api/admin/investors/introductions/${selectedIntro._id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decisionType,
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          decisionType === "forward"
            ? "Introduction successfully forwarded to founder."
            : "Introduction request declined."
        );
        setSelectedIntro(null);
        setAdminNotes("");
        fetchQueue(filterStatus);
      } else {
        toast.error(data.message || `Failed to ${decisionType} introduction.`);
      }
    } catch (err) {
      console.error("Decision error:", err);
      toast.error(`Error processing ${decisionType} decision.`);
    } finally {
      setSubmittingDecision(false);
    }
  }

  const pendingCount = introductions.filter((i) => i.status === "pending_admin_review").length;

  return (
    <PageContainer
      title="Investor Introduction Review"
      description="Review expressions of interest and meeting requests submitted by verified investors before forwarding them to founders."
    >
      <div className="space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Filter Status:</span>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setFilterStatus("pending_admin_review")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterStatus === "pending_admin_review"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setFilterStatus("forwarded_to_founder")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterStatus === "forwarded_to_founder"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Forwarded
              </button>
              <button
                onClick={() => setFilterStatus("declined")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterStatus === "declined"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Declined
              </button>
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterStatus === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </button>
            </div>
          </div>

          <button
            onClick={() => fetchQueue(filterStatus)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Queue
          </button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : introductions.length === 0 ? (
          <Card className="p-12 text-center text-slate-500">
            <CheckCircle2 className="size-10 mx-auto text-emerald-500 mb-3 opacity-80" />
            <h3 className="text-sm font-semibold text-slate-900">
              {filterStatus === "pending_admin_review"
                ? "No pending introduction requests"
                : "No introduction requests found"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {filterStatus === "pending_admin_review"
                ? "All investor introduction requests have been reviewed and processed."
                : "No introduction requests match the selected status filter."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {introductions.map((item) => {
              const isPending = item.status === "pending_admin_review";
              const isForwarded = item.status === "forwarded_to_founder";
              const isDeclined = item.status === "declined";

              return (
                <Card key={item._id} className="p-5 border border-slate-200 hover:border-slate-300 transition-colors space-y-4">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium ${
                          item.type === "meeting_request"
                            ? "bg-purple-50 text-purple-800 border border-purple-200/50"
                            : "bg-blue-50 text-blue-800 border border-blue-200/50"
                        }`}
                      >
                        {item.type === "meeting_request" ? (
                          <>
                            <Calendar className="size-3" /> Meeting Request
                          </>
                        ) : (
                          <>
                            <MessageSquare className="size-3" /> Expression of Interest
                          </>
                        )}
                      </span>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          isPending
                            ? "bg-amber-50 text-amber-900 border border-amber-200/60"
                            : isForwarded
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                            : "bg-red-50 text-red-800 border border-red-200/60"
                        }`}
                      >
                        {isPending ? "Pending Admin Review" : isForwarded ? "Forwarded to Founder" : "Declined"}
                      </span>
                    </div>

                    <span suppressHydrationWarning className="text-xs text-slate-400 font-mono">
                      Submitted: {isMounted ? new Date(item.createdAt).toLocaleString() : item.createdAt}
                    </span>
                  </div>

                  {/* Context Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Investor Context */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-slate-600 flex items-center gap-1.5">
                          <User className="size-3.5 text-indigo-600" /> Investor
                        </span>
                        {item.investorId?.isInvestorVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="size-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <ShieldAlert className="size-3" /> Unverified
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.investorId?.name || "Unknown Investor"}</h4>
                        <p className="text-xs text-slate-500">{item.investorId?.email || "No email"}</p>
                      </div>

                      {item.investorId?.profile?.firmName && (
                        <p className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">Firm:</span> {item.investorId.profile.firmName}{" "}
                          {item.investorId.profile.firmType ? `(${item.investorId.profile.firmType})` : ""}
                        </p>
                      )}
                    </div>

                    {/* Startup Target Context */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                      <span className="text-[12px] font-medium text-slate-600 flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-blue-600" /> Target Startup
                      </span>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.startupId?.name || "Unknown Startup"}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {item.startupId?.sector && (
                            <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                              {item.startupId.sector}
                            </span>
                          )}
                          {item.startupId?.stage && (
                            <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                              {item.startupId.stage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message & Proposal */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                    <p className="text-[12px] font-medium text-slate-600">Investor Message</p>
                    <p className="text-xs text-slate-800 leading-relaxed italic bg-slate-50/50 p-2.5 rounded border border-slate-100">
                      &quot;{item.message}&quot;
                    </p>

                    {item.proposedTimes && item.proposedTimes.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-600 mb-1">Proposed Meeting Windows:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.proposedTimes.map((time, idx) => (
                            <span key={idx} className="text-[11px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded">
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.adminNotes && (
                      <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Admin Notes:</span> {item.adminNotes}
                      </div>
                    )}
                  </div>

                  {/* Actions (Only if Pending) */}
                  {isPending && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedIntro(item);
                          setDecisionType("decline");
                          setAdminNotes("");
                        }}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-semibold transition-colors"
                      >
                        <XCircle className="size-3.5" /> Decline Request
                      </button>
                      <button
                        onClick={() => {
                          setSelectedIntro(item);
                          setDecisionType("forward");
                          setAdminNotes("");
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-sm transition-colors"
                      >
                        <Send className="size-3.5" /> Forward to Founder
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Confirmation Modal */}
      {selectedIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {decisionType === "forward" ? "Forward Introduction to Founder" : "Decline Introduction"}
              </h3>
              <button
                onClick={() => setSelectedIntro(null)}
                className="text-slate-400 hover:text-slate-600"
                disabled={submittingDecision}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                {decisionType === "forward" ? (
                  <>
                    You are forwarding the introduction from{" "}
                    <strong className="text-slate-900">{selectedIntro.investorId?.name || "Investor"}</strong> to the founder of{" "}
                    <strong className="text-slate-900">{selectedIntro.startupId?.name || "Startup"}</strong>.
                  </>
                ) : (
                  <>
                    You are declining the introduction request from{" "}
                    <strong className="text-slate-900">{selectedIntro.investorId?.name || "Investor"}</strong>. The request will not be shown to the founder.
                  </>
                )}
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {decisionType === "forward" ? "Internal Admin Notes (Optional)" : "Reason for Declining (Optional)"}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    decisionType === "forward"
                      ? "Optional context or follow-up notes for the record..."
                      : "e.g. Investor thesis mismatch, insufficient detail..."
                  }
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedIntro(null)}
                  disabled={submittingDecision}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecision}
                  disabled={submittingDecision}
                  className={`px-4 py-2 rounded-lg font-semibold text-xs text-white shadow-sm transition-colors ${
                    decisionType === "forward"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {submittingDecision ? "Processing..." : decisionType === "forward" ? "Confirm & Forward" : "Confirm Decline"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
