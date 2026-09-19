"use client";

import { useId, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FileText, Info, Plus, Search, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClass, describedBy, FieldError, FormField, FormSection } from "@/components/shared/form/FormField";
import {
  ASSIGNED_FACULTY_GUIDE,
  CURRENT_STUDENT,
  FILE_RULES,
  STUDENT_DIRECTORY,
  TEAM_LIMIT,
  TECHNOLOGY_LIMIT,
  TECHNOLOGY_SUGGESTIONS,
} from "@/mock/submit-idea";
import type { Attachment, IdeaFormValues, TeamMemberInvite } from "../_lib/idea-schema";
import { formatBytes, initialsOf } from "@/lib/format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Faculty guide — read-only. Students cannot assign their own guide.
// ---------------------------------------------------------------------------
function FacultyGuide() {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-ink">Faculty guide</p>
      {ASSIGNED_FACULTY_GUIDE ? (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-[12px] font-semibold text-white">
            {initialsOf(ASSIGNED_FACULTY_GUIDE.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{ASSIGNED_FACULTY_GUIDE.name}</p>
            <p className="truncate text-[12px] text-muted-ink">{ASSIGNED_FACULTY_GUIDE.department}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-lg border border-line bg-canvas px-3 py-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-medium text-ink">Assigned by Faculty Coordinator</p>
            <p className="mt-0.5 text-[12px] text-muted-ink">
              A guide is assigned after submission. You don&apos;t need to choose one.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team — lead is the logged-in student; others receive pending invites.
// ---------------------------------------------------------------------------
function TeamInvites() {
  const searchId = useId();
  const { setValue, formState: { errors } } = useFormContext<IdeaFormValues>();
  const members = useWatch<IdeaFormValues, "teamMembers">({ name: "teamMembers" });
  const [query, setQuery] = useState("");

  const teamIsFull = members.length >= TEAM_LIMIT - 1;
  const trimmed = query.trim().toLowerCase();
  const invitedIds = new Set(members.map((m) => m.id));

  const results =
    trimmed.length < 2
      ? []
      : STUDENT_DIRECTORY.filter(
          (s) =>
            !invitedIds.has(s.id) &&
            (s.name.toLowerCase().includes(trimmed) ||
              s.rollNumber.toLowerCase().includes(trimmed) ||
              s.email.toLowerCase().includes(trimmed))
        ).slice(0, 5);

  function invite(student: (typeof STUDENT_DIRECTORY)[number]) {
    const next: TeamMemberInvite = {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      email: student.email,
      inviteStatus: "PENDING",
    };
    setValue("teamMembers", [...members, next], { shouldDirty: true, shouldValidate: true });
    setQuery("");
  }

  function withdraw(id: string) {
    setValue(
      "teamMembers",
      members.filter((m) => m.id !== id),
      { shouldDirty: true, shouldValidate: true }
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-ink">Team members</p>
        <span className="text-[12px] text-muted-ink">
          {members.length + 1} of {TEAM_LIMIT}
        </span>
      </div>

      <ul className="divide-y divide-line rounded-lg border border-line">
        {/* Team lead */}
        <li className="flex items-center gap-3 px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-white">
            {initialsOf(CURRENT_STUDENT.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">
              {CURRENT_STUDENT.name} <span className="font-normal text-muted-ink">(you)</span>
            </p>
            <p className="truncate text-[12px] text-muted-ink">{CURRENT_STUDENT.rollNumber}</p>
          </div>
          <span className="shrink-0 rounded-md border border-brand/20 bg-brand-cyan-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-brand">
            Team lead
          </span>
        </li>

        {/* Pending invites */}
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-[12px] font-semibold text-muted-ink">
              {initialsOf(member.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{member.name}</p>
              <p className="truncate text-[12px] text-muted-ink">{member.rollNumber}</p>
            </div>
            <span className="shrink-0 rounded-md border border-brand-gold/40 bg-brand-gold/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-brand-gold-ink">
              Invite pending
            </span>
            <button
              type="button"
              onClick={() => withdraw(member.id)}
              aria-label={`Withdraw invite for ${member.name}`}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-ink transition-colors hover:bg-nav-hover hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {/* Invite search */}
      <div className="mt-3">
        <label htmlFor={searchId} className="sr-only">
          Search students to invite
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-ink"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            disabled={teamIsFull}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={teamIsFull ? "Team is full" : "Invite by name, roll number or email"}
            className={cn(controlClass, "h-10 pl-9")}
            autoComplete="off"
          />
        </div>

        {trimmed.length >= 2 && (
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-white" aria-label="Matching students">
            {results.length === 0 ? (
              <li className="px-3 py-3 text-[13px] text-muted-ink">No students match &ldquo;{query.trim()}&rdquo;.</li>
            ) : (
              results.map((student) => (
                <li key={student.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{student.name}</p>
                    <p className="truncate text-[12px] text-muted-ink">
                      {student.rollNumber} · {student.department}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => invite(student)}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-semibold text-brand transition-colors hover:border-brand/40 hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <UserPlus className="size-3.5" aria-hidden="true" />
                    Invite
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        <p className="mt-2 text-[12px] text-muted-ink">
          Invited students must accept before they join the team.
        </p>
        <FieldError id="teamMembers" message={errors.teamMembers?.message} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Technology tags
// ---------------------------------------------------------------------------
function TechnologyTags() {
  const { setValue, formState: { errors } } = useFormContext<IdeaFormValues>();
  const technologies = useWatch<IdeaFormValues, "technologies">({ name: "technologies" });
  const [draft, setDraft] = useState("");

  const isFull = technologies.length >= TECHNOLOGY_LIMIT;
  const suggestions = TECHNOLOGY_SUGGESTIONS.filter(
    (t) => !technologies.some((x) => x.toLowerCase() === t.toLowerCase())
  ).slice(0, 8);

  function add(raw: string) {
    const tag = raw.trim().replace(/,$/, "").trim();
    if (!tag || isFull) return;
    if (technologies.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    setValue("technologies", [...technologies, tag.slice(0, 40)], { shouldDirty: true, shouldValidate: true });
  }

  function remove(tag: string) {
    setValue(
      "technologies",
      technologies.filter((t) => t !== tag),
      { shouldDirty: true, shouldValidate: true }
    );
  }

  return (
    <FormField
      id="technologies"
      label="Technology / Tools"
      hint="Press Enter or comma to add. Pick from common tools below."
      error={errors.technologies?.message}
      aside={
        <span className="text-[12px] tabular-nums text-muted-ink">
          {technologies.length}/{TECHNOLOGY_LIMIT}
        </span>
      }
    >
      <div className={cn(controlClass, "flex min-h-10 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15")}>
        {technologies.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-brand-cyan-soft py-0.5 pl-2 pr-1 text-[12px] font-medium text-brand"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Remove ${tag}`}
              className="flex size-4 items-center justify-center rounded-sm text-brand/70 hover:bg-white/60 hover:text-brand"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id="technologies"
          type="text"
          value={draft}
          disabled={isFull}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
              setDraft("");
            } else if (e.key === "Backspace" && draft === "" && technologies.length > 0) {
              remove(technologies[technologies.length - 1]);
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft("");
            }
          }}
          placeholder={technologies.length === 0 ? "e.g. Python, React, IoT" : ""}
          aria-describedby={describedBy("technologies", { hint: true, error: !!errors.technologies })}
          className="h-7 min-w-[8rem] flex-1 bg-transparent px-1 text-[14px] text-ink outline-none placeholder:text-muted-ink/80 disabled:cursor-not-allowed"
        />
      </div>

      {!isFull && suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 text-[12px] text-muted-ink transition-colors hover:border-brand-cyan/40 hover:bg-nav-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <Plus className="size-3" aria-hidden="true" />
              {s}
            </button>
          ))}
        </div>
      )}
    </FormField>
  );
}

// ---------------------------------------------------------------------------
// Supporting files — metadata only until an upload endpoint exists.
// ---------------------------------------------------------------------------
function Attachments() {
  const inputId = useId();
  const { setValue } = useFormContext<IdeaFormValues>();
  const attachments = useWatch<IdeaFormValues, "attachments">({ name: "attachments" });
  const [rejections, setRejections] = useState<string[]>([]);

  const remaining = FILE_RULES.maxFiles - attachments.length;

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const accepted: Attachment[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(fileList)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!(FILE_RULES.extensions as readonly string[]).includes(ext)) {
        rejected.push(`${file.name}: only PDF, PPT, PPTX, DOC or DOCX files are accepted.`);
      } else if (file.size > FILE_RULES.maxSizeBytes) {
        rejected.push(`${file.name}: larger than ${formatBytes(FILE_RULES.maxSizeBytes)}.`);
      } else if (attachments.some((a) => a.name === file.name && a.sizeBytes === file.size)) {
        rejected.push(`${file.name}: already attached.`);
      } else if (accepted.length >= remaining) {
        rejected.push(`${file.name}: you can attach up to ${FILE_RULES.maxFiles} files.`);
      } else {
        accepted.push({ id: makeId("file"), name: file.name, sizeBytes: file.size });
      }
    }

    if (accepted.length) {
      setValue("attachments", [...attachments, ...accepted], { shouldDirty: true, shouldValidate: true });
    }
    setRejections(rejected);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-ink">
          Supporting documents <span className="ml-1 text-[12px] font-normal text-muted-ink">(optional)</span>
        </p>
        <span className="text-[12px] tabular-nums text-muted-ink">
          {attachments.length}/{FILE_RULES.maxFiles}
        </span>
      </div>
      <p className="-mt-0.5 mb-2 text-[12px] text-muted-ink">
        Proposal, presentation or report. PDF, PPT, PPTX, DOC or DOCX — up to {formatBytes(FILE_RULES.maxSizeBytes)} each.
      </p>

      {attachments.length > 0 && (
        <ul className="mb-2 divide-y divide-line rounded-lg border border-line">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center gap-3 px-3 py-2">
              <FileText className="size-4 shrink-0 text-brand-cyan" aria-hidden="true" />
              <p className="min-w-0 flex-1 truncate text-[13px] text-ink">{file.name}</p>
              <span className="shrink-0 text-[12px] tabular-nums text-muted-ink">{formatBytes(file.sizeBytes)}</span>
              <button
                type="button"
                onClick={() =>
                  setValue(
                    "attachments",
                    attachments.filter((a) => a.id !== file.id),
                    { shouldDirty: true, shouldValidate: true }
                  )
                }
                aria-label={`Remove ${file.name}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-ink transition-colors hover:bg-nav-hover hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-canvas px-4 py-4 text-[13px] font-medium text-brand transition-colors hover:border-brand-cyan/50 hover:bg-nav-hover has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand/15"
        >
          <Plus className="size-4" aria-hidden="true" />
          Choose files
          <input
            id={inputId}
            type="file"
            multiple
            accept={FILE_RULES.accept}
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {rejections.length > 0 && (
        <ul role="alert" className="mt-2 space-y-0.5">
          {rejections.map((msg) => (
            <li key={msg} className="text-[12px] font-medium text-danger">
              {msg}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------
export default function StepTeamTechnology() {
  const {
    register,
    formState: { errors },
  } = useFormContext<IdeaFormValues>();

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="Team" description="You are the team lead for this submission.">
        <div className="flex flex-col gap-5">
          <FacultyGuide />
          <TeamInvites />
        </div>
      </FormSection>

      <FormSection title="Technology">
        <div className="flex flex-col gap-5">
          <TechnologyTags />

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-ink">Is a prototype available?</legend>
            <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
              {(["YES", "NO"] as const).map((option) => (
                <label
                  key={option}
                  className={cn(
                    "cursor-pointer rounded-md px-4 py-1.5 text-[13px] font-medium text-muted-ink transition-colors",
                    "hover:text-ink",
                    "has-[:checked]:bg-brand-cyan-soft has-[:checked]:text-brand",
                    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40"
                  )}
                >
                  <input type="radio" value={option} className="sr-only" {...register("prototypeAvailable")} />
                  {option === "YES" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </FormSection>

      <FormSection title="Links & documents">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              id="githubUrl"
              label="GitHub repository"
              hint="A public repository, or one shared with your faculty guide."
              error={errors.githubUrl?.message}
            >
              <input
                id="githubUrl"
                type="url"
                inputMode="url"
                placeholder="https://github.com/team/project"
                aria-invalid={!!errors.githubUrl}
                aria-describedby={describedBy("githubUrl", { hint: true, error: !!errors.githubUrl })}
                className={cn(controlClass, "h-10")}
                {...register("githubUrl")}
              />
            </FormField>

            <FormField
              id="demoUrl"
              label="Demo link"
              hint="Live demo or a demo video on YouTube or Google Drive. Videos are not uploaded here."
              error={errors.demoUrl?.message}
            >
              <input
                id="demoUrl"
                type="url"
                inputMode="url"
                placeholder="https://"
                aria-invalid={!!errors.demoUrl}
                aria-describedby={describedBy("demoUrl", { hint: true, error: !!errors.demoUrl })}
                className={cn(controlClass, "h-10")}
                {...register("demoUrl")}
              />
            </FormField>
          </div>

          <Attachments />
        </div>
      </FormSection>
    </div>
  );
}
