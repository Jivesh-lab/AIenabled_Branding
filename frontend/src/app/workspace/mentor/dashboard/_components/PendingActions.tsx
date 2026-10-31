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
  priority: string;
}

export default function PendingActions() {
  const [actions, setActions] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/tasks");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const mapped: TaskItem[] = json.data
              .filter((t: any) => t.status !== "Completed")
              .map((t: any) => ({
                id: t.id || t._id,
                title: t.title || "Pending task",
                startup: t.assignedStudent || "Cohort project",
                dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "Pending",
                priority: t.priority || "Medium",
              }));
            setActions(mapped);
          }
        }
      } catch {
        // Silently catch
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  return (
    <div className="flex flex-col rounded-[12px] border border-line bg-white shadow-sm shadow-slate-200/50">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Pending Actions</h2>
        <span className="flex size-5 items-center justify-center rounded-full bg-brand-deep text-[11px] font-bold text-white">
          {actions.length}
        </span>
      </div>

      <div className="flex flex-col p-2">
        {loading ? (
          <div className="flex items-center justify-center p-6 text-muted-ink">
            <Loader2 className="size-4 animate-spin mr-2" />
            <span className="text-xs">Loading actions...</span>
          </div>
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle className="size-6 text-emerald-500 mb-1 opacity-70" />
            <p className="text-xs text-muted-ink">All mentor action items are cleared.</p>
          </div>
        ) : (
          actions.map((action) => (
            <Link
              key={action.id}
              href="/workspace/mentor/feedback"
              className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
                <ClipboardList className="size-4" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-ink">{action.title}</span>
                <span className="text-[12px] text-muted-ink">{action.startup}</span>
                <span
                  className={cn(
                    "mt-1 text-[11px] font-medium",
                    action.priority === "High" ? "text-amber-600" : "text-slate-500"
                  )}
                >
                  Due: {action.dueDate}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
