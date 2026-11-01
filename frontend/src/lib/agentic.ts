"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FriendlyError, friendlyActionMessage, friendlyThrown } from "@/lib/friendlyError";

/**
 * Client access to the agent work feeds. Everything goes through the authenticated same-origin proxy
 * (/api/backend), so the server always knows who is asking and decides what they may see.
 */
export const AGENTIC = "/api/backend/agentic";
export const INTEGRATIONS = "/api/backend/integrations";


export interface FeedItem {
  id: string;
  at: string;
  agent: string;
  summary: string;
  status: "success" | "simulated" | "failed" | "pending_approval" | "blocked" | "skipped";
  statusLabel: string;
  tier: 1 | 2 | 3;
  tierLabel: string;
  followUp: string | null;
  trigger: string;
  projectId: string | null;
  simulated: boolean;
}

export interface ApprovalItem {
  id: string;
  type: "admission" | "mentor_allocation" | "investor_intro";
  title: string;
  summary: string;
  requestedBy: string;
  status: string;
  createdAt: string;
  evidence: Record<string, any>;
  projectId: string | null;
}

export interface AgentWork {
  id: string;
  agent: string;
  state: string;
  step: string;
  headline: string;
  waitingOn: string;
  detail: string;
  updatedAt: string;
}

export interface AttentionItem extends AgentWork {
  startup: string | null;
  problem: string;
  attempts: FeedItem[];
}

export interface Counts {
  unreadNotifications: number;
  pendingApprovals: number;
  mentorRequests: number;
  openTasks: number;
  needsAttention: number;
}

/** JSON request to the backend through the proxy. Failures become messages that are safe to show. */
export async function agenticRequest<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T & { message?: string; partial?: boolean }> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: { ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}), ...(init?.headers || {}) },
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    });
  } catch (error) {
    throw new FriendlyError(friendlyThrown(error));
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.success === false) {
    throw new FriendlyError(friendlyActionMessage(response.status, body, typeof body?.message === "string" && response.status < 500 ? body.message : undefined));
  }
  return body;
}

interface Options {
  /** Re-fetch every N ms so activity appears on its own while the page is open. */
  refreshMs?: number;
  enabled?: boolean;
}

/** Loads `/agentic/<path>` and keeps it fresh. A failure is reported as `error`, never as an empty list. */
export function useAgentic<T>(path: string, { refreshMs = 20000, enabled = true }: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  const load = useCallback(
    async (quiet = false) => {
      if (!enabled) return;
      if (!quiet) setLoading(true);
      try {
        const body = await agenticRequest<{ data: T }>(path);
        if (!alive.current) return;
        setData(body.data);
        setError(null);
      } catch (e) {
        if (!alive.current) return;
        setError(friendlyThrown(e));
      } finally {
        if (alive.current && !quiet) setLoading(false);
      }
    },
    [path, enabled]
  );

  useEffect(() => {
    alive.current = true;
    void load();
    if (!refreshMs || !enabled) return () => { alive.current = false; };
    const timer = setInterval(() => void load(true), refreshMs);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, [load, refreshMs, enabled]);

  return { data, error, loading, reload: () => load(true) };
}

export function timeAgo(value: string | Date): string {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatWhen(value: string | Date): string {
  return new Date(value).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}
