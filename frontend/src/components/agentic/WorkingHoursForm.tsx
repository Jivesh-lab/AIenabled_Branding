"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Spinner } from "@/components/shared/loading/primitives";
import { cn } from "@/lib/utils";
import { friendlyThrown } from "@/lib/friendlyError";
import { AGENTIC, agenticRequest } from "@/lib/agentic";

interface Window { days: number[]; start: string; end: string }
interface Hours { custom: boolean; windows: Window[]; defaultWindows: Window[] }

const DAYS = [
  { n: 1, label: "Mon" }, { n: 2, label: "Tue" }, { n: 3, label: "Wed" }, { n: 4, label: "Thu" },
  { n: 5, label: "Fri" }, { n: 6, label: "Sat" }, { n: 0, label: "Sun" },
];

/**
 * When the agents may book meetings with you. Leave it alone to use the centre's office hours; add windows
 * (for example weekday evenings) and they will only ever propose times inside them.
 */
export default function WorkingHoursForm() {
  const [hours, setHours] = useState<Hours | null>(null);
  const [windows, setWindows] = useState<Window[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    agenticRequest<{ data: Hours }>(`${AGENTIC}/me/working-hours`)
      .then((res) => {
        setHours(res.data);
        setWindows(res.data.windows);
      })
      .catch((e) => setError(friendlyThrown(e)));
  }, []);

  async function save(next: Window[]) {
    setSaving(true);
    try {
      const res = await agenticRequest<{ message: string; data: { windows: Window[]; custom: boolean } }>(`${AGENTIC}/me/working-hours`, { method: "PUT", json: { windows: next } });
      toast.success(res.message);
      setWindows(res.data.windows);
      setHours((h) => (h ? { ...h, custom: res.data.custom, windows: res.data.windows } : h));
    } catch (e) {
      toast.error(friendlyThrown(e, "We could not save your hours. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const update = (i: number, patch: Partial<Window>) => setWindows((list) => list.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  const toggleDay = (i: number, day: number) => update(i, { days: windows[i].days.includes(day) ? windows[i].days.filter((d) => d !== day) : [...windows[i].days, day] });
  const fallback = hours?.defaultWindows[0];

  if (error) return <p className="text-[12.5px] text-danger">{error}</p>;
  if (!hours) return <p className="text-[12.5px] text-muted-ink">Loading your hours...</p>;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[14px] font-semibold text-ink">Your meeting hours</p>
        <p className="text-[12.5px] text-muted-ink">
          {windows.length === 0
            ? `Right now the centre default applies${fallback ? ` (weekdays ${fallback.start}-${fallback.end} IST)` : ""}. Add hours if you are only free at other times, for example evenings or weekends.`
            : "The agents only propose meeting times inside these windows (IST)."}
        </p>
      </div>
      {windows.map((w, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-line bg-canvas/50 p-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Days for window ${i + 1}`}>
            {DAYS.map((d) => (
              <button key={d.n} type="button" aria-pressed={w.days.includes(d.n)} onClick={() => toggleDay(i, d.n)} className={cn("h-8 rounded-md border px-2.5 text-[12px] font-medium", w.days.includes(d.n) ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-muted-ink hover:text-ink")}>{d.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`start-${i}`}>From</label>
            <input id={`start-${i}`} type="time" value={w.start} onChange={(e) => update(i, { start: e.target.value })} className="h-9 rounded-lg border border-line bg-white px-2 text-[13px]" />
            <span className="text-[12px] text-muted-ink">to</span>
            <label className="sr-only" htmlFor={`end-${i}`}>To</label>
            <input id={`end-${i}`} type="time" value={w.end} onChange={(e) => update(i, { end: e.target.value })} className="h-9 rounded-lg border border-line bg-white px-2 text-[13px]" />
            <button type="button" onClick={() => setWindows((list) => list.filter((_, idx) => idx !== i))} aria-label={`Remove window ${i + 1}`} className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-ink hover:bg-white hover:text-danger"><Trash2 className="size-4" aria-hidden="true" /></button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setWindows((list) => [...list, { days: [1, 2, 3, 4, 5], start: "17:00", end: "20:00" }])} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-ink hover:border-brand/40"><Plus className="size-4" aria-hidden="true" /> Add hours</button>
        <button type="button" disabled={saving} onClick={() => save(windows)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{saving && <Spinner className="size-4" />} Save hours</button>
        {hours.custom && <button type="button" disabled={saving} onClick={() => save([])} className="h-9 rounded-lg px-3 text-[13px] font-medium text-muted-ink hover:text-ink">Use centre default</button>}
      </div>
    </div>
  );
}
