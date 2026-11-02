"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw, Trash2, UserPlus, Users } from "lucide-react";
import { Card } from "@/components/shared/Surface";

interface Membership {
  _id: string;
  invitedEmail: string;
  memberName: string;
  rollNumber?: string;
  role: "LEAD" | "MEMBER";
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | "DECLINED";
  emailStatus?: "pending" | "sent" | "failed" | "sandbox";
}

interface RosterMember {
  name?: string;
  email?: string;
  rollNumber?: string;
}

const STATUS_STYLE: Record<Membership["status"], string> = {
  ACCEPTED: "bg-emerald-500/10 text-emerald-700",
  PENDING: "bg-amber-500/10 text-amber-700",
  EXPIRED: "bg-slate-500/10 text-slate-600",
  REVOKED: "bg-red-500/10 text-red-700",
  DECLINED: "bg-red-500/10 text-red-700",
};

const BTN = "inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11px] font-semibold text-ink hover:border-brand/40 disabled:opacity-50";
const INPUT = "w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-xs";

/**
 * Founder-only team management. Listing a teammate on the submission does not grant access; they must accept
 * the emailed invitation. For anyone who is not the founder the backend answers 403 and the panel renders nothing.
 */
export default function TeamManagementPanel({ projectId, roster = [] }: { projectId: string; roster?: RosterMember[] }) {
  const base = `/api/team/${encodeURIComponent(projectId)}`;
  const [members, setMembers] = useState<Membership[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState({ memberName: "", invitedEmail: "", rollNumber: "" });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${base}/members`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403 || res.status === 404) return setHidden(true);
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || "Could not load the team.");
      setMembers(body.data as Membership[]);
    } catch (e) {
      setMembers([]);
      setNotice({ tone: "err", text: e instanceof Error ? e.message : "Could not load the team." });
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  async function call(key: string, url: string, init: RequestInit) {
    setBusy(key);
    setNotice(null);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Request failed.");
      setNotice({ tone: "ok", text: body.message || "Done." });
      await load();
      return true;
    } catch (e) {
      setNotice({ tone: "err", text: e instanceof Error ? e.message : "Request failed." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const invite = (payload: { memberName: string; invitedEmail: string; rollNumber?: string }, key = "invite") =>
    call(key, `${base}/invite`, { method: "POST", body: JSON.stringify(payload) });

  if (hidden) return null;

  const active = new Set((members ?? []).filter((m) => m.status === "PENDING" || m.status === "ACCEPTED").map((m) => m.invitedEmail.toLowerCase()));
  const notInvited = members ? roster.filter((r) => r.email && !active.has(r.email.trim().toLowerCase())) : [];

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Users className="size-4" />
        </span>
        <h3 className="text-[15px] font-bold text-ink">Team access</h3>
      </div>
      <p className="text-[12px] text-muted-ink">Teammates see this project only after they accept the invitation sent to their email.</p>

      {notice && (
        <p role="status" className={`rounded-lg px-3 py-2 text-xs ${notice.tone === "ok" ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"}`}>
          {notice.text}
        </p>
      )}

      {members === null ? (
        <div className="flex items-center gap-2 text-xs text-muted-ink">
          <Loader2 className="size-3.5 animate-spin" /> Loading team…
        </div>
      ) : (
        <ul className="space-y-2">
          {members.filter((m) => m.status !== "REVOKED").map((m) => (
            <li key={m._id} className="rounded-lg border border-line bg-canvas/40 p-3 text-[13px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <strong className="block truncate text-ink">
                    {m.memberName}
                    {m.role === "LEAD" ? " (Lead)" : ""}
                  </strong>
                  <span className="block truncate text-[11px] text-brand">{m.invitedEmail}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[m.status]}`}>{m.status}</span>
              </div>
              {m.status === "PENDING" && m.emailStatus === "failed" && <p className="mt-1 text-[11px] text-red-700">Email could not be delivered. Try resending.</p>}
              {m.role !== "LEAD" && (
                <div className="mt-2 flex gap-2">
                  {m.status === "PENDING" && (
                    <button type="button" disabled={busy !== null} className={BTN} onClick={() => call(`resend-${m._id}`, `${base}/invite/${m._id}/resend`, { method: "POST", body: "{}" })}>
                      {busy === `resend-${m._id}` ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Resend
                    </button>
                  )}
                  {(m.status === "PENDING" || m.status === "ACCEPTED") && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      className={`${BTN} !text-red-700`}
                      onClick={() => {
                        if (window.confirm(`Remove ${m.memberName} from this project?`)) void call(`revoke-${m._id}`, `${base}/invite/${m._id}`, { method: "DELETE" });
                      }}
                    >
                      <Trash2 className="size-3" /> {m.status === "PENDING" ? "Revoke" : "Remove"}
                    </button>
                  )}
                  {(m.status === "EXPIRED" || m.status === "DECLINED") && (
                    <button type="button" disabled={busy !== null} className={BTN} onClick={() => invite({ memberName: m.memberName, invitedEmail: m.invitedEmail, rollNumber: m.rollNumber }, `reinvite-${m._id}`)}>
                      <Mail className="size-3" /> Invite again
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {notInvited.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed border-line p-3">
          <p className="text-[12px] font-semibold text-ink">Listed on your submission, not invited yet</p>
          {notInvited.map((r) => (
            <div key={r.email} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="min-w-0 truncate">
                {r.name || r.email} · <span className="text-brand">{r.email}</span>
              </span>
              <button
                type="button"
                disabled={busy !== null}
                className="shrink-0 rounded-md bg-brand px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                onClick={() => invite({ memberName: r.name || r.email!.split("@")[0], invitedEmail: r.email!, rollNumber: r.rollNumber }, `roster-${r.email}`)}
              >
                {busy === `roster-${r.email}` ? "Sending…" : "Send invite"}
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        className="space-y-2 border-t border-line pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await invite(form)) setForm({ memberName: "", invitedEmail: "", rollNumber: "" });
        }}
      >
        <p className="text-[12px] font-semibold text-ink">Invite someone else</p>
        <input required minLength={2} placeholder="Name" value={form.memberName} onChange={(e) => setForm({ ...form, memberName: e.target.value })} className={INPUT} />
        <input required type="email" placeholder="Email" value={form.invitedEmail} onChange={(e) => setForm({ ...form, invitedEmail: e.target.value })} className={INPUT} />
        <input placeholder="Roll number (optional)" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} className={INPUT} />
        <button type="submit" disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {busy === "invite" ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />} Send invitation
        </button>
      </form>
    </Card>
  );
}
