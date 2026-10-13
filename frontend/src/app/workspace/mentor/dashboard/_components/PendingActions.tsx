import { FileText, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    id: "a1",
    title: "Review Pitch Deck",
    startup: "HealthFlow AI",
    dueDate: "Due today",
    urgent: true,
    icon: FileText,
  },
  {
    id: "a2",
    title: "Complete Session Evaluation",
    startup: "EcoCharge Solutions",
    dueDate: "Due tomorrow",
    urgent: false,
    icon: ClipboardList,
  },
];

export default function PendingActions() {
  return (
    <section aria-label="Advisor action items">
      <div className="flex flex-col rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Action Required</h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-900 tabular-nums">
            {ACTIONS.length}
          </span>
        </div>

        <div className="divide-y divide-line">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-[#FAFBFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded mt-0.5",
                  action.urgent ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                )}
              >
                <action.icon className="size-3.5" strokeWidth={2} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-ink leading-snug">{action.title}</span>
                <span className="text-[12px] text-muted-ink mt-0.5">{action.startup}</span>
                <span className={cn("mt-1 text-[11px] font-medium", action.urgent ? "text-amber-800" : "text-slate-500")}>
                  {action.dueDate}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
