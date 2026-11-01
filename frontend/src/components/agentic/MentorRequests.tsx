"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { EmptyState, ErrorState, ListItemSkeleton, Spinner } from "@/components/shared/loading/primitives";
import { friendlyThrown } from "@/lib/friendlyError";
import { AGENTIC, agenticRequest, formatWhen, useAgentic } from "@/lib/agentic";
import { Inbox } from "lucide-react";

interface MentorRequestItem {
  id: string;
  status: "pending" | "accepted" | "declined" | "timed_out" | "withdrawn";
  projectTitle: string;
  domain?: string;
  stage?: string;
  description?: string;
  why: string[];
  dueAt: string;
  expired: boolean;
}

const STATUS: Record<MentorRequestItem["status"], { label: string; tone: "attention" | "success" | "neutral" | "danger" }> = {
  pending: { label: "Waiting for you", tone: "attention" },
  accepted: { label: "You accepted", tone: "success" },
  declined: { label: "You declined", tone: "neutral" },
  timed_out: { label: "Expired", tone: "neutral" },
  withdrawn: { label: "Closed", tone: "neutral" },
};

function Row({ item, onDone }: { item: MentorRequestItem; onDone: () => void }) {
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [note, setNote] = useState("");
  const open = item.status === "pending" && !item.expired;
  const status = item.expired && item.status === "pending" ? STATUS.timed_out : STATUS[item.status];

  async function respond(decision: "accept" | "decline") {
    setBusy(decision);
    try {
      const res = await agenticRequest<{ message: string }>(`${AGENTIC}/mentor/requests/${item.id}/respond`, { method: "POST", json: { decision, note: note.trim() || undefined } });
      toast.success(res.message);
      onDone();
    } catch (error) {
      toast.error(friendlyThrown(error, "We could not record your answer. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={status.label} tone={status.tone} />
        <span className="text-[14px] font-semibold text-ink">{item.projectTitle}</span>
        {item.domain && <span className="text-[12px] text-muted-ink">{item.domain}{item.stage ? ` · ${item.stage}` : ""}</span>}
      </div>
      {item.description && <p className="mt-1 text-[13px] text-muted-ink">{item.description}</p>}
      {item.why.length > 0 && <p className="mt-1 text-[12.5px] text-ink"><span className="font-medium">Why you: </span>{item.why[0]}</p>}
      {open ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Add a note (optional)" className="h-9 min-w-[200px] flex-1 rounded-lg border border-line bg-white px-3 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" />
          <button type="button" disabled={busy !== null} onClick={() => respond("decline")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-danger/40 hover:text-danger disabled:opacity-60">
            {busy === "decline" && <Spinner className="size-4" />} Decline
          </button>
          <button type="button" disabled={busy !== null} onClick={() => respond("accept")} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
            {busy === "accept" && <Spinner className="size-4" />} Accept
          </button>
          <p className="w-full text-[11.5px] text-muted-ink">Please reply by {formatWhen(item.dueAt)}. If you do not, the next mentor is asked.</p>
        </div>
      ) : null}
    </li>
  );
}

/** Incoming mentoring requests from the Mentor-Matching Agent, with accept / decline. */
export default function MentorRequests({ className }: { className?: string }) {
  const { data, error, loading, reload } = useAgentic<MentorRequestItem[]>(`${AGENTIC}/mentor/requests`, { refreshMs: 20000 });
  return (
    <section aria-label="Mentoring requests" className={className}>
      <SectionHeading title="Mentoring requests" />
      <Card>
        {loading && !data ? (
          <div className="divide-y divide-line"><ListItemSkeleton withAction /></div>
        ) : error && !data ? (
          <ErrorState title="Could not load requests" message={error} onRetry={reload} />
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-line">{data.map((r) => <Row key={r.id} item={r} onDone={reload} />)}</ul>
        ) : (
          <EmptyState icon={Inbox} title="No requests right now" description="When a startup is approved and your expertise fits, the Mentor-Matching Agent asks you here and by email. You answer once; if you decline, it moves on to the next mentor." />
        )}
      </Card>
    </section>
  );
}
