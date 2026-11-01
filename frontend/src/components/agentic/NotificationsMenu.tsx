"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { friendlyThrown } from "@/lib/friendlyError";
import { AGENTIC, agenticRequest, timeAgo } from "@/lib/agentic";

interface Notice {
  _id: string;
  title: string;
  message: string;
  kind: string;
  severity: "info" | "action" | "warning";
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

function Icon({ notice }: { notice: Notice }) {
  const cls = "size-4";
  if (notice.severity === "warning") return <AlertTriangle className={cn(cls, "text-danger")} aria-hidden="true" />;
  if (notice.kind === "meeting") return <CalendarClock className={cn(cls, "text-brand")} aria-hidden="true" />;
  if (notice.kind === "reminder" || notice.severity === "action") return <BellRing className={cn(cls, "text-brand-gold-ink")} aria-hidden="true" />;
  if (notice.kind === "status") return <CheckCircle2 className={cn(cls, "text-success")} aria-hidden="true" />;
  return <Info className={cn(cls, "text-muted-ink")} aria-hidden="true" />;
}

/**
 * The bell. The badge counts the signed-in person's own unread notices - nothing else - and the list shows exactly
 * those notices (reminders, requests, meeting changes), newest first.
 */
export default function NotificationsMenu() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(body?.data)) throw new Error("unavailable");
      setNotices(body.data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = notices.filter((n) => !n.readAt).length;

  async function openNotice(notice: Notice) {
    setOpen(false);
    if (!notice.readAt) {
      setNotices((list) => list.map((n) => (n._id === notice._id ? { ...n, readAt: new Date().toISOString() } : n)));
      fetch(`/api/backend/notifications/${notice._id}/read`, { method: "PATCH" }).catch(() => undefined);
    }
    if (notice.link) router.push(notice.link);
  }

  async function markAll() {
    try {
      await agenticRequest(`${AGENTIC}/notifications/read-all`, { method: "POST", json: {} });
      setNotices((list) => list.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    } catch (error) {
      toast.error(friendlyThrown(error));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-lg text-icon transition-colors duration-150 hover:bg-nav-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <BellIcon className="size-5" aria-hidden="true" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-danger px-1 text-[9px] font-bold leading-none text-white">
            {Math.min(unread, 99)}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-line bg-white shadow-lg shadow-slate-200/60">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[13.5px] font-semibold text-ink">Notifications</p>
            {unread > 0 && <button type="button" onClick={markAll} className="text-[12px] font-medium text-brand hover:underline">Mark all as read</button>}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {failed && notices.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted-ink">We could not load your notifications. They will appear here when the connection is back.</p>
            ) : notices.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13.5px] font-medium text-ink">You are all caught up</p>
                <p className="mt-1 text-[12.5px] text-muted-ink">Reminders, requests and meeting changes from the agents will show up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {notices.slice(0, 20).map((n) => (
                  <li key={n._id}>
                    <button type="button" onClick={() => openNotice(n)} className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-nav-hover", !n.readAt && "bg-brand-soft/40")}>
                      <span className="mt-0.5 shrink-0"><Icon notice={n} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={cn("truncate text-[13px] text-ink", !n.readAt && "font-semibold")}>{n.title}</span>
                          <time dateTime={n.createdAt} className="shrink-0 text-[11px] text-muted-ink">{timeAgo(n.createdAt)}</time>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-muted-ink">{n.message}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
