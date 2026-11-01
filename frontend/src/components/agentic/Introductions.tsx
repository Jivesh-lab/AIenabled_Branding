"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import { EmptyState, ErrorState, ListItemSkeleton, Spinner } from "@/components/shared/loading/primitives";
import { friendlyThrown } from "@/lib/friendlyError";
import { AGENTIC, agenticRequest, useAgentic } from "@/lib/agentic";

interface Intro {
  id: string;
  startup: string;
  sector?: string;
  stage?: string;
  tagline?: string;
  investor?: string;
  fund?: string;
  status: string;
  consent: "not_required" | "pending" | "granted" | "declined";
  investorResponse: "pending" | "accepted" | "declined";
  why: string[];
  meeting: { date?: string; time?: string } | null;
  feedbackGiven: boolean;
}

const STATUS: Record<string, string> = {
  awaiting_founder_consent: "Waiting for the founders",
  pending_admin_review: "With an administrator",
  approved: "Approved - waiting for the investor",
  scheduled: "Meeting arranged",
  declined: "Declined",
  cancelled: "Closed",
};

function Row({ intro, role, onDone }: { intro: Intro; role: "founder" | "investor"; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function post(path: string, json: unknown, key: string) {
    setBusy(key);
    try {
      const res = await agenticRequest<{ message: string }>(`${AGENTIC}/introductions/${intro.id}/${path}`, { method: "POST", json });
      toast.success(res.message);
      onDone();
    } catch (error) {
      toast.error(friendlyThrown(error));
    } finally {
      setBusy(null);
    }
  }

  const needsConsent = role === "founder" && intro.consent === "pending";
  const needsResponse = role === "investor" && intro.status === "approved" && intro.investorResponse === "pending";
  const canFeedback = intro.status === "scheduled" && !intro.feedbackGiven;

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={STATUS[intro.status] || intro.status} tone={needsConsent || needsResponse ? "attention" : intro.status === "scheduled" ? "success" : "info"} />
        <span className="text-[14px] font-semibold text-ink">{role === "founder" ? `Introduction to ${intro.investor}${intro.fund ? ` (${intro.fund})` : ""}` : intro.startup}</span>
      </div>
      {role === "investor" && <p className="mt-1 text-[13px] text-muted-ink">{intro.tagline} {intro.sector ? `· ${intro.sector}` : ""} {intro.stage ? `· ${intro.stage}` : ""}</p>}
      {intro.why.length > 0 && <p className="mt-1 text-[12.5px] text-ink"><span className="font-medium">Why this match: </span>{intro.why.join("; ")}</p>}
      {intro.meeting?.time && <p className="mt-1 text-[12.5px] text-ink">Meeting: {intro.meeting.time}</p>}

      {needsConsent && (
        <div className="mt-3 rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-3">
          <p className="text-[13px] text-ink">May we introduce {intro.startup} to this investor? Nothing is shared until you say yes and an administrator approves.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy !== null} onClick={() => post("consent", { grant: false }, "no")} className="h-9 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-danger/40 hover:text-danger disabled:opacity-60">{busy === "no" ? <Spinner className="size-4" /> : "No, thanks"}</button>
            <button type="button" disabled={busy !== null} onClick={() => post("consent", { grant: true }, "yes")} className="h-9 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{busy === "yes" ? <Spinner className="size-4" /> : "Yes, introduce us"}</button>
          </div>
        </div>
      )}
      {needsResponse && (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy !== null} onClick={() => post("respond", { accept: false }, "no")} className="h-9 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-danger/40 hover:text-danger disabled:opacity-60">Not interested</button>
          <button type="button" disabled={busy !== null} onClick={() => post("respond", { accept: true }, "yes")} className="h-9 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{busy === "yes" ? <Spinner className="size-4" /> : "Accept and arrange a meeting"}</button>
        </div>
      )}
      {canFeedback && (
        <div className="mt-3 space-y-2 rounded-lg border border-line bg-canvas/60 p-3">
          <p className="text-[12.5px] font-medium text-ink">How did it go?</p>
          <div className="flex items-center gap-2">
            <label className="text-[12.5px] text-muted-ink" htmlFor={`rating-${intro.id}`}>Rating</label>
            <select id={`rating-${intro.id}`} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="h-8 rounded-lg border border-line bg-white px-2 text-[13px]">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={1000} placeholder="A short comment (optional)" className="w-full rounded-lg border border-line bg-white p-2.5 text-[13px]" />
          <button type="button" disabled={busy !== null} onClick={() => post("feedback", { rating, comment }, "fb")} className="h-9 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{busy === "fb" ? <Spinner className="size-4" /> : "Send feedback"}</button>
        </div>
      )}
    </li>
  );
}

/** Investor introductions: founder consent, investor response, meeting status and feedback. */
export default function Introductions({ role, title = "Introductions", className }: { role: "founder" | "investor"; title?: string; className?: string }) {
  const { data, error, loading, reload } = useAgentic<Intro[]>(`${AGENTIC}/introductions`, { refreshMs: 30000 });
  return (
    <section aria-label={title} className={className}>
      <SectionHeading title={title} />
      <Card>
        {loading && !data ? (
          <div className="divide-y divide-line"><ListItemSkeleton /></div>
        ) : error && !data ? (
          <ErrorState title="Could not load introductions" message={error} onRetry={reload} />
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-line">{data.map((i) => <Row key={i.id} intro={i} role={role} onDone={reload} />)}</ul>
        ) : (
          <EmptyState
            icon={Handshake}
            title={role === "founder" ? "No investor introductions yet" : "No introductions yet"}
            description={role === "founder" ? "When your startup reaches the readiness criteria, the Investor Agent finds matching investors and asks for your consent before anything is shared." : "Matching startups appear here once their founders have agreed and an administrator has approved the introduction."}
          />
        )}
      </Card>
    </section>
  );
}
