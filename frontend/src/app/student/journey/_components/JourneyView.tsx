"use client";

/**
 * JourneyView — project selector plus the selected project's journey.
 *
 * The only state is the selected project id. Tracks and timeline are derived
 * from props on every render; there is nothing to synchronise.
 */
import { useId, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/shared/Surface";
import { controlClass } from "@/components/shared/form/FormField";
import { REVIEW_STATUS_LABEL } from "@/types/status";
import type { StudentProject } from "@/mock/student-projects";
import type { JourneyEvent } from "@/mock/student-journey";
import {
  buildTimeline,
  currentStageSummary,
  defaultProjectId,
  developmentTrack,
  reviewTrack,
} from "../_lib/journey";
import StageTrack from "./StageTrack";
import JourneyTimeline from "./JourneyTimeline";
import PositionPanel from "./PositionPanel";

export default function JourneyView({
  projects,
  events,
}: {
  projects: StudentProject[];
  events: JourneyEvent[];
}) {
  const selectId = useId();
  const [selectedId, setSelectedId] = useState(() => defaultProjectId(projects));

  const project = projects.find((p) => p.id === selectedId);

  if (!project) {
    return (
      <Card className="px-6 py-12 text-center">
        <h2 className="text-[16px] font-semibold text-ink">No projects yet</h2>
        <p className="mt-1 text-[14px] text-muted-ink">Submit an idea to start its incubation journey.</p>
        <Link
          href="/student/submit"
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover"
        >
          Submit New Idea
        </Link>
      </Card>
    );
  }

  const summary = currentStageSummary(project);
  const projectEvents = events.filter((e) => e.projectId === project.id);
  const timeline = buildTimeline(project, projectEvents);
  const isDraft = project.reviewStatus === "DRAFT";

  return (
    <div className="flex flex-col gap-6">
      {/* Project selector */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <label htmlFor={selectId} className="shrink-0 text-[13px] font-medium text-ink">
          Project
        </label>
        <select
          id={selectId}
          value={project.id}
          onChange={(e) => setSelectedId(e.target.value)}
          className={cn(controlClass, "h-10 cursor-pointer pr-8 sm:max-w-md")}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {REVIEW_STATUS_LABEL[p.reviewStatus]}
            </option>
          ))}
        </select>
      </div>

      {/*
        Grid order is chosen for small screens: current stage → next action → timeline.
        From lg the position panel moves to a right-hand column spanning both rows.
      */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:grid-rows-[auto_1fr] lg:items-start">
        <Card className="p-5 sm:p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-ink">Current stage</p>
          <h2
            className={cn(
              "mt-1 text-[20px] font-semibold tracking-tight",
              project.reviewStatus === "REVISION_REQUESTED"
                ? "text-brand-gold-ink"
                : project.reviewStatus === "REJECTED"
                  ? "text-danger"
                  : project.reviewStatus === "APPROVED"
                    ? "text-success"
                    : "text-ink"
            )}
          >
            {summary.label}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-ink">{summary.detail}</p>

          <div className="mt-6 flex flex-col gap-6 border-t border-line pt-5">
            <StageTrack title="Review" stages={reviewTrack(project)} />
            <StageTrack title="Development" stages={developmentTrack(project)} />
          </div>
        </Card>

        <aside className="lg:sticky lg:top-[84px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <PositionPanel project={project} />
        </aside>

        <Card className="p-5 sm:p-6 lg:col-start-1 lg:row-start-2">
          <h2 className="text-[16px] font-semibold text-ink">Project journey</h2>
          <p className="mt-0.5 text-[13px] text-muted-ink">What has happened so far, and what comes next.</p>

          <div className="mt-6">
            {isDraft ? (
              <div className="rounded-lg border border-dashed border-line bg-canvas px-4 py-8 text-center">
                <p className="text-[14px] font-medium text-ink">This idea hasn&apos;t been submitted yet</p>
                <p className="mt-1 text-[13px] text-muted-ink">Its journey begins when you submit it for review.</p>
              </div>
            ) : (
              <JourneyTimeline entries={timeline} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
