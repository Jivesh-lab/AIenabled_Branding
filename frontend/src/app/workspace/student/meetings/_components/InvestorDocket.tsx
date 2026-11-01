"use client";

import { useRef, useState } from "react";
import { ArrowTopRightOnSquareIcon, CalendarDaysIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

/** Introductions an accredited investor scheduled through the investor workflow (read-only here). */
export interface InvestorIntroduction {
  _id: string;
  startupId?: { name?: string };
  investorId?: { name?: string; email?: string };
  message?: string;
  scheduledMeeting?: { date?: string; time?: string; timeZone?: string; meetingLink?: string };
}

/** Drops a trailing "(Investor Personal Account)" style suffix from a display name. */
function cleanName(name?: string) {
  return (name ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function scheduleOf(item: InvestorIntroduction) {
  const sm = item.scheduledMeeting;
  const has = Boolean(sm?.date || sm?.time);
  if (!has) return { has, date: null, time: null };
  // Append the zone only when the time string doesn't already carry it.
  const time = sm?.time ? sm.time + (sm.timeZone && !sm.time.includes(sm.timeZone) ? ` ${sm.timeZone}` : "") : null;
  return { has, date: sm?.date ?? null, time };
}

/**
 * Compact pitch docket: one tab per introduction, one detail panel for the selected one. Replaces a grid of tall
 * cards so the schedule below stays near the top of the page.
 */
export default function InvestorDocket({ introductions }: { introductions: InvestorIntroduction[] }) {
  const [activeId, setActiveId] = useState(introductions[0]?._id);
  const [expanded, setExpanded] = useState(false);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (introductions.length === 0) return null;

  const active = introductions.find((i) => i._id === activeId) ?? introductions[0];

  // Several introductions can share a startup, so repeated names get a number to stay distinguishable.
  const seen: Record<string, number> = {};
  const totals: Record<string, number> = {};
  introductions.forEach((i) => {
    const key = i.startupId?.name || "Startup";
    totals[key] = (totals[key] ?? 0) + 1;
  });
  const labelOf = (i: InvestorIntroduction) => {
    const key = i.startupId?.name || "Startup";
    seen[key] = (seen[key] ?? 0) + 1;
    return totals[key] > 1 ? `${key} (${seen[key]})` : key;
  };
  const labels = new Map(introductions.map((i) => [i._id, labelOf(i)]));

  function select(id: string) {
    setActiveId(id);
    setExpanded(false);
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const last = introductions.length - 1;
    const next = e.key === "Home" ? 0 : e.key === "End" ? last : e.key === "ArrowRight" ? (index + 1) % (last + 1) : (index - 1 + last + 1) % (last + 1);
    const target = introductions[next];
    select(target._id);
    tabRefs.current[target._id]?.focus();
  }

  const investor = cleanName(active.investorId?.name) || "Accredited Investor";
  const sched = scheduleOf(active);
  const link = active.scheduledMeeting?.meetingLink;
  const message = active.message?.trim();
  const longMessage = (message?.length ?? 0) > 120;

  return (
    <section aria-label="AI-coordinated investor discovery">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-ink">AI-Coordinated Investor Discovery</h2>
        <p className="text-[12px] text-muted-ink">
          <span className="tabular-nums">{introductions.length}</span> {introductions.length === 1 ? "introduction" : "introductions"} arranged through the incubation discovery process
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {/* Tabs */}
        <div role="tablist" aria-label="Investor introductions" className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-line px-2 pt-2">
          {introductions.map((item, index) => {
            const selected = item._id === active._id;
            return (
              <button
                key={item._id}
                ref={(el) => {
                  tabRefs.current[item._id] = el;
                }}
                type="button"
                role="tab"
                id={`docket-tab-${item._id}`}
                aria-selected={selected}
                aria-controls="docket-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => select(item._id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={cn(
                  "-mb-px shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-[13px] outline-none transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
                  selected ? "border-brand font-semibold text-brand" : "border-transparent font-medium text-muted-ink hover:text-ink"
                )}
              >
                {labels.get(item._id)}
              </button>
            );
          })}
        </div>

        {/* Active panel */}
        <div role="tabpanel" id="docket-panel" aria-labelledby={`docket-tab-${active._id}`} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand"
            >
              {initials(investor)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">
                {investor}
                <span className="font-normal text-muted-ink"> · Investor</span>
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-brand-cyan-ink">{active.startupId?.name || "Startup"}</p>

              {message && (
                <p className={cn("mt-2 text-[13px] leading-relaxed text-muted-ink", !expanded && "line-clamp-2")}>{message}</p>
              )}
              {(longMessage || active.investorId?.email) && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="mt-1 rounded text-[12px] font-semibold text-brand outline-none hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  {expanded ? "Show less" : "Show details"}
                </button>
              )}
              {expanded && active.investorId?.email && (
                <p className="mt-1 text-[12px] text-muted-ink">Contact: {active.investorId.email}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
              <CalendarDaysIcon className="size-4 shrink-0 text-muted-ink" aria-hidden="true" />
              <span className="text-ink">{sched.has ? [sched.date, sched.time].filter(Boolean).join(" · ") : "Date to be confirmed"}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em]",
                  sched.has ? "bg-brand-cyan-soft text-brand-cyan-ink" : "bg-brand-gold/15 text-brand-gold-ink"
                )}
              >
                {sched.has ? "Scheduled" : "Awaiting schedule"}
              </span>
            </div>

            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
              >
                <VideoCameraIcon className="size-3.5" aria-hidden="true" />
                Join Meeting
                <ArrowTopRightOnSquareIcon className="size-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
