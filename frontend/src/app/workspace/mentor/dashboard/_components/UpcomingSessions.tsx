import { Video, Calendar } from "lucide-react";

const SESSIONS = [
  {
    id: "s1",
    startup: "HealthFlow AI",
    topic: "MVP Review",
    time: "2:00 PM - 3:00 PM",
    date: "Today",
  },
  {
    id: "s2",
    startup: "FinTrack",
    topic: "Go-to-Market Strategy",
    time: "10:00 AM - 11:00 AM",
    date: "Tomorrow",
  },
];

export default function UpcomingSessions() {
  return (
    <div className="flex flex-col rounded-[12px] border border-line bg-white shadow-sm shadow-slate-200/50">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Upcoming Sessions</h2>
        <button type="button" className="text-[13px] font-medium text-brand hover:underline">
          Calendar
        </button>
      </div>

      <div className="flex flex-col p-2">
        {SESSIONS.map((session) => (
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
              <button
                type="button"
                className="flex items-center gap-1.5 rounded bg-brand-deep px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <Video className="size-3" />
                Join
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
