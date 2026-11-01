"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { ErrorState } from "@/components/shared/loading/primitives";
import { cn } from "@/lib/utils";
import { friendlyActionMessage, friendlyThrown } from "@/lib/friendlyError";
import { useApiList } from "@/lib/useApiList";
import FeedbackStats from "./_components/FeedbackStats";
import { RequestListSkeleton } from "./_components/FeedbackSkeleton";
import RequestCard from "./_components/RequestCard";
import { REQUEST_TAB_LABEL, filterRequests, toRequests, type RequestTab } from "./_components/requests";

const EMPTY: Record<RequestTab, string> = {
  open: "No questions are waiting for a reply.",
  resolved: "You haven't resolved any questions yet.",
  all: "Your mentees haven't sent any questions yet.",
};
const REPLY_FAILED = "We couldn't send your reply. Please try again.";

export default function MentorFeedbackPage() {
  const { items: requests, loading, failed, reload } = useApiList("/api/faculty/support-requests", toRequests);
  const [tab, setTab] = useState<RequestTab>("open");

  const visible = useMemo(() => filterRequests(requests, tab), [requests, tab]);
  const counts = useMemo(
    () => ({ open: filterRequests(requests, "open").length, resolved: filterRequests(requests, "resolved").length, all: requests.length }),
    [requests]
  );

  /** Saves a reply through the existing API. The card closes its form only when this resolves true. */
  async function reply(id: string, response: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/faculty/support-requests/${encodeURIComponent(id)}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(friendlyActionMessage(res.status, body, REPLY_FAILED));
        return false;
      }
      toast.success("Reply sent", { description: "The question is now marked resolved." });
      await reload();
      return true;
    } catch (error) {
      toast.error(friendlyThrown(error, REPLY_FAILED));
      return false;
    }
  }

  return (
    <PageContainer
      title="Feedback & Questions"
      description="Questions and feedback requests from your mentees. Reply to resolve them."
    >
      <FeedbackStats requests={requests} loading={loading} failed={failed} />

      {!failed && (
        <div role="tablist" aria-label="Question filter" className="flex flex-wrap gap-1">
          {(Object.keys(REQUEST_TAB_LABEL) as RequestTab[]).map((key) => {
            const selected = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/40",
                  selected ? "bg-brand-soft font-semibold text-brand" : "font-medium text-muted-ink hover:bg-nav-hover hover:text-ink"
                )}
              >
                {REQUEST_TAB_LABEL[key]} <span className="tabular-nums">({loading ? "–" : counts[key]})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <RequestListSkeleton />
      ) : failed ? (
        <Card>
          <ErrorState
            title="We couldn't load your questions"
            message="Something went wrong on our side. Please try again in a moment."
            onRetry={() => void reload()}
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <p className="text-[14px] font-semibold text-ink">Nothing here</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-ink">{EMPTY[tab]}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((request) => (
            <RequestCard key={request.id} request={request} onReply={reply} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
