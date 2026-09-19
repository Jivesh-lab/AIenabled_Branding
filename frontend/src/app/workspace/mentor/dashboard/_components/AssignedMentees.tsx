import { cn } from "@/lib/utils";
import { ArrowRight, MessageSquare, Calendar } from "lucide-react";

const MENTEES = [
  {
    id: "m1",
    startup: "HealthFlow AI",
    founders: "Riya P. & Amit S.",
    stage: "MVP Validation",
    health: "on_track",
    lastInteraction: "2 days ago",
  },
  {
    id: "m2",
    startup: "EcoCharge Solutions",
    founders: "Sarah K.",
    stage: "Prototyping",
    health: "needs_attention",
    lastInteraction: "1 week ago",
  },
  {
    id: "m3",
    startup: "FinTrack",
    founders: "John D.",
    stage: "Idea Phase",
    health: "on_track",
    lastInteraction: "3 days ago",
  },
];

export default function AssignedMentees() {
  return (
    <div className="flex flex-col rounded-[12px] border border-line bg-white shadow-sm shadow-slate-200/50">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Assigned Mentees</h2>
          <p className="mt-0.5 text-[13px] text-muted-ink">Startups you are currently advising.</p>
        </div>
        <button type="button" className="text-[13px] font-medium text-brand hover:underline">
          View all
        </button>
      </div>

      <div className="flex flex-col">
        {MENTEES.map((mentee, i) => (
          <div
            key={mentee.id}
            className={cn(
              "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between",
              i !== MENTEES.length - 1 && "border-b border-line"
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-ink">{mentee.startup}</h3>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    mentee.health === "on_track"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  )}
                >
                  {mentee.health === "on_track" ? "On Track" : "Needs Attention"}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-ink">
                {mentee.founders} &bull; {mentee.stage} &bull; Active {mentee.lastInteraction}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <MessageSquare className="size-3.5" />
                Message
              </button>
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <Calendar className="size-3.5" />
                Schedule
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
