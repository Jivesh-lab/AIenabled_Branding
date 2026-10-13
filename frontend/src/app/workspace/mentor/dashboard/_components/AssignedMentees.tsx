import Link from "next/link";
import { cn } from "@/lib/utils";
import { MessageSquare, Calendar } from "lucide-react";

const MENTEES = [
  {
    id: "m1",
    startup: "HealthFlow AI",
    founders: "Riya Patel and Amit Sharma",
    stage: "MVP Validation",
    health: "on_track",
    lastInteraction: "2 days ago",
  },
  {
    id: "m2",
    startup: "EcoCharge Solutions",
    founders: "Sarah Khan",
    stage: "Prototyping",
    health: "needs_attention",
    lastInteraction: "1 week ago",
  },
  {
    id: "m3",
    startup: "FinTrack",
    founders: "John D'Souza",
    stage: "Concept Validation",
    health: "on_track",
    lastInteraction: "3 days ago",
  },
];

export default function AssignedMentees() {
  return (
    <section aria-label="Assigned startups roster">
      <div className="flex flex-col rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Assigned Startups</h2>
            <p className="mt-0.5 text-[13px] text-muted-ink">Founding teams currently receiving your active advisory.</p>
          </div>
          <Link
            href="/workspace/mentor/mentees"
            className="text-[13px] font-medium text-brand hover:underline"
          >
            Open full directory
          </Link>
        </div>

        <div className="divide-y divide-line">
          {MENTEES.map((mentee) => (
            <div
              key={mentee.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-[#FAFBFB]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-[15px] font-semibold text-ink">{mentee.startup}</h3>
                  <span
                    className={cn(
                      "rounded border px-2 py-0.5 text-[12px] font-medium",
                      mentee.health === "on_track"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    )}
                  >
                    {mentee.health === "on_track" ? "On track" : "Attention required"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-ink">
                  <span>Founders: <span className="font-medium text-ink">{mentee.founders}</span></span>
                  <span className="text-slate-300">/</span>
                  <span>Stage: {mentee.stage}</span>
                  <span className="text-slate-300">/</span>
                  <span>Active {mentee.lastInteraction}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/workspace/mentor/feedback"
                  className="flex h-8 items-center gap-1.5 rounded border border-line bg-white px-3 text-[12px] font-medium text-ink transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <MessageSquare className="size-3.5 text-slate-400" />
                  Leave feedback
                </Link>
                <Link
                  href="/workspace/mentor/schedule"
                  className="flex h-8 items-center gap-1.5 rounded border border-line bg-white px-3 text-[12px] font-medium text-ink transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <Calendar className="size-3.5 text-slate-400" />
                  Book clinic
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
