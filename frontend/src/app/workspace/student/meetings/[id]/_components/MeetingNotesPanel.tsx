"use client";

/**
 * Post-meeting workspace for a student: private notes and action items.
 *
 * Every capability is read from STUDENT_MEETING_PERMISSIONS, so RBAC can later
 * widen or narrow it without touching this UI. Official minutes and follow-up
 * dates belong to the host and are shown read-only by the page, not here.
 *
 * Mock only: changes live in component state and are not persisted.
 */
import { useId, useState } from "react";
import { Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDue, isDueSoon } from "@/lib/dates";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { controlClass, describedBy, FormField } from "@/components/shared/form/FormField";
import {
  MOCK_NOW,
  STUDENT_MEETING_PERMISSIONS as CAN,
  type ActionItem,
  type Meeting,
} from "@/mock/student-meetings";

const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold text-brand transition-colors duration-150 hover:border-brand/40 hover:bg-nav-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

function makeId() {
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function MeetingNotesPanel({ meeting, ended }: { meeting: Meeting; ended: boolean }) {
  const uid = useId();
  const team = meeting.participants.filter((p) => p.role === "Team lead" || p.role === "Member");

  // Personal notes
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState<string | null>(null);
  const notesDirty = notes !== (savedNotes ?? "");

  // Action items
  const [items, setItems] = useState<ActionItem[]>(meeting.actionItems);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", assignee: team[0]?.name ?? "", dueDate: "" });
  const [newItemError, setNewItemError] = useState<string | null>(null);

  function toggle(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id && item.studentEditable ? { ...item, status: item.status === "DONE" ? "OPEN" : "DONE" } : item
      )
    );
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.title.trim()) {
      setNewItemError("Describe the action item");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: makeId(),
        title: newItem.title.trim(),
        assignee: newItem.assignee,
        dueDate: newItem.dueDate || meeting.followUpDate || MOCK_NOW.date,
        status: "OPEN",
        studentEditable: true,
      },
    ]);
    setNewItem({ title: "", assignee: team[0]?.name ?? "", dueDate: "" });
    setNewItemError(null);
    setAdding(false);
  }

  const openCount = items.filter((i) => i.status === "OPEN").length;

  return (
    <>
      {/* Personal notes — for preparation before, and reflection after */}
      {CAN.canKeepPersonalNotes && (
        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink">{ended ? "Your notes" : "Preparation notes"}</h2>
            <span className="text-[12px] text-muted-ink">Visible only to you</span>
          </div>
          <label htmlFor={`${uid}-notes`} className="sr-only">
            {ended ? "Your notes" : "Preparation notes"}
          </label>
          <textarea
            id={`${uid}-notes`}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={ended ? "Key takeaways, decisions, questions to follow up…" : "Questions and points to raise…"}
            className={cn(controlClass, "mt-3 resize-y py-2.5 leading-relaxed")}
          />
          <div className="mt-3 flex items-center justify-end gap-3">
            <span aria-live="polite" className="text-[12px] text-muted-ink">
              {savedNotes !== null && !notesDirty && "Notes saved"}
            </span>
            <button
              type="button"
              disabled={!notesDirty}
              onClick={() => setSavedNotes(notes)}
              className={secondaryButton}
            >
              <Save className="size-3.5" aria-hidden="true" />
              Save Notes
            </button>
          </div>
        </Card>
      )}

      {/* Action items exist only once the meeting has taken place */}
      {ended && (
        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink">Action items</h2>
            <span className="text-[12px] tabular-nums text-muted-ink">
              {openCount} open · {items.length - openCount} done
            </span>
          </div>

          {items.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted-ink">No action items were recorded for this meeting.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {items.map((item) => {
                const done = item.status === "DONE";
                const urgent = !done && isDueSoon(item.dueDate, MOCK_NOW.date);
                return (
                  <li key={item.id} className="flex items-start gap-3 px-3 py-3">
                    <input
                      id={`${uid}-${item.id}`}
                      type="checkbox"
                      checked={done}
                      disabled={!item.studentEditable}
                      onChange={() => toggle(item.id)}
                      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`${uid}-${item.id}`}
                        className={cn(
                          "block text-[14px]",
                          done ? "text-muted-ink line-through" : "text-ink",
                          item.studentEditable ? "cursor-pointer" : "cursor-default"
                        )}
                      >
                        {item.title}
                      </label>
                      <p className="mt-0.5 text-[12px] text-muted-ink">
                        {item.assignee}
                        {!item.studentEditable && " · managed by host"}
                      </p>
                    </div>
                    {done ? (
                      <StatusBadge label="Done" tone="success" />
                    ) : (
                      <span className={cn("shrink-0 text-[12px]", urgent ? "font-medium text-brand-gold-ink" : "text-muted-ink")}>
                        {formatDue(item.dueDate, MOCK_NOW.date)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {CAN.canAddActionItems &&
            (adding ? (
              <form noValidate onSubmit={addItem} className="mt-4 flex flex-col gap-4 rounded-lg border border-line bg-canvas p-4">
                <FormField id={`${uid}-new-title`} label="Action item" required error={newItemError ?? undefined}>
                  <input
                    id={`${uid}-new-title`}
                    type="text"
                    value={newItem.title}
                    onChange={(e) => {
                      setNewItem((p) => ({ ...p, title: e.target.value }));
                      if (newItemError) setNewItemError(null);
                    }}
                    placeholder="e.g. Share test results with the mentor"
                    aria-invalid={!!newItemError}
                    aria-describedby={describedBy(`${uid}-new-title`, { error: !!newItemError })}
                    className={cn(controlClass, "h-10")}
                  />
                </FormField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField id={`${uid}-new-assignee`} label="Assignee" required>
                    <select
                      id={`${uid}-new-assignee`}
                      value={newItem.assignee}
                      onChange={(e) => setNewItem((p) => ({ ...p, assignee: e.target.value }))}
                      className={cn(controlClass, "h-10 cursor-pointer pr-8")}
                    >
                      {team.map((person) => (
                        <option key={person.name} value={person.name}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id={`${uid}-new-due`} label="Due date">
                    <input
                      id={`${uid}-new-due`}
                      type="date"
                      min={MOCK_NOW.date}
                      value={newItem.dueDate}
                      onChange={(e) => setNewItem((p) => ({ ...p, dueDate: e.target.value }))}
                      className={cn(controlClass, "h-10")}
                    />
                  </FormField>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setNewItemError(null);
                    }}
                    className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium text-muted-ink transition-colors hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className={cn(secondaryButton, "mt-4")}>
                <Plus className="size-3.5" aria-hidden="true" />
                Add Action Item
              </button>
            ))}
        </Card>
      )}
    </>
  );
}
