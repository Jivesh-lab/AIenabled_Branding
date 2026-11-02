"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, CalendarX, ExternalLink, Plus } from "lucide-react";
import { Spinner } from "@/components/shared/loading/primitives";
import { friendlyThrown } from "@/lib/friendlyError";
import { INTEGRATIONS, agenticRequest } from "@/lib/agentic";
import type { IntegrationStatus } from "./IntegrationNotice";

interface Connection { id: string; accountEmail: string; status: string; isPrimary: boolean; needsReconnect: boolean }
interface CalendarEvent { id: string; title: string; start: string; end: string; allDay: boolean; link: string | null; meetLink: string | null }

function when(event: CalendarEvent): string {
  const opts: Intl.DateTimeFormatOptions = event.allDay ? { weekday: "short", day: "numeric", month: "short" } : { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };
  return new Date(event.start).toLocaleString("en-IN", opts);
}

/**
 * Google Calendar for the signed-in person. Connecting is a separate step from signing in, is optional, and asks Google
 * only for access to calendar events. Several Google accounts can be connected; each is listed and removable on its own.
 */
export default function GoogleCalendarCard() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", startTime: "10:00", endTime: "10:45", description: "" });
  // One id per form: if a save is retried after a hiccup, Google sees the same id and cannot create the event twice.
  const requestId = useRef(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

  const loadEvents = useCallback(async () => {
    try {
      const from = new Date();
      const to = new Date(Date.now() + 14 * 86400000);
      const res = await agenticRequest<{ data: CalendarEvent[] }>(`${INTEGRATIONS}/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`);
      setEvents(res.data);
      setEventsError(null);
    } catch (e) {
      setEvents(null);
      setEventsError(friendlyThrown(e));
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        agenticRequest<{ data: IntegrationStatus }>(`${INTEGRATIONS}/status`),
        agenticRequest<{ data: Connection[] }>(`${INTEGRATIONS}/google/connections`),
      ]);
      setStatus(s.data);
      setConnections(c.data);
      setError(null);
      if (s.data.you?.googleCalendar.connected) void loadEvents();
      else setEvents(null);
    } catch (e) {
      setError(friendlyThrown(e));
    }
  }, [loadEvents]);

  useEffect(() => {
    void load();
  }, [load]);

  async function connect() {
    if (status && !status.calendar.configured) {
      toast.warning("Google Calendar is not set up on this server yet. Ask an administrator to add the Google credentials, then try again.");
      return;
    }
    setBusy(true);
    try {
      const res = await agenticRequest<{ data: { url: string } }>(`${INTEGRATIONS}/google/connect-url`);
      window.location.href = res.data.url;
    } catch (e) {
      toast.error(friendlyThrown(e, "We could not start the Google connection. Please try again."));
      setBusy(false);
    }
  }

  async function disconnect(id?: string) {
    setBusy(true);
    try {
      const res = await agenticRequest<{ message: string }>(id ? `${INTEGRATIONS}/google/connections/${id}` : `${INTEGRATIONS}/google`, { method: "DELETE" });
      toast.success(res.message);
      await load();
    } catch (e) {
      toast.error(friendlyThrown(e));
    } finally {
      setBusy(false);
    }
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await agenticRequest<{ message: string }>(`${INTEGRATIONS}/calendar/events`, {
        method: "POST",
        json: { ...form, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata", requestId: requestId.current },
      });
      toast.success(res.message);
      requestId.current = crypto.randomUUID();
      setForm({ title: "", date: "", startTime: "10:00", endTime: "10:45", description: "" });
      setAdding(false);
      await loadEvents();
    } catch (err) {
      toast.error(friendlyThrown(err, "We could not add that event. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const connected = Boolean(status?.you?.googleCalendar.connected);
  const reconnect = Boolean(status?.you?.googleCalendar.needsReconnect);
  const notSetUp = Boolean(status && !status.calendar.configured);
  const field = "h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          {connected ? <CalendarCheck className="size-[18px]" /> : <CalendarX className="size-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">Google Calendar</p>
          {error ? (
            <p className="text-[12.5px] text-danger">{error}</p>
          ) : !status ? (
            <p className="text-[12.5px] text-muted-ink">Checking...</p>
          ) : connected ? (
            <p className="text-[12.5px] text-muted-ink">Connected. Meetings the agents arrange with you are added to your calendar with a Meet link, and your busy times are respected when they look for a slot.</p>
          ) : reconnect ? (
            <p className="text-[12.5px] text-brand-gold-ink">Google asked you to sign in again. Reconnect so new meetings reach your calendar.</p>
          ) : notSetUp ? (
            <p className="text-[12.5px] text-muted-ink">Calendar connection is not available yet - an administrator has to add the Google credentials to the server. Until then meetings are arranged by email invitation.</p>
          ) : (
            <p className="text-[12.5px] text-muted-ink">Optional. Connect your Google account so meetings appear on your calendar and the agents never double-book you. You can use everything else without it.</p>
          )}
        </div>
      </div>

      {connections.length > 0 && (
        <ul className="space-y-1.5 pl-12" aria-label="Connected Google accounts">
          {connections.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-canvas/50 px-3 py-2 text-[12.5px]">
              <span className="min-w-0 truncate text-ink">{c.accountEmail || "Google account"}{c.isPrimary ? <span className="ml-1.5 text-muted-ink">(used for meetings)</span> : null}{c.needsReconnect ? <span className="ml-1.5 text-brand-gold-ink">needs reconnecting</span> : null}</span>
              <button type="button" disabled={busy} onClick={() => disconnect(c.id)} className="shrink-0 font-medium text-muted-ink hover:text-danger disabled:opacity-60">Disconnect</button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pl-12">
        <button type="button" disabled={busy || !status} onClick={connect} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
          {busy && <Spinner className="size-4" />} {reconnect ? "Reconnect Google Calendar" : connections.length > 0 ? "Connect another Google account" : "Connect Google Calendar"}
        </button>
      </div>

      {connected && (
        <div className="space-y-2 pl-12">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-ink">Next 14 days</p>
            <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline"><Plus className="size-3.5" aria-hidden="true" /> Add an event</button>
          </div>
          {eventsError ? (
            <p role="alert" className="text-[12.5px] text-danger">{eventsError}</p>
          ) : events === null ? (
            <p className="text-[12.5px] text-muted-ink">Loading your events...</p>
          ) : events.length === 0 ? (
            <p className="text-[12.5px] text-muted-ink">Nothing on your calendar for the next two weeks.</p>
          ) : (
            <ul className="max-h-44 space-y-1 overflow-y-auto">
              {events.map((ev) => (
                <li key={ev.id} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="min-w-0 truncate text-ink">{ev.title}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-muted-ink">{when(ev)}{ev.link ? <a href={ev.link} target="_blank" rel="noreferrer" aria-label={`Open ${ev.title} in Google Calendar`} className="text-brand"><ExternalLink className="size-3" aria-hidden="true" /></a> : null}</span>
                </li>
              ))}
            </ul>
          )}
          {adding && (
            <form onSubmit={addEvent} className="space-y-2 rounded-lg border border-line bg-canvas/50 p-3">
              <input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" aria-label="Event title" className={field} />
              <div className="grid grid-cols-3 gap-2">
                <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="Date" className={field} />
                <input required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} aria-label="Start time" className={field} />
                <input required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} aria-label="End time" className={field} />
              </div>
              <textarea maxLength={2000} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" aria-label="Description" className="w-full rounded-lg border border-line bg-white p-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" />
              <button type="submit" disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{busy && <Spinner className="size-4" />} Add to my calendar</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
