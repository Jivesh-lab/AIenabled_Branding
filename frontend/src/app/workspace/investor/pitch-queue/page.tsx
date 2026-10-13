"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { toast } from "sonner";
import {
  Bookmark,
  Play,
  MessageSquare,
  Building2,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
  Clock,
  Trash2,
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

  async function saveNotes(startupId: string) {
    setSavingNotes((prev) => ({ ...prev, [startupId]: true }));
    try {
      const noteContent = editingNotes[startupId] || "";
      const res = await fetch("/api/investor/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId, notes: noteContent }),
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
        toast.success("Removed from watchlist.");
      } else {
        toast.error("Failed to remove item.");
      }
    } catch {
      toast.error("Network error removing item.");
    }
  }

  return (
    <PageContainer
      title="Saved Startups & Pitch Queue"
      description="Startups saved to your personal deal flow and due diligence queue."
    >
      <div className="space-y-6">
        {/* Header metrics strip */}
        <div className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-white">
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
          </div>
        )}

        {/* Queue items */}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-bold text-ink">{item.startupName}</h3>
                        <StatusBadge label={item.sector} tone="info" />
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-canvas border border-line text-muted-ink">
                          Stage: {item.stage}
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
                          <Calendar className="size-3" /> Saved on: {new Date(item.savedAt).toLocaleDateString()}
                        </span>
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
      </div>
    </PageContainer>
  );
}
