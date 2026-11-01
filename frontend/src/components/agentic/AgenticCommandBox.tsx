"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, SendHorizontal, Zap } from "lucide-react";
import { friendlyThrown } from "@/lib/friendlyError";
import { AGENTIC, agenticRequest } from "@/lib/agentic";

interface AssistantReply {
  handled: boolean;
  reply: string | null;
  hint?: "llm_not_configured" | "general";
  actions?: { label: string; href: string }[];
  performed?: { agent: string; action: string; status: string; summary: string }[];
}

interface Exchange {
  id: number;
  question: string;
  answer?: AssistantReply;
  error?: string;
}

const SUGGESTIONS = [
  "What did the agents do for me this week?",
  "What information is missing from my application?",
  "Schedule a review with my mentor next Thursday",
  "Show approvals waiting for me",
];

/**
 * The control surface of the Incubation Assistant. It narrates from the real Action Log and carries out requests through
 * the same agents and approval rules as everything else. What it reports as done is what the log confirms - and a
 * decision that needs a person is never made from here.
 */
export default function AgenticCommandBox() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const counter = useRef(0);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const id = ++counter.current;
    setExchanges((list) => [...list.slice(-2), { id, question: text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await agenticRequest<{ data: AssistantReply }>(`${AGENTIC}/assistant`, { method: "POST", json: { message: text } });
      setExchanges((list) => list.map((e) => (e.id === id ? { ...e, answer: res.data } : e)));
      if (!res.data.handled && res.data.hint === "llm_not_configured") {
        toast.info("Open-ended AI answers are not switched on yet. An administrator can enable them by adding the AI model key.");
      }
    } catch (error) {
      setExchanges((list) => list.map((e) => (e.id === id ? { ...e, error: friendlyThrown(error, "I could not reach the agents just now. Please try again.") } : e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        <Zap className="size-3.5 text-blue-600" aria-hidden="true" /> Ask or instruct the agents
      </p>
      {exchanges.length > 0 && (
        <div className="mb-2 max-h-52 space-y-2 overflow-y-auto" aria-live="polite">
          {exchanges.map((e) => (
            <div key={e.id} className="space-y-1">
              <p className="ml-auto w-fit max-w-[90%] rounded-xl rounded-br-sm bg-blue-600 px-3 py-1.5 text-xs text-white">{e.question}</p>
              {!e.answer && !e.error ? (
                <p className="flex items-center gap-1.5 text-xs text-gray-500"><Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Checking the records...</p>
              ) : e.error ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{e.error}</p>
              ) : e.answer?.handled ? (
                <div className="max-w-[95%] rounded-xl rounded-bl-sm border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800">
                  <p className="whitespace-pre-wrap leading-relaxed">{e.answer.reply}</p>
                  {e.answer.performed && e.answer.performed.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-gray-500">Recorded in the action log: {e.answer.performed.map((p) => `${p.agent} - ${p.status}`).join("; ")}</p>
                  )}
                  {e.answer.actions && e.answer.actions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {e.answer.actions.map((a) => <Link key={a.href} href={a.href} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-100">{a.label}</Link>)}
                    </div>
                  )}
                </div>
              ) : (
                <p className="max-w-[95%] rounded-xl rounded-bl-sm border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  That is not something I can look up or do directly. {e.answer?.hint === "llm_not_configured" ? "The AI model is not switched on yet, so open-ended questions are unavailable. " : "Try the guidance chat below. "}I can summarise what the agents did, list what is missing or waiting, and arrange meetings.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {exchanges.length === 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} disabled={busy} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-700 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60">{s}</button>
          ))}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void ask(input); }} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="e.g. Schedule a review with my mentor next Thursday"
          aria-label="Ask or instruct the agents"
          className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs text-gray-800 focus:border-blue-500 focus:bg-white focus:outline-none"
        />
        <button type="submit" disabled={!input.trim() || busy} aria-label="Send" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <SendHorizontal className="size-4" aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
}
