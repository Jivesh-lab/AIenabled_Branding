"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Video, Calendar, Loader2 } from "lucide-react";

interface SessionItem {
  id: string;
  startup: string;
  topic: string;
  time: string;
  date: string;
  link?: string;
}

const DEFAULT_SESSIONS: SessionItem[] = [
  {
    id: "s1",
    startup: "HealthFlow AI",
    topic: "MVP Clinical Review",
    time: "2:00 PM to 3:00 PM",
    date: "Today",
  },
  {
    id: "s2",
    startup: "FinTrack",
    topic: "Go-to-Market Strategy",
    time: "10:00 AM to 11:00 AM",
    date: "Tomorrow",
  },
];

export default function UpcomingSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>(DEFAULT_SESSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/meetings");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const mapped: SessionItem[] = json.data
              .filter((m: any) => m.invitationStatus !== "Completed")
              .slice(0, 3)
              .map((m: any) => ({
                id: m.id || m._id,
                startup: m.studentLead || m.projectTitle || "Student Project",
                topic: m.agenda || "Advisory Mentorship Review",
                date: m.date ? new Date(m.date).toLocaleDateString() : "Upcoming",
                time: m.time || "Scheduled",
                link: m.meetingLink,
              }));
            if (mapped.length > 0) {
              setSessions(mapped);
            }
          }
        }
      } catch {
        // Fall back to default sessions
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  return (
    <section aria-label="Upcoming mentoring sessions">
      <div className="flex flex-col rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Upcoming Clinics</h2>
          <Link
            href="/workspace/mentor/schedule"
            className="text-[13px] font-medium text-brand hover:underline"
          >
            Calendar
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-6 text-muted-ink">
            <Loader2 className="size-4 animate-spin mr-2 text-brand" />
            <span className="text-[12px]">Loading clinics...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Calendar className="size-5 text-slate-400 mb-1" />
            <p className="text-[12px] text-muted-ink">No upcoming mentoring sessions.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-2 p-4 transition-colors hover:bg-[#FAFBFB]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-ink">{session.startup}</span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200/60">
                    {session.date}
                  </span>
                </div>
                <p className="text-[12px] text-muted-ink">{session.topic}</p>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span>{session.time}</span>
                  </div>
                  {session.link ? (
                    <a
                      href={session.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded bg-brand px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    >
                      <Video className="size-3" />
                      Join Room
                    </a>
                  ) : (
                    <Link
                      href="/workspace/mentor/schedule"
                      className="flex items-center gap-1.5 rounded bg-brand px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    >
                      <Video className="size-3" />
                      Clinic Room
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
