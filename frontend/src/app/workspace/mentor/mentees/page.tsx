"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { ErrorState } from "@/components/shared/loading/primitives";
import { FriendlyError, friendlyActionMessage, friendlyThrown } from "@/lib/friendlyError";
import MenteeRow from "./_components/MenteeRow";
import { MenteeListSkeleton } from "./_components/MenteesSkeleton";
import MenteeStats from "./_components/MenteeStats";
import MenteeToolbar from "./_components/MenteeToolbar";
import { countByHealth, filterMentees, toMentees, type HealthFilter, type Mentee } from "./_lib/mentees";

const LOAD_FAILED = "We couldn't load your mentees right now. Please try again in a moment.";

export default function MentorMenteesPage() {
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<HealthFilter>("All");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Mentees are the lead researchers on the projects the mentor supports.
      const res = await fetch("/api/faculty/projects");
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new FriendlyError(friendlyActionMessage(res.status, json, LOAD_FAILED));
      setMentees(toMentees(json.data || []));
    } catch (err) {
      setError(friendlyThrown(err, LOAD_FAILED));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => countByHealth(mentees), [mentees]);
  const visible = useMemo(() => filterMentees(mentees, filter, search), [mentees, filter, search]);
  const narrowed = filter !== "All" || search.trim() !== "";

  function reset() {
    setFilter("All");
    setSearch("");
  }

  return (
    <PageContainer
      title="My Mentees"
      description="Manage and monitor all researchers assigned to you — track progress, session history, health flags, and growth areas."
    >
      <MenteeStats counts={counts} active={filter} onSelect={setFilter} loading={loading} />

      {!error && (
        <MenteeToolbar
          search={search}
          onSearch={setSearch}
          shown={visible.length}
          total={mentees.length}
          filtered={narrowed}
          onReset={reset}
        />
      )}

      {loading ? (
        <MenteeListSkeleton />
      ) : error ? (
        <Card>
          <ErrorState title="We couldn't load your mentees" message={error} onRetry={() => void load()} />
        </Card>
      ) : visible.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <p className="text-[14px] font-semibold text-ink">
            {mentees.length === 0 ? "No mentees assigned yet" : "No mentees match"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-ink">
            {mentees.length === 0
              ? "Researchers appear here once the coordinator assigns you to their projects."
              : "Try a different search, or show everyone."}
          </p>
          {narrowed && mentees.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="mt-4 inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-[13px] font-semibold text-brand transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Show all mentees
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((mentee) => (
            <MenteeRow
              key={mentee.id}
              mentee={mentee}
              open={openId === mentee.id}
              onToggle={() => setOpenId((current) => (current === mentee.id ? null : mentee.id))}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
