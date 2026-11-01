"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, ClockIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { GRANT_OPPORTUNITIES } from "@/lib/fundingGrants";
import { GROUP_ORDER, PORTAL_PAGES, buildIndex, searchIndex, splitMatches, type SearchResult } from "@/lib/globalSearch";
import type { StudentOverview } from "@/types/student-overview";

const PLACEHOLDER = "Search projects, mentors, meetings, funding…";
const RECENT_KEY = "dbit.student.recentSearches";
const MAX_RECENT = 5;
const CACHE_MS = 60_000;

/** One shared copy of the student's records, so opening search twice does not refetch. */
let cache: { at: number; data: StudentOverview } | null = null;

type LoadStatus = "idle" | "loading" | "ready" | "error";

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: recent searches simply are not remembered */
  }
}

/** Matched text is marked in the portal's amber so it is easy to see why a result matched. */
function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitMatches(text, query).map((segment, i) =>
        segment.match ? (
          <mark key={i} className="rounded-[3px] bg-brand-gold/30 px-0.5 font-semibold text-ink">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </>
  );
}

interface Row {
  key: string;
  label: string;
  onSelect: () => void;
}

export default function StudentSearch() {
  const router = useRouter();
  const uid = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [overview, setOverview] = useState<StudentOverview | null>(() => cache?.data ?? null);
  const [status, setStatus] = useState<LoadStatus>(() => (cache ? "ready" : "idle"));
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Platform-aware shortcut label; the server renders the Ctrl form so there is no hydration mismatch.
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/i.test(navigator.platform),
    () => false,
  );

  const load = useCallback(async () => {
    if (cache && Date.now() - cache.at < CACHE_MS) {
      setOverview(cache.data);
      setStatus("ready");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/student/overview", { cache: "no-store" });
      if (!res.ok) throw new Error("unavailable");
      const data = (await res.json()) as StudentOverview;
      cache = { at: Date.now(), data };
      setOverview(data);
      setStatus("ready");
    } catch {
      // Funding and portal pages are still searchable; the panel says some records are missing.
      setStatus("error");
    }
  }, []);

  const index = useMemo(() => buildIndex(overview, GRANT_OPPORTUNITIES), [overview]);
  const trimmed = query.trim();
  const results = useMemo(() => searchIndex(index, trimmed), [index, trimmed]);

  const remember = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecent((prev) => {
      const next = [clean, ...prev.filter((q) => q.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT);
      writeRecent(next);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setMobileOpen(false);
  }, []);

  const go = useCallback(
    (href: string, term?: string) => {
      if (term) remember(term);
      close();
      (document.activeElement as HTMLElement | null)?.blur?.();
      router.push(href);
    },
    [close, remember, router],
  );

  const searchProjects = useCallback(
    (term: string) => go(`/workspace/student/projects?q=${encodeURIComponent(term)}`, term),
    [go],
  );

  // The keyboard list: with nothing typed it is recent searches then quick pages; otherwise results then the fallback.
  const rows: Row[] = useMemo(() => {
    if (!trimmed) {
      return [
        ...recent.map((term) => ({ key: `recent:${term}`, label: term, onSelect: () => setQuery(term) })),
        ...PORTAL_PAGES.slice(0, 4).map((page) => ({ key: `page:${page.href}`, label: page.title, onSelect: () => go(page.href) })),
      ];
    }
    return [
      ...results.map((r) => ({ key: r.id, label: r.title, onSelect: () => go(r.href, trimmed) })),
      { key: "all-projects", label: `Search “${trimmed}” in My Projects`, onSelect: () => searchProjects(trimmed) },
    ];
  }, [trimmed, recent, results, go, searchProjects]);

  const safeActive = Math.min(active, Math.max(rows.length - 1, 0));

  // Ctrl/Cmd + K focuses the desktop field, or opens the full-width panel on small screens.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) return;
      e.preventDefault();
      if (window.matchMedia("(min-width: 768px)").matches) {
        inputRef.current?.focus();
      } else {
        setMobileOpen(true);
        void load();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [load]);

  // Click outside closes the desktop dropdown.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (mobileOpen) mobileInputRef.current?.focus();
  }, [mobileOpen]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (rows.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((safeActive + step + rows.length) % rows.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[safeActive]) rows[safeActive].onSelect();
      else if (trimmed) searchProjects(trimmed);
    } else if (e.key === "Escape") {
      if (open || mobileOpen) {
        e.preventDefault();
        close();
      }
    }
  }

  function onChange(value: string) {
    setQuery(value);
    setActive(0);
    setOpen(true);
  }

  function clear() {
    setQuery("");
    setActive(0);
    (mobileOpen ? mobileInputRef : inputRef).current?.focus();
  }

  const listboxId = `${uid}-listbox`;
  const activeId = rows[safeActive] ? `${uid}-opt-${safeActive}` : undefined;

  /** The result panel, shared by the desktop dropdown and the mobile overlay. */
  const panel = (
    <div id={listboxId} role="listbox" aria-label="Search results" className="py-1.5">
      {!trimmed ? (
        <>
          {recent.length > 0 && (
            <section>
              <div className="flex items-center justify-between px-3 pb-1 pt-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-ink">Recent searches</h3>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setRecent([]);
                    writeRecent([]);
                  }}
                  className="rounded text-[12px] font-medium text-brand hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  Clear
                </button>
              </div>
              {recent.map((term, i) => (
                <OptionRow key={term} id={`${uid}-opt-${i}`} active={safeActive === i} onHover={() => setActive(i)} onSelect={rows[i].onSelect}>
                  <ClockIcon className="size-4 shrink-0 text-muted-ink" aria-hidden="true" />
                  <span className="truncate text-[13px] text-ink">{term}</span>
                </OptionRow>
              ))}
            </section>
          )}
          <section>
            <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-ink">Go to</h3>
            {PORTAL_PAGES.slice(0, 4).map((page, i) => {
              const at = recent.length + i;
              return (
                <OptionRow key={page.href} id={`${uid}-opt-${at}`} active={safeActive === at} onHover={() => setActive(at)} onSelect={rows[at].onSelect}>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink">{page.title}</span>
                    <span className="block truncate text-[12px] text-muted-ink">{page.subtitle}</span>
                  </span>
                </OptionRow>
              );
            })}
          </section>
          <p className="px-3 pb-1 pt-2 text-[12px] text-muted-ink">Search your projects, meetings, tasks, mentors and funding schemes.</p>
        </>
      ) : (
        <>
          {results.length === 0 && (
            <p className="px-3 py-3 text-[13px] text-muted-ink">
              {status === "loading" ? "Searching your records…" : <>No matches for “<span className="font-medium text-ink">{trimmed}</span>”. Try a project, meeting, mentor or scheme name.</>}
            </p>
          )}
          {GROUP_ORDER.map((group) => {
            const groupResults = results.filter((r) => r.group === group);
            if (groupResults.length === 0) return null;
            return (
              <section key={group}>
                <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-ink">{group}</h3>
                {groupResults.map((r) => {
                  const at = results.indexOf(r);
                  return <ResultRow key={r.id} result={r} query={trimmed} id={`${uid}-opt-${at}`} active={safeActive === at} onHover={() => setActive(at)} onSelect={rows[at].onSelect} />;
                })}
              </section>
            );
          })}
          <div className="mt-1 border-t border-line pt-1">
            <OptionRow
              id={`${uid}-opt-${results.length}`}
              active={safeActive === results.length}
              onHover={() => setActive(results.length)}
              onSelect={rows[results.length].onSelect}
            >
              <MagnifyingGlassIcon className="size-4 shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-brand">Search “{trimmed}” in My Projects</span>
              <ArrowRightIcon className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
            </OptionRow>
          </div>
        </>
      )}
      {status === "error" && (
        <p role="status" className="border-t border-line px-3 pb-1 pt-2 text-[12px] text-muted-ink">
          Some of your records couldn&apos;t be loaded, so results may be incomplete.
        </p>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop and tablet: inline field with a dropdown. */}
      <div ref={wrapRef} className="relative hidden w-full max-w-[480px] md:block">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-ink"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open ? activeId : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder={PLACEHOLDER}
          aria-label="Search the researcher portal"
          onFocus={() => {
            setOpen(true);
            if (status === "idle" || status === "error") void load();
          }}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            "h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-16 text-[13px] text-ink placeholder:text-muted-ink",
            "transition-colors duration-150 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20",
          )}
        />
        {query ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-ink hover:bg-nav-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <XMarkIcon className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-ink lg:inline-flex"
          >
            {isMac ? "⌘ K" : "Ctrl K"}
          </kbd>
        )}

        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[min(70vh,460px)] overflow-y-auto rounded-xl border border-line bg-white shadow-lg">
            {panel}
          </div>
        )}
      </div>

      {/* Phones: a search button that opens a full-width panel, so nothing overlaps the profile or notifications. */}
      <button
        type="button"
        aria-label="Search"
        onClick={() => {
          setMobileOpen(true);
          void load();
        }}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-ink transition-colors hover:bg-nav-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 md:hidden"
      >
        <MagnifyingGlassIcon className="size-5" aria-hidden="true" />
      </button>

      {mobileOpen && (
        <div role="dialog" aria-modal="true" aria-label="Search" className="fixed inset-0 z-[70] flex flex-col bg-white md:hidden">
          <div className="flex items-center gap-2 border-b border-line px-3 py-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-ink" aria-hidden="true" />
              <input
                ref={mobileInputRef}
                type="text"
                role="combobox"
                aria-expanded
                aria-controls={listboxId}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                autoComplete="off"
                spellCheck={false}
                value={query}
                placeholder={PLACEHOLDER}
                aria-label="Search the researcher portal"
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-9 text-[14px] text-ink placeholder:text-muted-ink focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-ink hover:bg-nav-hover"
                >
                  <XMarkIcon className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-md px-2 py-1.5 text-[14px] font-medium text-brand hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Cancel
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
        </div>
      )}
    </>
  );
}

function OptionRow({
  id,
  active,
  onHover,
  onSelect,
  children,
}: {
  id: string;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      // mousedown would blur the input before the click lands; keep focus where it is.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={cn("mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2", active ? "bg-nav-hover" : "")}
    >
      {children}
    </div>
  );
}

function ResultRow({
  result,
  query,
  id,
  active,
  onHover,
  onSelect,
}: {
  result: SearchResult;
  query: string;
  id: string;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <OptionRow id={id} active={active} onHover={onHover} onSelect={onSelect}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">
          <Highlight text={result.title} query={query} />
        </span>
        {result.subtitle && (
          <span className="block truncate text-[12px] text-muted-ink">
            <Highlight text={result.subtitle} query={query} />
          </span>
        )}
      </span>
    </OptionRow>
  );
}
