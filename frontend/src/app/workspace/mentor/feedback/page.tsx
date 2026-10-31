"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import {
  MessageSquare, Star, Clock, Calendar, Users,
  CheckCircle2, AlertCircle, Send, ThumbsUp, Loader2,
} from "lucide-react";

interface FeedbackEntry {
  _id: string;
  from?: string;
  studentName?: string;
  projectTitle?: string;
  sessionDate?: string;
  sessionType?: string;
  rating?: number;
  comment?: string;
  tags?: string[];
  read?: boolean;
  replied?: boolean;
}

export default function MentorFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [showReply, setShowReply] = useState<Record<string, boolean>>({});
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [replied, setReplied] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchFeedback() {
      try {
        setLoading(true);
        // Fetch mentor meetings as proxy for feedback sessions
        const res = await fetch("/api/faculty/meetings");
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        if (json.success) {
          const mapped: FeedbackEntry[] = (json.data || []).map((m: any) => ({
            _id: m._id || m.id,
            from: m.participants?.[1] || "Student",
            projectTitle: m.projectTitle,
            sessionDate: m.date,
            sessionType: m.meetingType || "Mentorship Session",
            rating: 0,
            comment: m.notes || m.agenda || "No feedback recorded for this session yet.",
            tags: m.meetingType ? [m.meetingType] : [],
            read: m.attendanceLogged || false,
            replied: false,
          }));
          setFeedback(mapped);
          setRead(Object.fromEntries(mapped.map((f) => [f._id, f.read || false])));
          setReplied(Object.fromEntries(mapped.map((f) => [f._id, f.replied || false])));
        } else {
          throw new Error(json.message || "Failed to load feedback");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFeedback();
  }, []);

  function sendReply(id: string) {
    setReplied((prev) => ({ ...prev, [id]: true }));
    setShowReply((prev) => ({ ...prev, [id]: false }));
    setRead((prev) => ({ ...prev, [id]: true }));
  }

  const avgRating = feedback.filter((f) => (f.rating || 0) > 0).length > 0
    ? (feedback.reduce((a, f) => a + (f.rating || 0), 0) / feedback.filter((f) => (f.rating || 0) > 0).length).toFixed(1)
    : "N/A";

  return (
    <PageContainer
      title="Session Feedback"
      description="Feedback submitted by your mentees after each mentorship session. Review, respond, and track satisfaction trends."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Sessions", value: feedback.length, icon: MessageSquare, color: "bg-brand/10 text-brand" },
            { label: "Avg Rating", value: avgRating === "N/A" ? avgRating : `${avgRating}/5`, icon: Star, color: "bg-amber-50 text-amber-700" },
            { label: "Unread", value: Object.values(read).filter((v) => !v).length, icon: AlertCircle, color: "bg-red-50 text-danger" },
            { label: "Responded", value: Object.values(replied).filter(Boolean).length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-ink">{s.label}</p>
                  <p className="text-2xl font-bold text-ink mt-1">{s.value}</p>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="size-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Feedback Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-ink gap-2">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading session feedback from database…</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="size-8 text-danger mx-auto mb-2" />
            <p className="text-sm font-semibold text-danger">Failed to load feedback</p>
            <p className="text-xs text-muted-ink mt-1">{error}</p>
          </div>
        ) : feedback.length === 0 ? (
          <div className="rounded-xl border border-line bg-canvas p-10 text-center">
            <MessageSquare className="size-10 text-muted-ink mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-ink">No session feedback yet</p>
            <p className="text-xs text-muted-ink mt-1">Feedback will appear here after mentorship sessions are completed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((fb) => (
              <div
                key={fb._id}
                className={`rounded-xl border bg-white overflow-hidden ${!read[fb._id] ? "border-brand/30 shadow-sm" : "border-line"}`}
                onClick={() => setRead((prev) => ({ ...prev, [fb._id]: true }))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setRead((prev) => ({ ...prev, [fb._id]: true })); }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {!read[fb._id] && <span className="size-2 rounded-full bg-brand shrink-0" />}
                        <span className="text-sm font-bold text-ink">{fb.from}</span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded border border-line bg-canvas text-muted-ink">{fb.sessionType}</span>
                        {replied[fb._id] && <StatusBadge label="Replied" tone="success" />}
                      </div>
                      <p className="text-[12px] text-muted-ink mb-2">{fb.projectTitle} · {fb.sessionDate}</p>

                      {(fb.rating || 0) > 0 && (
                        <div className="flex items-center gap-1 mb-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`size-4 ${i < (fb.rating || 0) ? "text-brand-gold fill-current" : "text-line"}`} />
                          ))}
                          <span className="text-xs font-semibold text-ink ml-1">{fb.rating}/5</span>
                        </div>
                      )}

                      <p className="text-sm text-ink leading-relaxed bg-canvas border border-line rounded-lg p-3 italic">
                        "{fb.comment}"
                      </p>

                      {(fb.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {fb.tags!.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-brand/5 border border-brand/20 text-brand">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {!replied[fb._id] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowReply((prev) => ({ ...prev, [fb._id]: !prev[fb._id] })); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
                      >
                        <MessageSquare className="size-3.5" /> Reply
                      </button>
                    )}
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                      <ThumbsUp className="size-3.5" /> Acknowledge
                    </button>
                  </div>

                  {showReply[fb._id] && (
                    <div className="mt-4 pt-4 border-t border-line" onClick={(e) => e.stopPropagation()}>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Your Response to {fb.from}</label>
                      <textarea
                        rows={3}
                        value={reply[fb._id] || ""}
                        onChange={(e) => setReply((prev) => ({ ...prev, [fb._id]: e.target.value }))}
                        placeholder="Thank your mentee and share any follow-up thoughts..."
                        className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => sendReply(fb._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
                        >
                          <Send className="size-3.5" /> Send Reply
                        </button>
                        <button onClick={() => setShowReply((prev) => ({ ...prev, [fb._id]: false }))} className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-muted-ink hover:bg-canvas transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
