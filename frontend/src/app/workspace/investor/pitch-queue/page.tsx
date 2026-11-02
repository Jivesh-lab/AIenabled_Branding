"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { toast } from "sonner";
import {
  Bookmark,
  Building2,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
  Clock,
  Trash2,
  ExternalLink,
  Video,
  Bot,
  MessageSquare,
  CheckCircle2,
  Briefcase,
} from "lucide-react";

interface WatchlistItem {
  id: string;
  startupId: string;
  startupName: string;
  tagline: string;
  sector: string;
  stage: string;
  readinessScore: number;
  tags: string[];
  interestLevel: string;
  notes: string;
  savedAt: string;
  pitchDeckUrl: string | null;
  pitchVideoUrl: string | null;
}

export default function PitchQueuePage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes state
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});

  // Meeting modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<WatchlistItem | null>(null);
  const [requestType, setRequestType] = useState<"expression_of_interest" | "meeting_request">("meeting_request");
  const [introMessage, setIntroMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("14:00 - 14:45 IST");
  const [submittingMeet, setSubmittingMeet] = useState(false);
  const [scheduledResult, setScheduledResult] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  async function fetchWatchlist() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/investor/watchlist");
      if (!res.ok) {
        setError("Failed to load your watchlist.");
        return;
      }
      const data = await res.json();
      setItems(data.watchlist || []);
      const notesMap: Record<string, string> = {};
      (data.watchlist || []).forEach((w: WatchlistItem) => {
        notesMap[w.startupId] = w.notes || "";
      });
      setEditingNotes(notesMap);
    } catch {
      setError("Network error loading watchlist.");
    } finally {
      setLoading(false);
    }
  }

  async function updateInterestLevel(startupId: string, interestLevel: string) {
    try {
      const res = await fetch("/api/investor/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId, interestLevel }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.startupId === startupId ? { ...i, interestLevel } : i))
        );
        toast.success(`Priority set to ${interestLevel.replace("_", " ")}.`);
      } else {
        toast.error("Failed to update interest level.");
      }
    } catch {
      toast.error("Network error updating priority.");
    }
  }

  async function saveNotes(startupId: string) {
    setSavingNotes((prev) => ({ ...prev, [startupId]: true }));
    try {
      const noteContent = editingNotes[startupId] || "";
      const currentItem = items.find((i) => i.startupId === startupId);
      const res = await fetch("/api/investor/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId,
          interestLevel: currentItem?.interestLevel || "watching",
          notes: noteContent,
        }),
      });
      if (res.ok) {
        toast.success("Diligence notes saved.");
      } else {
        toast.error("Failed to save notes.");
      }
    } catch {
      toast.error("Network error saving notes.");
    } finally {
      setSavingNotes((prev) => ({ ...prev, [startupId]: false }));
    }
  }

  async function removeItem(startupId: string) {
    try {
      const res = await fetch(`/api/investor/watchlist/${startupId}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.startupId !== startupId));
        toast.success("Removed from pitch queue.");
      } else {
        toast.error("Failed to remove item.");
      }
    } catch {
      toast.error("Network error removing item.");
    }
  }

  function openMeetingModal(item: WatchlistItem, type: "expression_of_interest" | "meeting_request") {
    setTargetItem(item);
    setRequestType(type);
    setIntroMessage(
      type === "meeting_request"
        ? `We have reviewed ${item.startupName}'s materials in our diligence queue and would like to schedule a 30-minute founder discussion regarding seed terms.`
        : `We would like to formally express interest in ${item.startupName}'s upcoming funding round.`
    );
    const d = new Date(Date.now() + 86400000 * 2);
    setPreferredDate(d.toISOString().slice(0, 10));
    setScheduledResult(null);
    setModalOpen(true);
  }

  async function handleScheduleMeet() {
    if (!targetItem) return;
    if (introMessage.trim().length < 10) {
      toast.error("Message must be at least 10 characters.");
      return;
    }

    setSubmittingMeet(true);
    try {
      const res = await fetch("/api/investor/schedule-meet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId: targetItem.startupId,
          preferredDate: preferredDate || undefined,
          preferredTimeSlot: preferredSlot,
          message: introMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScheduledResult(data.meeting);
        toast.success("Meeting scheduled! Confirmation emails dispatched.");
      } else {
        toast.error(data.message || "Failed to coordinate meeting schedule.");
      }
    } catch {
      toast.error("Network error connecting to scheduling agent.");
    } finally {
      setSubmittingMeet(false);
    }
  }

  async function submitInterest() {
    if (!targetItem || introMessage.trim().length < 20) {
      toast.error("Message must be at least 20 characters.");
      return;
    }

    setSubmittingMeet(true);
    try {
      const res = await fetch("/api/investor/introductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId: targetItem.startupId,
          type: "expression_of_interest",
          message: introMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Interest submitted to centre governance!");
        setModalOpen(false);
      } else {
        toast.error(data.message || "Failed to submit request.");
      }
    } catch {
      toast.error("Network error submitting introduction.");
    } finally {
      setSubmittingMeet(false);
    }
  }

  return (
    <PageContainer
      title="Saved Startups & Diligence Pitch Queue"
      description="Startups saved to your private venture deal flow and due diligence queue."
    >
      <div className="space-y-6">
        {/* Header metrics strip */}
        <div className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-white shadow-xs">
          <div className="p-4 sm:p-5">
            <p className="text-[13px] font-medium text-muted-ink">Saved Startups</p>
            <p className="text-[26px] font-semibold text-ink mt-1 tabular-nums">{items.length}</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-[13px] font-medium text-muted-ink">High Interest Ventures</p>
            <p className="text-[26px] font-semibold text-amber-800 mt-1 tabular-nums">
              {items.filter((i) => i.interestLevel === "high_interest").length}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-[13px] font-medium text-muted-ink">Queue Status</p>
            <p className="text-[14px] font-medium text-brand mt-2">
              {items.length > 0 ? "Active Diligence In Progress" : "Queue Empty"}
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-ink">
            <Loader2 className="size-6 animate-spin text-brand mb-2" />
            <p className="text-xs">Loading pitch queue...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center p-6 border border-line rounded-xl bg-card">
            <AlertCircle className="size-8 text-danger mb-2" />
            <p className="text-sm font-semibold text-ink">{error}</p>
            <button
              onClick={fetchWatchlist}
              className="mt-3 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-line rounded-xl bg-card p-6">
            <Bookmark className="size-10 text-muted-ink/40 mb-3" />
            <h3 className="text-sm font-semibold text-ink">No saved startups in your queue</h3>
            <p className="text-xs text-muted-ink mt-1 max-w-sm">
              Bookmark startups from the Investment Opportunities directory to track them here and take private diligence notes.
            </p>
            <Link
              href="/workspace/investor/opportunities"
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
            >
              <Building2 className="size-3.5" /> Explore Directory
            </Link>
          </div>
        )}

        {/* Queue items */}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden shadow-xs hover:border-line-hover transition-colors">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-bold text-ink">{item.startupName}</h3>
                        <StatusBadge label={item.sector} tone="info" />
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-canvas border border-line text-muted-ink">
                          Stage: {item.stage.toUpperCase()}
                        </span>
                        {item.readinessScore > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Sparkles className="size-2.5" /> Score: {item.readinessScore}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-ink mb-2 italic">{item.tagline}</p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-ink mb-2">
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" /> {item.sector}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" /> Saved: {new Date(item.savedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Interest level chip selector */}
                      <div className="flex items-center gap-2 my-2.5">
                        <span className="text-[11px] font-semibold text-muted-ink">Priority Tier:</span>
                        <div className="inline-flex rounded-lg border border-line p-0.5 bg-canvas/60">
                          {(["high_interest", "watching", "passed"] as const).map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => updateInterestLevel(item.startupId, lvl)}
                              className={`px-2.5 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                                item.interestLevel === lvl
                                  ? lvl === "high_interest"
                                    ? "bg-amber-600 text-white font-semibold"
                                    : lvl === "watching"
                                    ? "bg-brand text-white font-semibold"
                                    : "bg-slate-600 text-white font-semibold"
                                  : "text-muted-ink hover:text-ink"
                              }`}
                            >
                              {lvl === "high_interest" ? "★ High Interest" : lvl === "watching" ? "Watching" : "Passed"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-canvas text-muted-ink border border-line">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0 items-end">
                      <button
                        onClick={() => removeItem(item.startupId)}
                        title="Remove from queue"
                        className="size-7 rounded flex items-center justify-center border border-line text-muted-ink hover:text-danger hover:border-danger/40 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Pitch Deck and Action Bar */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-line">
                    <button
                      onClick={() => openMeetingModal(item, "meeting_request")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                    >
                      <Bot className="size-3.5" /> AI Schedule Call
                    </button>

                    <button
                      onClick={() => openMeetingModal(item, "expression_of_interest")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-card text-xs font-semibold text-ink hover:border-brand/40 hover:text-brand transition-colors"
                    >
                      <MessageSquare className="size-3.5" /> Express Interest
                    </button>

                    {item.pitchDeckUrl && (
                      <a
                        href={item.pitchDeckUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-card text-xs font-semibold text-ink hover:border-brand/40 hover:text-brand transition-colors"
                      >
                        <ExternalLink className="size-3" /> View Pitch Deck
                      </a>
                    )}

                    {item.pitchVideoUrl && (
                      <a
                        href={item.pitchVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-card text-xs font-semibold text-ink hover:border-brand/40 hover:text-brand transition-colors"
                      >
                        <Video className="size-3" /> Watch Teaser
                      </a>
                    )}

                    <Link
                      href="/workspace/investor/portfolio"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors ml-auto"
                    >
                      <Briefcase className="size-3" /> Record in Portfolio
                    </Link>
                  </div>

                  {/* Private Diligence Notes Box */}
                  <div className="mt-4 border-t border-line pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-ink flex items-center gap-1">
                        <MessageSquare className="size-3 text-muted-ink" /> Private Diligence Notes
                      </label>
                      <button
                        onClick={() => saveNotes(item.startupId)}
                        disabled={savingNotes[item.startupId]}
                        className="px-2.5 py-1 rounded bg-brand text-white text-[11px] font-semibold hover:bg-brand-hover disabled:opacity-50"
                      >
                        {savingNotes[item.startupId] ? "Saving..." : "Save Note"}
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={editingNotes[item.startupId] || ""}
                      onChange={(e) =>
                        setEditingNotes((prev) => ({ ...prev, [item.startupId]: e.target.value }))
                      }
                      placeholder="Add confidential notes on unit economics, founders, questions..."
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none bg-card text-ink"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal for Expression of Interest or AI-Scheduled Founder Meeting */}
        {modalOpen && targetItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-card border border-line p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-brand/10 text-brand">
                      {requestType === "meeting_request" ? <Bot className="size-4" /> : <Sparkles className="size-4" />}
                    </span>
                    <h3 className="text-base font-bold text-ink">
                      {requestType === "expression_of_interest"
                        ? "Express Investor Interest"
                        : "AI Agent: Schedule Founder Meet"}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-ink mt-1 font-medium">
                    Target Startup: <span className="text-ink font-semibold">{targetItem.startupName}</span> ({targetItem.sector})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setScheduledResult(null);
                  }}
                  className="size-7 rounded-lg hover:bg-canvas flex items-center justify-center text-muted-ink hover:text-ink text-sm font-semibold transition-colors"
                >
                  ✕
                </button>
              </div>

              {scheduledResult ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                      <CheckCircle2 className="size-5 shrink-0" />
                      <span>Meeting Coordinated Successfully!</span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      AI Agent confirmed date and room link with founder <strong>{scheduledResult.founderName}</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-line bg-canvas/50 text-xs space-y-2">
                    <div className="flex justify-between py-1 border-b border-line/60">
                      <span className="text-muted-ink">Time:</span>
                      <span className="font-semibold text-ink">
                        {scheduledResult.date} at {scheduledResult.time} ({scheduledResult.timeZone})
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-ink">Room Link:</span>
                      <a
                        href={scheduledResult.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-brand hover:underline flex items-center gap-1"
                      >
                        {scheduledResult.meetingLink} <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setModalOpen(false);
                        setScheduledResult(null);
                      }}
                      className="px-5 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover shadow-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {requestType === "meeting_request" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-brand" />
                          Preferred Date
                        </label>
                        <input
                          type="date"
                          value={preferredDate}
                          onChange={(e) => setPreferredDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-card text-ink"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                          <Clock className="size-3.5 text-brand" />
                          Preferred Slot
                        </label>
                        <select
                          value={preferredSlot}
                          onChange={(e) => setPreferredSlot(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-card text-ink"
                        >
                          <option value="11:00 - 11:45 IST">Morning (11:00 AM - 11:45 AM IST)</option>
                          <option value="14:00 - 14:45 IST">Afternoon (02:00 PM - 02:45 PM IST)</option>
                          <option value="16:30 - 17:15 IST">Evening (04:30 PM - 05:15 PM IST)</option>
                          <option value="18:00 - 18:45 IST">Late Evening (06:00 PM - 06:45 PM IST)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Message to Founders</label>
                    <textarea
                      rows={3}
                      value={introMessage}
                      onChange={(e) => setIntroMessage(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none bg-card text-ink"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-muted-ink hover:bg-canvas transition-colors"
                    >
                      Cancel
                    </button>
                    {requestType === "meeting_request" ? (
                      <button
                        onClick={handleScheduleMeet}
                        disabled={submittingMeet || introMessage.trim().length < 10}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {submittingMeet ? "Scheduling..." : "Schedule Meeting"}
                      </button>
                    ) : (
                      <button
                        onClick={submitInterest}
                        disabled={submittingMeet || introMessage.trim().length < 20}
                        className="px-5 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {submittingMeet ? "Submitting..." : "Submit Interest"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
