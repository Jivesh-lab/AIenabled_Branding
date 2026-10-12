"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  AlertCircle,
  X
} from "lucide-react";

type ApplicationQueueItem = {
  id: string;
  startupName: string;
  domain: string;
  status: string;
  maturity: string;
  applicantId: string;
  submittedAt: string | null;
};

type ApplicationDetails = {
  id: string;
  startup: {
    name: string;
    tagline: string;
    problem: string;
    solution: string;
    sector: string;
    stage: string;
  };
  status: string;
  aiSummary: string;
  aiFeedback: string;
  formData: Record<string, unknown>;
  documents: Record<string, unknown>[];
  submittedAt: string | null;
};

export default function ApplicationsReviewPage() {
  const [queue, setQueue] = useState<ApplicationQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [selectedApp, setSelectedApp] = useState<ApplicationDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"approved" | "rejected" | "revision_requested">("approved");
  const [comments, setComments] = useState("");

  useEffect(() => {
    setIsMounted(true);
    fetchQueue();
  }, []);

  async function fetchQueue() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/applications/queue");
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  }

  async function viewDetails(id: string) {
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/applications/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedApp(data);
      } else {
        toast.error("Failed to load application details");
      }
    } catch {
      toast.error("Error fetching details");
    } finally {
      setDetailsLoading(false);
    }
  }

  function openDecisionModal(type: "approved" | "rejected" | "revision_requested") {
    setDecisionType(type);
    setComments("");
    setDecisionModalOpen(true);
  }

  async function submitDecision() {
    if (!selectedApp) return;

    if (decisionType === "revision_requested" && !comments.trim()) {
      toast.error("Comments are required for revision requests");
      return;
    }

    try {
      const res = await fetch(`/api/admin/applications/${selectedApp.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: decisionType, comments })
      });

      if (res.ok) {
        toast.success(`Application marked as ${decisionType}`);
        setDecisionModalOpen(false);
        setSelectedApp(null);
        fetchQueue();
      } else {
        const data = await res.json();
        toast.error(data.message || data.detail || "Failed to submit decision");
      }
    } catch {
      toast.error("Error submitting decision");
    }
  }

  return (
    <PageContainer
      title="Startup Applications Review"
      description="Review and decide on startup incubation applications."
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Queue */}
        <div className={`space-y-4 ${selectedApp ? 'w-full lg:w-1/3' : 'w-full'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="size-5 text-indigo-600" /> Pending Queue ({queue.length})
            </h2>
            <button
              onClick={fetchQueue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {queue.length === 0 ? (
            <Card className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              All caught up! No applications await your review.
            </Card>
          ) : (
            <div className={`grid grid-cols-1 ${!selectedApp ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}>
              {queue.map((app) => (
                <div 
                  key={app.id} 
                  className={`p-4 rounded-xl border bg-white shadow-sm ${selectedApp?.id === app.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'} cursor-pointer hover:border-indigo-300 transition-all`}
                  onClick={() => viewDetails(app.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') viewDetails(app.id); }}
                >
                  <div className="flex justify-between items-start">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase mb-2">
                      {app.status.replace("_", " ")}
                    </span>
                    <span suppressHydrationWarning className="text-[10px] text-slate-400">
                      {isMounted && app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Unknown date'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm truncate">{app.startupName}</h3>
                  <p className="text-xs text-slate-500 truncate">{app.domain} • {app.maturity}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details Pane */}
        {selectedApp && (
          <div className="w-full lg:w-2/3">
            <Card className="p-6 border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedApp.startup.name}</h2>
                  <p className="text-sm text-slate-500">{selectedApp.startup.tagline}</p>
                </div>
                <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="size-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 font-semibold block text-xs">Sector</span>
                  {selectedApp.startup.sector}
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-xs">Stage</span>
                  {selectedApp.startup.stage}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <span className="text-slate-500 font-semibold block text-xs">Problem</span>
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedApp.startup.problem}</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <span className="text-slate-500 font-semibold block text-xs">Solution</span>
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedApp.startup.solution}</p>
              </div>

              {selectedApp.aiSummary && (
                <div className="space-y-2 text-sm bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <span className="text-indigo-800 font-semibold flex items-center gap-1.5 text-xs">
                    <AlertCircle className="size-3.5" /> AI Analysis Summary
                  </span>
                  <p className="text-indigo-900/80 text-xs leading-relaxed">{selectedApp.aiSummary}</p>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => openDecisionModal("rejected")}
                  className="px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-semibold"
                >
                  Reject
                </button>
                <button
                  onClick={() => openDecisionModal("revision_requested")}
                  className="px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold"
                >
                  Request Revision
                </button>
                <button
                  onClick={() => openDecisionModal("approved")}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-sm"
                >
                  Approve Application
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* DECISION MODAL */}
      {decisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 capitalize">{decisionType.replace("_", " ")} Application</h3>
              <button onClick={() => setDecisionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                You are about to mark <strong className="text-slate-900">{selectedApp?.startup.name}</strong> as <strong className="uppercase">{decisionType.replace("_", " ")}</strong>.
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Comments {decisionType === "revision_requested" && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  placeholder={decisionType === "revision_requested" ? "Please specify what needs to be changed..." : "Optional internal comments..."}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  onClick={() => setDecisionModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={submitDecision}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                >
                  Confirm Decision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
