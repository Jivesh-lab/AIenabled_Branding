"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  MessageSquare,
  Star,
  StarOff,
  TrendingUp,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  ChevronDown,
  BarChart3,
  Heart,
  ThumbsUp,
} from "lucide-react";

const FEEDBACK_ENTRIES = [
  {
    id: "1",
    from: "Priya Sharma",
    role: "Student",
    projectTitle: "AI Crop Disease Detection",
    sessionDate: "Jan 20, 2025",
    sessionType: "1:1 Mentorship",
    rating: 5,
    comment: "The session was incredibly insightful. The mentor helped me identify the key gap in my dataset collection strategy and suggested a transfer learning approach I hadn't considered. Very practical and actionable advice!",
    tags: ["Technical Guidance", "Strategic"],
    read: true,
    replied: false,
  },
  {
    id: "2",
    from: "Arjun Mehta",
    role: "Student",
    projectTitle: "Biodegradable Packaging",
    sessionDate: "Jan 15, 2025",
    sessionType: "Project Review",
    rating: 4,
    comment: "Very helpful session overall. Would have liked more time for the business model canvas review. The mentor's connections to packaging industry contacts were extremely valuable.",
    tags: ["Business Strategy", "Industry Connections"],
    read: false,
    replied: false,
  },
  {
    id: "3",
    from: "Kavita Nair",
    role: "Student",
    projectTitle: "IoT Water Quality Monitor",
    sessionDate: "Jan 10, 2025",
    sessionType: "Pitch Practice",
    rating: 5,
    comment: "Excellent pitch coaching session. The structured STAR framework feedback helped me reorganize my investor narrative completely. My confidence has improved significantly.",
    tags: ["Pitch Coaching", "Communication"],
    read: true,
    replied: true,
  },
  {
    id: "4",
    from: "Rohan Das",
    role: "Student",
    projectTitle: "Blockchain Health Records",
    sessionDate: "Jan 5, 2025",
    sessionType: "Problem Solving",
    rating: 3,
    comment: "Session was okay but I was hoping for more specific guidance on the regulatory compliance aspects of blockchain in healthcare. The general advice was good but I needed domain-specific inputs.",
    tags: ["Regulatory", "Technical"],
    read: false,
    replied: false,
  },
];

const AVG_RATING = (FEEDBACK_ENTRIES.reduce((a, f) => a + f.rating, 0) / FEEDBACK_ENTRIES.length).toFixed(1);

export default function MentorFeedbackPage() {
  const [reply, setReply] = useState<Record<string, string>>({});
  const [showReply, setShowReply] = useState<Record<string, boolean>>({});
  const [read, setRead] = useState<Record<string, boolean>>(
    Object.fromEntries(FEEDBACK_ENTRIES.map((f) => [f.id, f.read]))
  );
  const [replied, setReplied] = useState<Record<string, boolean>>(
    Object.fromEntries(FEEDBACK_ENTRIES.map((f) => [f.id, f.replied]))
  );

  function sendReply(id: string) {
    setReplied((prev) => ({ ...prev, [id]: true }));
    setShowReply((prev) => ({ ...prev, [id]: false }));
    setRead((prev) => ({ ...prev, [id]: true }));
  }

  return (
    <PageContainer
      title="Session Feedback"
      description="Feedback submitted by your mentees after each mentorship session. Review, respond, and track satisfaction trends."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Feedback", value: FEEDBACK_ENTRIES.length, icon: MessageSquare, color: "bg-brand/10 text-brand" },
            { label: "Avg Rating", value: `${AVG_RATING}/5`, icon: Star, color: "bg-amber-50 text-amber-700" },
            { label: "Unread", value: FEEDBACK_ENTRIES.filter((f) => !read[f.id]).length, icon: AlertCircle, color: "bg-red-50 text-danger" },
            { label: "Responded", value: Object.values(replied).filter(Boolean).length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-ink">{s.label}</p>
                  <p className="text-2xl font-bold text-ink mt-1">{s.value}</p>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="size-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Feedback Cards */}
        <div className="space-y-4">
          {FEEDBACK_ENTRIES.map((fb) => (
            <div
              key={fb.id}
              className={`rounded-xl border bg-white overflow-hidden ${!read[fb.id] ? "border-brand/30 shadow-sm" : "border-line"}`}
              onClick={() => setRead((prev) => ({ ...prev, [fb.id]: true }))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setRead((prev) => ({ ...prev, [fb.id]: true })) }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {!read[fb.id] && (
                        <span className="size-2 rounded-full bg-brand shrink-0" />
                      )}
                      <span className="text-sm font-bold text-ink">{fb.from}</span>
                      <span className="text-[11px] text-muted-ink">{fb.role}</span>
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded border border-line bg-canvas text-muted-ink">{fb.sessionType}</span>
                      {replied[fb.id] && <StatusBadge label="Replied" tone="success" />}
                    </div>
                    <p className="text-[12px] text-muted-ink mb-2">{fb.projectTitle} · {fb.sessionDate}</p>

                    {/* Star rating */}
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-4 ${i < fb.rating ? "text-brand-gold fill-current" : "text-line"}`}
                        />
                      ))}
                      <span className="text-xs font-semibold text-ink ml-1">{fb.rating}/5</span>
                    </div>

                    <p className="text-sm text-ink leading-relaxed bg-canvas border border-line rounded-lg p-3 italic">
                      "{fb.comment}"
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {fb.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-brand/5 border border-brand/20 text-brand">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {!replied[fb.id] && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowReply((prev) => ({ ...prev, [fb.id]: !prev[fb.id] })); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
                    >
                      <MessageSquare className="size-3.5" /> Reply
                    </button>
                  )}
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                    <ThumbsUp className="size-3.5" /> Acknowledge
                  </button>
                </div>

                {/* Reply Box */}
                {showReply[fb.id] && (
                  <div className="mt-4 pt-4 border-t border-line" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Your Response to {fb.from}</label>
                    <textarea
                      rows={3}
                      value={reply[fb.id] || ""}
                      onChange={(e) => setReply((prev) => ({ ...prev, [fb.id]: e.target.value }))}
                      placeholder="Thank your mentee and share any follow-up thoughts..."
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => sendReply(fb.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
                      >
                        <Send className="size-3.5" /> Send Reply
                      </button>
                      <button onClick={() => setShowReply((prev) => ({ ...prev, [fb.id]: false }))} className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-muted-ink hover:bg-canvas transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
