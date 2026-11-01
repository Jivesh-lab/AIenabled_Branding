"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, CalendarX } from "lucide-react";
import { Spinner } from "@/components/shared/loading/primitives";
import { friendlyThrown } from "@/lib/friendlyError";
import { INTEGRATIONS, agenticRequest } from "@/lib/agentic";
import type { IntegrationStatus } from "./IntegrationNotice";

/**
 * Lets a signed-in person connect THEIR OWN Google Calendar. When connected, meetings the agents arrange with
 * them are created on that calendar (with a Meet link) and the agents see when they are busy.
 */
export default function GoogleCalendarCard() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await agenticRequest<{ data: IntegrationStatus }>(`${INTEGRATIONS}/status`);
      setStatus(res.data);
      setError(null);
    } catch (e) {
      setError(friendlyThrown(e));
    }
  }, []);

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

  async function disconnect() {
    setBusy(true);
    try {
      const res = await agenticRequest<{ message: string }>(`${INTEGRATIONS}/google`, { method: "DELETE" });
      toast.success(res.message);
      await load();
    } catch (e) {
      toast.error(friendlyThrown(e));
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.you?.googleCalendar.connected;
  const reconnect = status?.you?.googleCalendar.needsReconnect;
  const notSetUp = status && !status.calendar.configured;

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
            <p className="text-[12.5px] text-muted-ink">Connected{status.you?.googleCalendar.accountEmail ? ` as ${status.you.googleCalendar.accountEmail}` : ""}. Meetings the agents arrange with you are added to this calendar with a Meet link, and your busy times are respected when they look for a slot.</p>
          ) : reconnect ? (
            <p className="text-[12.5px] text-brand-gold-ink">Google asked you to sign in again. Reconnect so new meetings reach your calendar.</p>
          ) : notSetUp ? (
            <p className="text-[12.5px] text-muted-ink">Calendar connection is not available yet - an administrator has to add the Google credentials to the server. Until then meetings are arranged by email invitation.</p>
          ) : (
            <p className="text-[12.5px] text-muted-ink">Connect your Google account so meetings the agents arrange appear on your calendar, and so they never double-book you.</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 pl-12">
        {connected ? (
          <button type="button" disabled={busy} onClick={disconnect} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-danger/40 hover:text-danger disabled:opacity-60">
            {busy && <Spinner className="size-4" />} Disconnect
          </button>
        ) : (
          <button type="button" disabled={busy || !status} onClick={connect} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
            {busy && <Spinner className="size-4" />} {reconnect ? "Reconnect Google Calendar" : "Connect Google Calendar"}
          </button>
        )}
      </div>
    </div>
  );
}
