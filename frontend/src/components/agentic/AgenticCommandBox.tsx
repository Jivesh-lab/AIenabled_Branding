"use client";

import { useEffect, useRef, useState } from "react";
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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [exchanges, busy]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const id = ++counter.current;
    setExchanges((list) => [...list, { id, question: text }]);
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
    <div className="flex flex-1 flex-col min-h-0 bg-white dark:bg-gray-900">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950/50" aria-live="polite">
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          <p className="font-semibold flex items-center gap-1.5 mb-1">
            <Zap className="size-3.5 text-blue-600" aria-hidden="true" /> Autonomous Agent Control
          </p>
          <p className="text-[11px] text-blue-700 dark:text-blue-300">
            Instruct workflow agents, check recent agent activities, view pending approvals, or schedule meetings.
          </p>
        </div>

        {exchanges.length === 0 ? (
          <div className="py-2 space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Suggested commands:</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  disabled={busy}
                  className="rounded-lg border border-gray-200 bg-white p-2.5 text-left text-xs text-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 transition-colors disabled:opacity-60"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          exchanges.map((e) => (
            <div key={e.id} className="space-y-1.5">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-3.5 py-2 text-xs text-white">
                {e.question}
              </p>
              {!e.answer && !e.error ? (
                <p className="flex items-center gap-1.5 text-xs text-gray-500 py-1">
                  <Loader2 className="size-3.5 animate-spin text-blue-600" aria-hidden="true" /> Checking the records...
                </p>
              ) : e.error ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {e.error}
                </p>
              ) : e.answer?.handled ? (
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-gray-200 bg-white p-3 text-xs text-gray-800 shadow-sm dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  <p className="whitespace-pre-wrap leading-relaxed">{e.answer.reply}</p>
                  {e.answer.performed && e.answer.performed.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      Recorded in action log: {e.answer.performed.map((p) => `${p.agent} - ${p.status}`).join("; ")}
                    </p>
                  )}
                  {e.answer.actions && e.answer.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {e.answer.actions.map((a) => (
                        <Link
                          key={a.href}
                          href={a.href}
                          className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
                        >
                          {a.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="max-w-[92%] rounded-2xl rounded-bl-sm border border-gray-200 bg-white p-3 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  That is not something I can look up or do directly. {e.answer?.hint === "llm_not_configured" ? "The AI model is not configured yet for open-ended questions. " : "Try switching to the AI Advisor tab for open guidance. "}I can summarise what the agents did, list missing items, and arrange meetings.
                </p>
              )}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); void ask(input); }} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="e.g. Schedule a review with my mentor next Thursday"
            aria-label="Ask or instruct the agents"
            className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs text-gray-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Send command"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <SendHorizontal className="size-4" aria-hidden="true" />}
          </button>
        </form>
      </div>
    </div>
  );
}
