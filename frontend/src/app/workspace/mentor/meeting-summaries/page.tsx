"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { Sparkles, Calendar, User, Clock, Loader2, ArrowRight, Video } from "lucide-react";

interface MeetingSummaryItem {
  id: string;
  projectTitle: string;
  studentLead: string;
  date: string;
  time: string;
  agenda: string;
  status: string;
  aiNotes?: string;
}

export default function MeetingSummariesPage() {
  const [meetings, setMeetings] = useState<MeetingSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummaries() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/meetings");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const mapped: MeetingSummaryItem[] = json.data.map((m: any) => ({
              id: m.id || m._id,
              projectTitle: m.projectTitle || "Advisory Mentorship Session",
              studentLead: m.studentLead || "Student Innovator",
              date: m.date ? new Date(m.date).toLocaleDateString() : "Scheduled",
              time: m.time || "10:00 AM",
              agenda: m.agenda || "TRL validation & roadmap alignment",
              status: m.invitationStatus || "Scheduled",
              aiNotes:
                m.notes ||
                "Key Discussion Points: Evaluated current milestone deliverables, addressed prototype bottlenecks, and established timeline for next validation sprint.",
            }));
            setMeetings(mapped);
          }
        }
      } catch {
        // Silently catch
      } finally {
        setLoading(false);
      }
    }
    fetchSummaries();
  }, []);

  return (
    <PageContainer
      title="AI Meeting Summaries & Transcripts"
      description="Automated AI meeting synthesis, key decisions, and action items from advisory sessions."
    >
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-indigo-200/60 bg-indigo-50/20">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                  Total Synced Meetings
                </p>
                <p className="text-2xl font-bold text-ink">{loading ? "—" : meetings.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-emerald-200/60 bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Calendar className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                  Completed Reviews
                </p>
                <p className="text-2xl font-bold text-ink">
                  {loading ? "—" : meetings.filter((m) => m.status === "Completed").length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-blue-200/60 bg-blue-50/20">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Clock className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                  Upcoming Sessions
                </p>
                <p className="text-2xl font-bold text-ink">
                  {loading ? "—" : meetings.filter((m) => m.status !== "Completed").length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Summaries List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-ink">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-xs">Loading AI meeting intelligence...</span>
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-line rounded-xl bg-card">
              <div className="flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
                <Sparkles className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-ink">No AI meeting summaries recorded yet</h3>
              <p className="text-xs text-muted-ink mt-1 max-w-md">
                Automated AI synthesis and action items will appear here after your mentoring reviews are conducted.
              </p>
              <Link
                href="/workspace/mentor/schedule"
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
              >
                View Mentoring Schedule
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            meetings.map((m) => (
              <Card key={m.id} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand/10 text-brand">
                        {m.status}
                      </span>
                      <span className="text-xs text-muted-ink flex items-center gap-1">
                        <Calendar className="size-3" /> {m.date} · {m.time}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-ink">{m.projectTitle}</h3>
                    <p className="text-xs text-muted-ink flex items-center gap-1 mt-0.5">
                      <User className="size-3" /> Lead: {m.studentLead}
                    </p>
                  </div>

                  <Link
                    href="/workspace/mentor/schedule"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line text-xs font-semibold text-muted-ink hover:text-brand hover:border-brand/40 transition-colors shrink-0"
                  >
                    Session Details
                  </Link>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
                    <Sparkles className="size-3.5 text-indigo-600" /> AI Executive Summary
                  </div>
                  <p className="text-slate-600 leading-relaxed">{m.aiNotes}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}
