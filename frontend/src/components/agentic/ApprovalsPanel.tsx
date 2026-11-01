"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Flag, ShieldAlert, XCircle } from "lucide-react";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { EmptyState, ErrorState, ListItemSkeleton, Spinner } from "@/components/shared/loading/primitives";
import { cn } from "@/lib/utils";
import { friendlyThrown } from "@/lib/friendlyError";
import { AGENTIC, agenticRequest, timeAgo, useAgentic, type ApprovalItem } from "@/lib/agentic";

const TYPE_LABEL: Record<ApprovalItem["type"], string> = {
  admission: "Admission decision",
  mentor_allocation: "Mentor allocation",
  investor_intro: "Investor introduction",
};

function List({ items, empty }: { items?: string[]; empty?: string }) {
  if (!items || items.length === 0) return empty ? <p className="text-[12.5px] text-muted-ink">{empty}</p> : null;
  return (
    <ul className="list-disc space-y-0.5 pl-4 text-[12.5px] text-ink">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-ink">{title}</p>
      {children}
    </div>
  );
}

/** The evidence the agent gathered, laid out for the decision at hand. */
function Evidence({ item }: { item: ApprovalItem }) {
  const e = item.evidence || {};
  if (item.type === "admission") {
    const flags = (e.flags || []) as { kind: string; reason: string }[];
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {flags.length > 0 && (
          <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-amber-900"><Flag className="size-3.5" /> The agent flagged this application</p>
            <List items={flags.map((f) => f.reason)} />
          </div>
        )}
        <Block title="Startup">
          <p className="text-[12.5px] text-ink">{e.startup?.name} - {e.startup?.domain}, {String(e.startup?.stage || "").toLowerCase()} stage, team of {e.startup?.teamSize}</p>
          {e.startup?.tagline && <p className="mt-0.5 text-[12.5px] text-muted-ink">{e.startup.tagline}</p>}
        </Block>
        <Block title="Completeness check">
          <p className="text-[12.5px] text-ink">{e.completeness?.complete ? "All required evidence is present." : "Some evidence is missing."}</p>
        </Block>
        {e.aiAssessed ? (
          <>
            <Block title="Strengths"><List items={e.strengths} empty="None listed" /></Block>
            <Block title="Concerns"><List items={e.weaknesses} empty="None listed" /></Block>
          </>
        ) : (
          <div className="sm:col-span-2"><p className="text-[12.5px] text-muted-ink">{e.assessmentNote || "An AI assessment was not available; only the rule-based checks above were applied."}</p></div>
        )}
        <div className="sm:col-span-2">
          <Block title="Questions to ask the founders"><List items={e.reviewerQuestions} empty="The agent did not prepare questions (AI assessment unavailable)." /></Block>
        </div>
      </div>
    );
  }
  if (item.type === "mentor_allocation") {
    const attempts = (e.attempts || []) as { name: string; outcome: string }[];
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Block title="Proposed mentor">
          <p className="text-[13px] font-semibold text-ink">{e.mentor?.name} <span className="font-normal text-muted-ink">- match {e.mentor?.score}/100</span></p>
          <List items={e.mentor?.reasons} />
        </Block>
        <Block title="Who the agent asked">
          <ul className="space-y-0.5 text-[12.5px] text-ink">{attempts.map((a, i) => <li key={i}>{a.name}: <span className="text-muted-ink">{a.outcome}</span></li>)}</ul>
          {(e.alternatives || []).length > 0 && <p className="mt-1 text-[12px] text-muted-ink">Other candidates: {(e.alternatives as { name: string; score: number }[]).map((a) => `${a.name} (${a.score})`).join(", ")}</p>}
        </Block>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Block title="Why this investor"><List items={e.match?.reasons} /></Block>
      <Block title="Founder consent"><p className="text-[12.5px] text-ink">{e.founderConsent === "granted" ? "The founders agreed to this introduction." : "Not recorded"}</p></Block>
      <div className="sm:col-span-2"><Block title="What will be shared with the investor"><List items={e.willBeShared} /></Block></div>
    </div>
  );
}

function ApprovalRow({ item, onDone }: { item: ApprovalItem; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);

  async function decide(decision: "approved" | "rejected") {
    setBusy(decision);
    try {
      const result = await agenticRequest<{ message: string }>(`${AGENTIC}/approvals/${item.id}/decide`, { method: "POST", json: { decision, comment: comment.trim() || undefined } });
      if (result.partial) toast.warning(result.message);
      else toast.success(result.message);
      onDone();
    } catch (error) {
      toast.error(friendlyThrown(error, "We could not record your decision. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={TYPE_LABEL[item.type]} tone="info" />
            <span className="text-[11.5px] text-muted-ink">Prepared by {item.requestedBy} · {timeAgo(item.createdAt)}</span>
          </div>
          <p className="mt-1.5 text-[14.5px] font-semibold text-ink">{item.title}</p>
          {item.summary && <p className="mt-0.5 text-[13px] text-muted-ink">{item.summary}</p>}
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
            {open ? "Hide the evidence" : "Show the evidence"}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" disabled={busy !== null} onClick={() => decide("rejected")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-danger/40 hover:text-danger disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            {busy === "rejected" ? <Spinner className="size-4" /> : <XCircle className="size-4" aria-hidden="true" />} Reject
          </button>
          <button type="button" disabled={busy !== null} onClick={() => decide("approved")} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50">
            {busy === "approved" ? <Spinner className="size-4" /> : <CheckCircle2 className="size-4" aria-hidden="true" />} Approve
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3 space-y-3 rounded-lg border border-line bg-canvas/60 p-3.5">
          <Evidence item={item} />
        </div>
      )}
      <label className="mt-3 block">
        <span className="sr-only">Optional comment</span>
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          placeholder="Add a comment (optional) - it is saved with your decision"
          className="h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-muted-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        />
      </label>
    </li>
  );
}

/** Tier-3 items waiting for a person, with the agent's evidence and one-click Approve / Reject. */
export default function ApprovalsPanel({
  title = "Approvals needed",
  types,
  emptyMessage = "When an agent has prepared something that needs a person's decision - an admission, a mentor allocation, an introduction - it waits here with the evidence.",
  className,
}: {
  title?: string;
  types?: ApprovalItem["type"][];
  emptyMessage?: string;
  className?: string;
}) {
  const { data, error, loading, reload } = useAgentic<ApprovalItem[]>(`${AGENTIC}/approvals`, { refreshMs: 15000 });
  const items = (data || []).filter((a) => !types || types.includes(a.type));

  return (
    <section aria-label={title} className={className}>
      <SectionHeading title={title} />
      <Card>
        {loading && !data ? (
          <div className="divide-y divide-line"><ListItemSkeleton withAction /><ListItemSkeleton withAction /></div>
        ) : error && !data ? (
          <ErrorState title="Could not load approvals" message={error} onRetry={reload} />
        ) : items.length > 0 ? (
          <ul className="divide-y divide-line">{items.map((item) => <ApprovalRow key={item.id} item={item} onDone={reload} />)}</ul>
        ) : (
          <EmptyState icon={ShieldAlert} title="Nothing is waiting for you" description={emptyMessage} />
        )}
      </Card>
    </section>
  );
}
