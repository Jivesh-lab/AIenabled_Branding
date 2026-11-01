"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import {
  Calendar, Plus, Clock, Video, MapPin, Users,
  ChevronLeft, ChevronRight, Check, X, Edit2, Bell, Loader2, AlertCircle,
} from "lucide-react";

interface Session {
  _id: string;
  id?: string;
  title: string;
  projectTitle?: string;
  participants?: string[];
  date: string;
  startTime?: string;
  durationMinutes?: number;
  meetingType?: string;
  agenda?: string;
  meetingProvider?: string;
  meetingLinkOrLocation?: string;
  invitationStatus?: string;
}

const STATUS_TONE: Record<string, "progress" | "success" | "neutral" | "attention"> = {
  Sent: "progress",
  Confirmed: "success",
  Completed: "success",
  Cancelled: "neutral",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MentorSchedulePage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"All" | "Upcoming" | "Completed">("All");
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/meetings");
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        if (json.success) {
          setSessions(json.data || []);
        } else {
          throw new Error(json.message || "Failed to load sessions");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  const isUpcoming = (s: Session) => s.invitationStatus !== "Completed" && s.invitationStatus !== "Cancelled";
  const isCompleted = (s: Session) => s.invitationStatus === "Completed";

  const filtered = sessions.filter((s) => {
    if (filter === "Upcoming") return isUpcoming(s);
    if (filter === "Completed") return isCompleted(s);
    return true;
  });

  const upcoming = sessions.filter(isUpcoming);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const sessionsThisMonth = sessions.filter((s) => {
    const d = new Date(s.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Build calendar map for current month
  const CALENDAR_SESSIONS: Record<number, Session[]> = {};
  sessionsThisMonth.forEach((s) => {
    const day = new Date(s.date).getDate();
    CALENDAR_SESSIONS[day] = [...(CALENDAR_SESSIONS[day] || []), s];
  });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <PageContainer
      title="Schedule & Sessions"
      description="Manage your upcoming mentorship sessions, track completed sessions, and schedule new slots with mentees."
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "This Month", value: sessionsThisMonth.length, icon: Calendar, color: "bg-brand/10 text-brand" },
            { label: "Upcoming", value: upcoming.length, icon: Clock, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
            { label: "Completed", value: sessions.filter(isCompleted).length, icon: Check, color: "bg-emerald-50 text-emerald-700" },
            { label: "Mentees Active", value: new Set(upcoming.flatMap((s) => s.participants || [])).size, icon: Users, color: "bg-amber-50 text-amber-700" },
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

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-ink gap-2">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading sessions from database…</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="size-8 text-danger mx-auto mb-2" />
            <p className="text-sm font-semibold text-danger">Failed to load sessions</p>
            <p className="text-xs text-muted-ink mt-1">{error}</p>
          </div>
        ) : view === "list" ? (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-line bg-canvas p-10 text-center">
                <Calendar className="size-10 text-muted-ink mx-auto mb-3 opacity-40" />
                <p className="text-sm font-semibold text-ink">No sessions found</p>
                <p className="text-xs text-muted-ink mt-1">Schedule a new session to get started.</p>
              </div>
            ) : (
              filtered.map((session) => (
                <Card key={session._id} interactive className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 text-center w-12">
                      <p className="text-xs text-muted-ink">{new Date(session.date).toLocaleDateString("en-IN", { month: "short" })}</p>
                      <p className="text-xl font-bold text-ink">{new Date(session.date).getDate()}</p>
                      <p className="text-[10px] text-muted-ink">{new Date(session.date).toLocaleDateString("en-IN", { weekday: "short" })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-ink">{session.title}</span>
                        <StatusBadge label={session.invitationStatus || "Sent"} tone={STATUS_TONE[session.invitationStatus || "Sent"] ?? "neutral"} />
                      </div>
                      <p className="text-[12px] text-muted-ink mb-1">{session.projectTitle}</p>
                      {session.agenda && (
                        <p className="text-[12px] text-ink font-medium italic">"{session.agenda}"</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-muted-ink">
                        {session.startTime && <span className="flex items-center gap-1"><Clock className="size-3" /> {session.startTime} · {session.durationMinutes}min</span>}
                        {session.meetingProvider && (
                          <span className="flex items-center gap-1">
                            {session.meetingProvider.includes("Video") ? <Video className="size-3" /> : <MapPin className="size-3" />}
                            {session.meetingProvider}
                          </span>
                        )}
                      </div>
                    </div>
                    {isUpcoming(session) && (
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
              ))
            )}
          </div>
        ) : (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-ink">{monthLabel}</h3>
              <div className="flex gap-1">
                <button className="size-7 rounded border border-line flex items-center justify-center text-muted-ink hover:border-brand/40 hover:text-brand transition-colors"><ChevronLeft className="size-4" /></button>
                <button className="size-7 rounded border border-line flex items-center justify-center text-muted-ink hover:border-brand/40 hover:text-brand transition-colors"><ChevronRight className="size-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DAY_LABELS.map((d) => <p key={d} className="text-[10px] font-bold text-muted-ink uppercase">{d}</p>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
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
                  <label className="block text-xs font-semibold text-ink mb-1.5">Session Title *</label>
                  <input type="text" placeholder="e.g. Prototype Review" className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
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
                    <option>Video Call</option><option>In-person</option><option>Phone Call</option>
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
