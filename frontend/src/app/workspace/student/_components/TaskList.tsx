"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/dates";
import type { StatusTone } from "@/types/status";
import type { StudentTask, StudentTaskStatus } from "@/types/student-workflow";
import { isIsoDate, reminderLabel, sortTasks, taskState, TASK_STATE_LABEL, type TaskState } from "@/lib/workflowState";

const STATE_TONE: Record<TaskState, StatusTone> = {
  COMPLETED: "success",
  OVERDUE: "danger",
  DUE_SOON: "attention",
  UPCOMING: "progress",
  NO_DATE: "neutral",
};

/** Tasks assigned to the student on one project. Status changes are saved to the backend, then re-read. */
export default function TaskList({ tasks, today }: { tasks: StudentTask[]; today: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  async function move(task: StudentTask, status: StudentTaskStatus) {
    if (busy) return;
    setBusy(task.id);
    setError(null);
    try {
      const res = await fetch(`/api/student/tasks/${encodeURIComponent(task.id)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.message === "string" ? body.message : "The task could not be updated.");
      router.refresh();
    } catch (err) {
      setError({ id: task.id, message: err instanceof Error ? err.message : "The task could not be updated." });
    } finally {
      setBusy(null);
    }
  }

  const ordered = sortTasks(tasks, today);

  return (
    <Card className="p-6">
      <div id="tasks" className="scroll-mt-24" />
      <h2 className="text-[15px] font-bold text-ink">Tasks</h2>
      {ordered.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted-ink">No tasks have been assigned to you for this project.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {ordered.map((task) => {
            const state = taskState(task, today);
            const reminder = reminderLabel(task.reminder);
            return (
              <li key={task.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("text-[14px] font-medium", state === "COMPLETED" ? "text-muted-ink line-through" : "text-ink")}>{task.title}</p>
                  <StatusBadge label={TASK_STATE_LABEL[state]} tone={STATE_TONE[state]} />
                  <span className="text-[12px] text-muted-ink">
                    {task.status} · {task.priority} priority
                  </span>
                </div>
                <p className="text-[12px] text-muted-ink">
                  Due {isIsoDate(task.dueDate) ? formatLongDate(task.dueDate) : task.dueDate}
                </p>
                {task.description && <p className="text-[13px] text-muted-ink">{task.description}</p>}
                {reminder && (
                  <p className={cn("text-[12px]", reminder.tone === "bad" ? "text-danger" : "text-muted-ink")}>{reminder.text}</p>
                )}

                {task.status !== "Completed" && (
                  <div className="flex flex-wrap gap-2">
                    {task.status !== "In Progress" && (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => move(task, "In Progress")}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-ink hover:bg-nav-hover disabled:opacity-60"
                      >
                        {busy === task.id && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />} Start
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => move(task, "Completed")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                    >
                      {busy === task.id && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />} Mark done
                    </button>
                  </div>
                )}
                {error?.id === task.id && (
                  <p role="alert" className="text-[12px] text-danger">
                    {error.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
