"use client";

import { useId, useState } from "react";
import { ArrowPathIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Card, StatusBadge } from "@/components/shared/Surface";
import { controlClass, describedBy } from "@/components/shared/form/FormField";
import { initialsOf } from "@/lib/displayName";
import type { MenteeRequest } from "./requests";

/**
 * One mentee question. An open question can be answered inline; the reply is saved through the existing API and the
 * question is marked resolved only after the server confirms. A resolved question shows the reply that was saved.
 */
export default function RequestCard({
  request,
  onReply,
}: {
  request: MenteeRequest;
  /** Returns true when the reply was saved, so the form can close; false leaves it open with the text intact. */
  onReply: (id: string, response: string) => Promise<boolean>;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    if (!text.trim()) {
      setError("Write a reply before sending.");
      return;
    }
    setError(null);
    setSending(true);
    const saved = await onReply(request.id, text.trim());
    setSending(false);
    if (saved) {
      setOpen(false);
      setText("");
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3.5">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand">
          {initialsOf(request.mentee)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[15px] font-semibold leading-snug text-ink">{request.mentee}</h3>
            <StatusBadge label={request.resolved ? "Resolved" : "Open"} tone={request.resolved ? "success" : "attention"} />
            <span className="rounded-md border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-muted-ink">{request.category}</span>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-ink">
            {request.project}
            {request.submitted && <> · {request.submitted}</>}
          </p>

          <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-ink">{request.question}</p>

          {request.resolved && request.response && (
            <div className="mt-3 rounded-lg border border-line bg-canvas/60 p-3.5">
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-ink">Your reply</h4>
              <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink">{request.response}</p>
            </div>
          )}

          {!request.resolved && !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
            >
              <ChatBubbleLeftIcon className="size-4" aria-hidden="true" />
              Reply
            </button>
          )}

          {!request.resolved && open && (
            <form noValidate onSubmit={send} className="mt-3">
              <label htmlFor={`${uid}-reply`} className="block text-[13px] font-medium text-ink">
                Your reply to {request.mentee}
              </label>
              <textarea
                id={`${uid}-reply`}
                rows={4}
                maxLength={2000}
                value={text}
                autoFocus
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby={describedBy(`${uid}-reply`, { error: !!error })}
                placeholder="Share your guidance or next steps…"
                className={cn(controlClass, "mt-1.5 resize-y py-2.5 leading-relaxed")}
              />
              {error && (
                <p id={`${uid}-reply-error`} role="alert" className="mt-1.5 text-[12px] font-medium text-danger">
                  {error}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 disabled:opacity-60"
                >
                  {sending && <ArrowPathIcon className="size-4 animate-spin" aria-hidden="true" />}
                  {sending ? "Sending…" : "Send reply"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  disabled={sending}
                  className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}
