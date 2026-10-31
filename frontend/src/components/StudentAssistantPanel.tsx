"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { useStudentAssistant, type AssistantMessage } from "@/hooks/useStudentAssistant";

const SUGGESTED = [
  "What is the current status of my application?",
  "What should I work on next?",
  "Tell me about my upcoming meetings",
  "Who is my mentor?",
];

function Reply({ message }: { message: AssistantMessage }) {
  const reply = message.reply;
  if (!reply) return null;

  if (reply.answer) {
    return (
      <div className="rounded-2xl rounded-bl-sm border border-gray-200 bg-white p-3.5 text-sm text-gray-800 shadow-sm">
        <p>{reply.answer}</p>
        {reply.links.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {reply.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-xs font-semibold text-blue-700 underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl rounded-bl-sm border border-gray-200 bg-white p-3.5 text-sm text-gray-800 shadow-sm">
      {reply.projectName && <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">About: {reply.projectName}</p>}

      <section aria-label="From your records">
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="size-3.5" aria-hidden="true" /> From your records
        </h4>
        {reply.verified.length === 0 ? (
          <p className="mt-1 text-gray-600">Nothing is recorded that answers this.</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {reply.verified.map((f, i) => (
              <li key={i}>
                {f.href ? (
                  <Link href={f.href} className="hover:underline">
                    {f.text}
                  </Link>
                ) : (
                  f.text
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {reply.unavailable.length > 0 && (
        <section aria-label="Unavailable information" className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
          <h4 className="flex items-center gap-1.5 text-xs font-bold">
            <AlertTriangle className="size-3.5" aria-hidden="true" /> Not available right now
          </h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {reply.unavailable.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="AI suggestions" className="rounded-lg border border-dashed border-indigo-300 bg-indigo-50/60 p-2.5">
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
          <Sparkles className="size-3.5" aria-hidden="true" /> AI suggestions (not a record or a decision)
        </h4>
        {reply.guidance ? (
          <p className="mt-1 whitespace-pre-wrap text-gray-800">{reply.guidance.text}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-600">{reply.guidanceNote ?? "No AI suggestion for this question."}</p>
        )}
      </section>

      {reply.links.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Related pages">
          {reply.links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {reply.disclaimer && <p className="text-[11px] leading-snug text-gray-500">{reply.disclaimer}</p>}
    </div>
  );
}

/** The student version of the assistant body: project picker, suggested questions, labelled answers. */
export default function StudentAssistantPanel() {
  const a = useStudentAssistant();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [a.messages, a.sending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || a.sending || a.projectsState !== "ready") return;
    void a.send(input);
    setInput("");
  };

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
        {a.projectsState === "loading" && (
          <p role="status" className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading your projects…
          </p>
        )}

        {a.projectsState === "error" && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {a.projectsError}
            <button type="button" onClick={() => void a.retryProjects()} className="ml-2 font-semibold underline">
              Try again
            </button>
          </div>
        )}

        {a.projectsState === "ready" && a.projects.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            <p>You have no saved projects yet, so there are no records for me to answer from.</p>
            <Link href="/workspace/student/submit" className="mt-2 inline-block font-semibold text-blue-700 underline">
              Submit an idea
            </Link>
          </div>
        )}

        {a.projectsState === "ready" && a.projects.length > 1 && (
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Project
            <select
              value={a.selectedId ?? ""}
              onChange={(e) => a.selectProject(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900"
            >
              {a.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {a.projectsState === "ready" && a.projects.length > 0 && a.messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Ask about your application, milestones, mentor, meetings or tasks. I answer from your saved records.</p>
            <ul className="flex flex-col gap-1.5">
              {SUGGESTED.map((q) => (
                <li key={q}>
                  <button type="button" onClick={() => void a.send(q)} disabled={a.sending} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-800 hover:bg-blue-50 disabled:opacity-60">
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 p-3 text-sm text-white">
              {m.text}
            </div>
          ) : m.role === "error" ? (
            <div key={m.id} role="alert" className="max-w-[90%] rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="max-w-[92%]">
              <Reply message={m} />
            </div>
          ),
        )}

        {a.sending && (
          <p role="status" className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking your records…
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex shrink-0 items-end gap-2 border-t border-gray-200 bg-white p-4">
        <textarea
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          placeholder="Ask about your project…"
          aria-label="Your question"
          rows={1}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-100 p-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
        />
        <button
          type="submit"
          disabled={!input.trim() || a.sending || a.projectsState !== "ready" || a.projects.length === 0}
          aria-label="Send question"
          className="flex shrink-0 items-center justify-center rounded-xl bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="size-5" aria-hidden="true" />
        </button>
      </form>
    </>
  );
}
