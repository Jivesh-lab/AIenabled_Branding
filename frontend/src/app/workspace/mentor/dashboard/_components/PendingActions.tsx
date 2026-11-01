"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, ClipboardList, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskItem {
  id: string;
  title: string;
  startup: string;
  dueDate: string;
  urgent: boolean;
  icon: typeof FileText;
}

const DEFAULT_ACTIONS: TaskItem[] = [
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
  const [actions, setActions] = useState<TaskItem[]>(DEFAULT_ACTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/tasks");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const mapped: TaskItem[] = json.data
              .filter((t: any) => t.status !== "Completed")
              .map((t: any) => ({
                id: t.id || t._id,
                title: t.title || "Pending task",
                startup: t.assignedStudent || "Cohort project",
                dueDate: t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : "Pending",
                urgent: t.priority === "High",
                icon: t.title?.toLowerCase().includes("evaluation") ? ClipboardList : FileText,
              }));
            if (mapped.length > 0) {
              setActions(mapped);
            }
          }
        }
      } catch {
        // Fall back to default actions
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  return (
    <section aria-label="Advisor action items">
      <div className="flex flex-col rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Action Required</h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-900 tabular-nums">
            {actions.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-6 text-muted-ink">
            <Loader2 className="size-4 animate-spin mr-2 text-brand" />
            <span className="text-[12px]">Loading tasks...</span>
          </div>
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle className="size-5 text-emerald-600 mb-1" />
            <p className="text-[12px] text-muted-ink">All mentor action items are cleared.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {actions.map((action) => (
              <Link
                key={action.id}
                href="/workspace/mentor/feedback"
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
