"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { INTEGRATIONS, agenticRequest } from "@/lib/agentic";

export interface IntegrationStatus {
  demoMode: boolean;
  email: { configured: boolean; mode: "live" | "sandbox"; missing?: string[] };
  calendar: { configured: boolean; mode: "live" | "sandbox"; missing?: string[] };
  llm: { configured: boolean; mode: "live" | "rules_only"; missing?: string[] };
  agentService?: { reachable: boolean; linked?: boolean };
  you?: { googleCalendar: { connected: boolean; needsReconnect?: boolean; accountEmail?: string } };
}

const SEEN = "dbit.integration.notices";

function once(key: string): boolean {
  try {
    const seen = new Set<string>(JSON.parse(sessionStorage.getItem(SEEN) || "[]"));
    if (seen.has(key)) return false;
    seen.add(key);
    sessionStorage.setItem(SEEN, JSON.stringify([...seen]));
  } catch {
    // storage unavailable: show the notice every time rather than never
  }
  return true;
}

/**
 * Tells people - once per session - when something they would expect to work is running in a reduced mode
 * (service unreachable, email/calendar in sandbox, no AI key), and what to do about it. Administrators see which
 * keys to add; everyone else gets a short, non-technical note. Also confirms a finished Google Calendar connection.
 */
export default function IntegrationNotice() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  useEffect(() => {
    if (!session?.user) return;
    const params = new URLSearchParams(window.location.search);
    const calendar = params.get("calendar");
    if (calendar) {
      if (calendar === "connected") toast.success("Google Calendar connected. Meetings the agents arrange will now appear on your calendar.");
      else if (calendar === "cancelled") toast.info("Google Calendar was not connected. You can try again from your profile menu.");
      else toast.error("We could not connect Google Calendar. Please try again from your profile menu.");
      params.delete("calendar");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await agenticRequest<{ data: IntegrationStatus }>(`${INTEGRATIONS}/status`);
        if (cancelled) return;
        const status = res.data;
        const admin = role === "admin" || role === "super_admin";
        if (status.agentService && !status.agentService.reachable && once("agent-service")) {
          toast.error("The application service is not reachable right now. Applications, assessments and the assistant may be limited until it is back.", { duration: 9000 });
        }
        if (!admin) return;
        const notes: string[] = [];
        if (status.agentService && status.agentService.linked === false) notes.push("The link between the application service and the agents is not configured (add INTERNAL_JWT_SECRET), so agents will not see new applications.");
        if (status.email.mode === "sandbox") notes.push(`Email is in sandbox mode, so nothing is actually emailed${status.email.missing?.length ? ` (add ${status.email.missing.join(", ")})` : ""}.`);
        if (status.calendar.mode === "sandbox") notes.push(`Google Calendar is not connected to this server${status.calendar.missing?.length ? ` (add ${status.calendar.missing.join(", ")})` : ""}; meetings are recorded without calendar invitations.`);
        if (!status.llm.configured) notes.push("The AI model key is missing (add LLM_API_KEY); assessments use rule-based checks only.");
        if (notes.length && once("setup")) {
          toast.warning("Some integrations are not set up yet", { description: notes.join(" "), duration: 14000 });
        }
      } catch {
        // The status check is advisory; never block the page on it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user, role]);

  return null;
}
