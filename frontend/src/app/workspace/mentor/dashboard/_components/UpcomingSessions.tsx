import Link from "next/link";
import { Video, Calendar } from "lucide-react";

const SESSIONS = [
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

        <div className="divide-y divide-line">
          {SESSIONS.map((session) => (
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
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded bg-brand px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <Video className="size-3" />
                  Join Room
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
