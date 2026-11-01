import type { ReviewStatus } from "@/types/status";

/** The wizard, opened on an existing application (draft resume or revision after feedback). */
export function editHref(id: string): string {
  return `/workspace/student/submit?applicationId=${encodeURIComponent(id)}`;
}

/**
 * Where a project's main link goes: a draft reopens the wizard on the SAME record; everything else
 * opens the project page (which shows reviewer feedback and the revision action).
 */
export function projectHref(project: { id: string; reviewStatus: ReviewStatus }): string {
  return project.reviewStatus === "DRAFT"
    ? editHref(project.id)
    : `/workspace/student/projects/${encodeURIComponent(project.id)}`;
}
