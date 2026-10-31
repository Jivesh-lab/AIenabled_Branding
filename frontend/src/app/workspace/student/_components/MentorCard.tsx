"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, Mail, UserRound } from "lucide-react";
import { Card, StatusBadge } from "@/components/shared/Surface";
import {
  MATCHING_DESCRIPTION,
  MATCHING_LABEL,
  MATCHING_TONE,
  summariseMentor,
  type MentorResult,
} from "@/lib/mentorState";

/** Full mentor panel for the project page. Confirmed assignment and recommendation are visibly different. */
export default function MentorCard({ result }: { result: MentorResult }) {
  const router = useRouter();

  if (!result.ok) {
    return (
      <Card>
        <div role="alert" className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-ink">Mentor</h2>
            <p className="mt-1 text-[13px] text-muted-ink">{result.message}</p>
            {result.kind === "unavailable" && (
              <button
                type="button"
                onClick={() => router.refresh()}
                className="mt-3 inline-flex h-8 items-center rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const { state, mentor, recommendation, requestedExpertise, profileUnavailable } = result.data;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <UserRound className="size-4 text-brand-cyan" aria-hidden="true" /> Mentor
        </h2>
        <StatusBadge label={MATCHING_LABEL[state]} tone={MATCHING_TONE[state]} />
      </div>
      <p className="mt-2 text-[13px] text-muted-ink">{MATCHING_DESCRIPTION[state]}</p>

      {requestedExpertise.length > 0 && state !== "matched" && (
        <p className="mt-2 text-[12px] text-muted-ink">
          Expertise requested: <span className="font-medium text-ink">{requestedExpertise.join(", ")}</span>
        </p>
      )}

      {/* Proposed only - visibly not an assignment */}
      {recommendation && (
        <div className="mt-4 rounded-lg border border-dashed border-brand-gold/60 bg-brand-gold/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold-ink">
            Recommendation - not confirmed
          </p>
          <p className="mt-1 text-[14px] font-semibold text-ink">{recommendation.name}</p>
          {recommendation.organization && <p className="text-[12px] text-muted-ink">{recommendation.organization}</p>}
        </div>
      )}

      {/* Confirmed assignment */}
      {mentor && (
        <div className="mt-4 rounded-lg border border-line bg-canvas/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Confirmed assignment</p>
          <p className="mt-1 text-[16px] font-semibold text-ink">{mentor.name}</p>
          {(mentor.directory || mentor.contact?.organization) && (
            <p className="text-[12px] text-muted-ink">
              {[mentor.directory?.role, mentor.directory?.affiliation ?? mentor.contact?.organization].filter(Boolean).join(" · ")}
            </p>
          )}

          {(() => {
            const expertise = mentor.directory?.expertise?.length ? mentor.directory.expertise : mentor.contact?.expertise ?? [];
            return expertise.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Mentor expertise">
                {expertise.map((e) => (
                  <li key={e} className="rounded-md border border-line bg-white px-2 py-0.5 text-[12px] text-ink">
                    {e}
                  </li>
                ))}
              </ul>
            ) : null;
          })()}

          {mentor.contact?.bio && <p className="mt-3 text-[13px] leading-relaxed text-muted-ink">{mentor.contact.bio}</p>}
          {!mentor.directory && !mentor.contact && (
            <p className="mt-3 text-[12px] text-muted-ink">
              {profileUnavailable
                ? "The mentor's profile couldn't be loaded right now."
                : "No further profile details are on record for this mentor."}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/workspace/student/meetings"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover"
            >
              <CalendarDays className="size-3.5" aria-hidden="true" /> Request a meeting
            </Link>
            {mentor.contact?.email && (
              <a
                href={`mailto:${mentor.contact.email}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-nav-hover"
              >
                <Mail className="size-3.5" aria-hidden="true" /> {mentor.contact.email}
              </a>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/** One line for cards and lists. Same wording and source as the full panel. */
export function MentorLine({ result }: { result: MentorResult | undefined }) {
  const summary = summariseMentor(result);
  const tone =
    summary.tone === "success" ? "font-medium text-ink" : summary.tone === "danger" ? "text-danger" : "text-muted-ink";
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <UserRound className="size-3.5 shrink-0 text-brand-cyan" aria-hidden="true" />
      <span className="text-muted-ink">Mentor:</span>
      <span className={`min-w-0 truncate ${tone}`}>{summary.text}</span>
    </span>
  );
}
