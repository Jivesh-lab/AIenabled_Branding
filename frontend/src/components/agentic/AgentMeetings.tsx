"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { EmptyState, ErrorState, ListItemSkeleton, Spinner } from "@/components/shared/loading/primitives";
import { friendlyThrown } from "@/lib/friendlyError";
import { AGENTIC, agenticRequest, formatWhen, useAgentic } from "@/lib/agentic";

interface MeetingItem {
  id: string;
  title: string;
  projectTitle: string;
  startUtc: string;
  endUtc: string;
  outcome: "pending" | "held" | "no_show" | "cancelled";
  calendarMode: string;
  link: string;
  invitation: string;
  response: "accepted" | "declined" | null;
}

const OUTCOME: Record<MeetingItem["outcome"], { label: string; tone: "info" | "success" | "attention" | "neutral" }> = {
  pending: { label: "Upcoming", tone: "info" },
  held: { label: "Held", tone: "success" },
  no_show: { label: "Missed", tone: "attention" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const CALENDAR_NOTE: Record<string, string> = {
  google: "On Google Calendar",
  ics_email: "Invitation emailed",
  sandbox: "Invitation recorded in the sandbox (not emailed)",
  none: "",
};

function Row({ item, canRecord, onDone }: { item: MeetingItem; canRecord: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState("");
  const ended = new Date(item.endUtc).getTime() < Date.now();

  async function post(path: string, json: unknown, success?: string) {
    setBusy(true);
    try {
      const res = await agenticRequest<{ message: string }>(`${AGENTIC}/meetings/${item.id}/${path}`, { method: "POST", json });
      toast.success(success || res.message);
      setRecording(false);
      onDone();
    } catch (error) {
      toast.error(friendlyThrown(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={OUTCOME[item.outcome].label} tone={OUTCOME[item.outcome].tone} />
        <span className="text-[14px] font-semibold text-ink">{item.title}</span>
      </div>
      <p className="mt-1 text-[13px] text-ink">{formatWhen(item.startUtc)}</p>
      <p className="text-[12px] text-muted-ink">
        {item.projectTitle}
        {CALENDAR_NOTE[item.calendarMode] ? ` · ${CALENDAR_NOTE[item.calendarMode]}` : ""}
        {item.link && /^https?:\/\//.test(item.link) ? <> · <a href={item.link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Join link</a></> : null}
      </p>
      {item.outcome === "pending" && !ended && (
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={busy} onClick={() => post("respond", { accept: true })} className="h-8 rounded-lg border border-line px-3 text-[12.5px] font-medium text-ink hover:border-brand/40 disabled:opacity-60">I can attend</button>
          <button type="button" disabled={busy} onClick={() => post("respond", { accept: false })} className="h-8 rounded-lg border border-line px-3 text-[12.5px] font-medium text-ink hover:border-danger/40 hover:text-danger disabled:opacity-60">Suggest another time</button>
          {item.response && <span className="self-center text-[12px] text-muted-ink">You said: {item.response}</span>}
        </div>
      )}
      {canRecord && item.outcome === "pending" && ended && !recording && (
        <button type="button" onClick={() => setRecording(true)} className="mt-2 h-8 rounded-lg bg-brand px-3 text-[12.5px] font-semibold text-white hover:bg-brand-hover">Record what happened</button>
      )}
      {recording && (
        <div className="mt-3 space-y-2 rounded-lg border border-line bg-canvas/60 p-3">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} placeholder="Short notes on what was discussed" className="w-full rounded-lg border border-line bg-white p-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" />
          <textarea value={items} onChange={(e) => setItems(e.target.value)} rows={3} placeholder="Action items - one per line. The agent turns each into a task for the founders." className="w-full rounded-lg border border-line bg-white p-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => post("outcome", { held: true, notes, actionItems: items.split("\n").map((s) => s.trim()).filter(Boolean) })} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
              {busy && <Spinner className="size-4" />} It took place
            </button>
            <button type="button" disabled={busy} onClick={() => post("outcome", { held: false })} className="h-9 rounded-lg border border-line px-3 text-[13px] font-medium text-ink hover:border-danger/40 hover:text-danger disabled:opacity-60">It did not happen - reschedule</button>
            <button type="button" onClick={() => setRecording(false)} className="h-9 px-2 text-[13px] text-muted-ink hover:text-ink">Cancel</button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Meetings booked by the Workflow Agent for the signed-in person, with attendance and outcome. */
export default function AgentMeetings({ title = "Meetings the agents arranged", canRecord = false, className }: { title?: string; canRecord?: boolean; className?: string }) {
  const { data, error, loading, reload } = useAgentic<MeetingItem[]>(`${AGENTIC}/meetings`, { refreshMs: 30000 });
  return (
    <section aria-label={title} className={className}>
      <SectionHeading title={title} />
      <Card>
        {loading && !data ? (
          <div className="divide-y divide-line"><ListItemSkeleton /></div>
        ) : error && !data ? (
          <ErrorState title="Could not load meetings" message={error} onRetry={reload} />
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-line">{data.map((m) => <Row key={m.id} item={m} canRecord={canRecord} onDone={reload} />)}</ul>
        ) : (
          <EmptyState icon={CalendarClock} title="No meetings booked yet" description="Once a mentor is confirmed, the Workflow Agent finds a time that suits everyone and books the first meeting. It then follows up for notes and action items." />
        )}
      </Card>
    </section>
  );
}
