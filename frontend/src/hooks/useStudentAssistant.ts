"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AssistantProject {
  id: string;
  name: string;
  status: string;
}

export interface AssistantReply {
  projectId?: string;
  projectName?: string;
  /** Present for refusals / empty states, where there are no records to show. */
  answer?: string;
  verified: { text: string; href: string | null }[];
  unavailable: string[];
  links: { label: string; href: string }[];
  guidance: { text: string; source: "ai" } | null;
  guidanceNote?: string | null;
  disclaimer?: string;
}

export interface AssistantMessage {
  id: number;
  role: "user" | "assistant" | "error";
  text?: string;
  reply?: AssistantReply;
}

type ProjectsState = "loading" | "ready" | "error";

/**
 * Student assistant state. Questions go to /api/student/assistant (session-authenticated, server-side); the browser
 * never sends a student id and never talks to the agent service directly.
 */
export function useStudentAssistant() {
  const [projects, setProjects] = useState<AssistantProject[]>([]);
  const [projectsState, setProjectsState] = useState<ProjectsState>("loading");
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [sending, setSending] = useState(false);
  const nextId = useRef(1);
  const inFlight = useRef<AbortController | null>(null);

  const loadProjects = useCallback(async () => {
    setProjectsState("loading");
    setProjectsError(null);
    try {
      const res = await fetch("/api/student/assistant", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) throw new Error((body && typeof body.message === "string" && body.message) || "Your projects could not be loaded.");
      const list = (body.projects ?? []) as AssistantProject[];
      setProjects(list);
      setSelectedId((current) => (current && list.some((p) => p.id === current) ? current : (list.find((p) => p.status !== "REJECTED") ?? list[0])?.id ?? null));
      setProjectsState("ready");
    } catch (err) {
      setProjectsError(err instanceof Error ? err.message : "Your projects could not be loaded.");
      setProjectsState("error");
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    return () => inFlight.current?.abort();
  }, [loadProjects]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || sending) return;
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      setMessages((m) => [...m, { id: nextId.current++, role: "user", text: question }]);
      setSending(true);
      try {
        const res = await fetch("/api/student/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question, ...(selectedId ? { projectId: selectedId } : {}) }),
          signal: controller.signal,
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) throw new Error((body && typeof body.message === "string" && body.message) || "The assistant could not answer right now.");
        setMessages((m) => [...m, { id: nextId.current++, role: "assistant", reply: body as AssistantReply }]);
      } catch (err) {
        if (controller.signal.aborted) return;
        setMessages((m) => [...m, { id: nextId.current++, role: "error", text: err instanceof Error ? err.message : "The assistant could not answer right now." }]);
      } finally {
        if (inFlight.current === controller) setSending(false);
      }
    },
    [selectedId, sending],
  );

  return { projects, projectsState, projectsError, selectedId, selectProject: setSelectedId, messages, sending, send, retryProjects: loadProjects, clear: () => setMessages([]) };
}
