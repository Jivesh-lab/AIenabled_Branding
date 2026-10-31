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

export default function UpcomingSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/meetings");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
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
            setSessions(mapped);
          }
        }
      } catch {
        // Silently catch
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  return (
    <div className="flex flex-col rounded-[12px] border border-line bg-white shadow-sm shadow-slate-200/50">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Upcoming Sessions</h2>
        <Link href="/workspace/mentor/schedule" className="text-[13px] font-medium text-brand hover:underline">
          Calendar
        </Link>
      </div>

      <div className="flex flex-col p-2">
        {loading ? (
          <div className="flex items-center justify-center p-6 text-muted-ink">
            <Loader2 className="size-4 animate-spin mr-2" />
            <span className="text-xs">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Calendar className="size-6 text-slate-300 mb-1" />
            <p className="text-xs text-muted-ink">No upcoming mentoring sessions.</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-2 rounded-lg p-3 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink">{session.startup}</span>
                <span className="text-[11px] font-medium text-brand">{session.date}</span>
              </div>
              <p className="text-[12px] text-muted-ink">{session.topic}</p>
              <div className="mt-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Calendar className="size-3.5" />
                  {session.time}
                </div>
                {session.link ? (
                  <a
                    href={session.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded bg-brand-deep px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <Video className="size-3" />
                    Join
                  </a>
                ) : (
                  <Link
                    href="/workspace/mentor/schedule"
                    className="flex items-center gap-1.5 rounded bg-brand-deep px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <Video className="size-3" />
                    View
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
