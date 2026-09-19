import { FileText, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    id: "a1",
    title: "Review Pitch Deck",
    startup: "HealthFlow AI",
    dueDate: "Today",
    icon: FileText,
  },
  {
    id: "a2",
    title: "Complete Session Eval",
    startup: "EcoCharge Solutions",
    dueDate: "Tomorrow",
    icon: ClipboardList,
  },
];

export default function PendingActions() {
  return (
    <div className="flex flex-col rounded-[12px] border border-line bg-white shadow-sm shadow-slate-200/50">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Pending Actions</h2>
        <span className="flex size-5 items-center justify-center rounded-full bg-brand-deep text-[11px] font-bold text-white">
          {ACTIONS.length}
        </span>
      </div>

      <div className="flex flex-col p-2">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
              <action.icon className="size-4" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-ink">{action.title}</span>
              <span className="text-[12px] text-muted-ink">{action.startup}</span>
              <span className={cn("mt-1 text-[11px] font-medium", action.dueDate === "Today" ? "text-amber-600" : "text-slate-500")}>
                Due: {action.dueDate}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
