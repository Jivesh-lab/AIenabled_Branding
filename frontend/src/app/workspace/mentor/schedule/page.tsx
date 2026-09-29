"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  Calendar,
  Plus,
  Clock,
  Video,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Edit2,
  Bell,
} from "lucide-react";

const SESSIONS = [
  {
    id: "1",
    mentee: "Priya Sharma",
    projectTitle: "AI Crop Disease Detection",
    date: "2025-01-27",
    time: "10:00 AM",
    duration: "60 min",
    format: "Video Call",
    agenda: "Prototype review and B2B pivot strategy discussion",
    status: "Upcoming" as const,
  },
  {
    id: "2",
    mentee: "Kavita Nair",
    projectTitle: "IoT Water Quality Monitor",
    date: "2025-01-29",
    time: "11:30 AM",
    duration: "45 min",
    format: "Video Call",
    agenda: "Regulatory submission preparation and investor deck review",
    status: "Upcoming" as const,
  },
  {
    id: "3",
    mentee: "Arjun Mehta",
    projectTitle: "Biodegradable Packaging",
    date: "2025-02-05",
    time: "10:00 AM",
    duration: "60 min",
    format: "Video Call",
    agenda: "Lab test results review and milestone catch-up plan",
    status: "Upcoming" as const,
  },
  {
    id: "4",
    mentee: "Rohan Das",
    projectTitle: "Blockchain Health Records",
    date: "2025-02-10",
    time: "2:00 PM",
    duration: "90 min",
    format: "In-person (Bengaluru)",
    agenda: "Intervention meeting: scope, timeline, and commitment assessment",
    status: "Upcoming" as const,
  },
  {
    id: "5",
    mentee: "Priya Sharma",
    projectTitle: "AI Crop Disease Detection",
    date: "2025-01-20",
    time: "10:00 AM",
    duration: "60 min",
    format: "Video Call",
    agenda: "Dataset collection strategy and ML model architecture review",
    status: "Completed" as const,
  },
  {
    id: "6",
    mentee: "Kavita Nair",
    projectTitle: "IoT Water Quality Monitor",
    date: "2025-01-22",
    time: "11:00 AM",
    duration: "45 min",
    format: "Video Call",
    agenda: "Pitch deck coaching and investor narrative structuring",
    status: "Completed" as const,
  },
];

const STATUS_TONE: Record<string, "progress" | "success" | "neutral" | "attention"> = {
  Upcoming: "progress",
  Completed: "success",
  Cancelled: "neutral",
  Rescheduled: "attention",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MentorSchedulePage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"All" | "Upcoming" | "Completed">("All");
  const [showNewSession, setShowNewSession] = useState(false);

  const filtered = SESSIONS.filter((s) => filter === "All" || s.status === filter);
  const upcoming = SESSIONS.filter((s) => s.status === "Upcoming");

  // Build a simple January 2025 calendar
  const CALENDAR_SESSIONS: Record<string, typeof SESSIONS[0][]> = {};
  SESSIONS.forEach((s) => {
    const day = parseInt(s.date.split("-")[2]);
    CALENDAR_SESSIONS[day] = [...(CALENDAR_SESSIONS[day] || []), s];
  });

  return (
    <PageContainer
      title="Schedule & Sessions"
      description="Manage your upcoming mentorship sessions, track completed sessions, and schedule new slots with mentees."
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "This Month", value: SESSIONS.filter((s) => s.date.startsWith("2025-01")).length, icon: Calendar, color: "bg-brand/10 text-brand" },
            { label: "Upcoming", value: upcoming.length, icon: Clock, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
            { label: "Completed (Jan)", value: SESSIONS.filter((s) => s.status === "Completed").length, icon: Check, color: "bg-emerald-50 text-emerald-700" },
            { label: "Total Mentees Active", value: new Set(upcoming.map((s) => s.mentee)).size, icon: Users, color: "bg-amber-50 text-amber-700" },
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

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-line overflow-hidden">
              {(["list", "calendar"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${view === v ? "bg-brand text-white" : "bg-white text-muted-ink hover:bg-canvas"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            {/* Status filter */}
            {(["All", "Upcoming", "Completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === f ? "bg-brand text-white border-brand" : "bg-white text-muted-ink border-line hover:border-brand/40 hover:text-brand"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowNewSession(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
          >
            <Plus className="size-3.5" /> Schedule Session
          </button>
        </div>

        {view === "list" ? (
          /* List View */
          <div className="space-y-3">
            {filtered.map((session) => (
              <Card key={session.id} interactive className="p-4">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 text-center w-12">
                    <p className="text-xs text-muted-ink">{new Date(session.date).toLocaleDateString("en-IN", { month: "short" })}</p>
                    <p className="text-xl font-bold text-ink">{new Date(session.date).getDate()}</p>
                    <p className="text-[10px] text-muted-ink">{new Date(session.date).toLocaleDateString("en-IN", { weekday: "short" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-ink">{session.mentee}</span>
                      <StatusBadge label={session.status} tone={STATUS_TONE[session.status]} />
                    </div>
                    <p className="text-[12px] text-muted-ink mb-1">{session.projectTitle}</p>
                    <p className="text-[12px] text-ink font-medium italic">"{session.agenda}"</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-muted-ink">
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {session.time} · {session.duration}</span>
                      <span className="flex items-center gap-1">{session.format === "Video Call" ? <Video className="size-3" /> : <MapPin className="size-3" />} {session.format}</span>
                    </div>
                  </div>
                  {session.status === "Upcoming" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                        <Video className="size-3" /> Join
                      </button>
                      <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                        <Edit2 className="size-3" /> Edit
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Calendar View (simplified) */
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-ink">January 2025</h3>
              <div className="flex gap-1">
                <button className="size-7 rounded border border-line flex items-center justify-center text-muted-ink hover:border-brand/40 hover:text-brand transition-colors"><ChevronLeft className="size-4" /></button>
                <button className="size-7 rounded border border-line flex items-center justify-center text-muted-ink hover:border-brand/40 hover:text-brand transition-colors"><ChevronRight className="size-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DAY_LABELS.map((d) => <p key={d} className="text-[10px] font-bold text-muted-ink uppercase">{d}</p>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* January 2025 starts on Wednesday (offset 3) */}
              {Array.from({ length: 3 }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const hasSessions = CALENDAR_SESSIONS[day];
                return (
                  <div
                    key={day}
                    className={`h-10 rounded-lg flex flex-col items-center justify-center text-xs font-semibold cursor-pointer transition-colors ${hasSessions ? "bg-brand text-white" : "hover:bg-canvas text-ink"}`}
                  >
                    <span>{day}</span>
                    {hasSessions && <span className="text-[8px] opacity-80">{hasSessions.length} sess</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* New Session Dialog */}
        {showNewSession && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowNewSession(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-base font-bold text-ink mb-4">Schedule New Session</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Mentee *</label>
                  <select className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none bg-white">
                    {["Priya Sharma", "Arjun Mehta", "Kavita Nair", "Rohan Das"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Date *</label>
                    <input type="date" className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Time *</label>
                    <input type="time" className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Format *</label>
                  <select className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none bg-white">
                    <option>Video Call</option><option>In-person (Bengaluru)</option><option>Phone Call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Agenda</label>
                  <textarea rows={2} placeholder="What will you cover?" className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowNewSession(false)} className="px-4 py-2 text-xs font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas">Cancel</button>
                <button onClick={() => setShowNewSession(false)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover">
                  <Bell className="size-3.5" /> Schedule & Notify
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
