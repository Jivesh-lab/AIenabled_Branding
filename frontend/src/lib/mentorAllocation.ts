import { unstable_rethrow } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createBackendToken } from "@/lib/backendToken";
import { fetchAgent } from "@/lib/agentProxy";
import { STUDENT_READ_ROLES, authorize } from "@/lib/apiPolicy";
import {
  deriveMatchingState,
  interpretAllocationResponse,
  type DirectoryProfile,
  type MentorResult,
} from "@/lib/mentorState";
import type { StudentProject } from "@/types/student-application";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

/**
 * Mentor matching info for one of the signed-in student's projects. Server-side only.
 *
 * - Application status comes from agent-service (which also proves ownership of the application).
 * - Only an APPROVED application has a mentoring record; others get a state derived from their status
 *   without calling the mentoring system at all.
 * - The allocation itself comes from the Express backend, which independently verifies the student is the
 *   project's founder. A failure there is returned as a failure, never as "no mentor".
 */
export async function getMentorInfo(applicationId: string, applicationStatus: string): Promise<MentorResult> {
  const base = { applicationId, requestedExpertise: [], recommendation: null, mentor: null, profileUnavailable: false, updatedAt: null };

  if (applicationStatus.toUpperCase() !== "APPROVED") {
    return { ok: true, data: { ...base, state: deriveMatchingState(applicationStatus, null) } };
  }

  try {
    const session = await getServerSession(authOptions);
    const denied = authorize(session?.user, STUDENT_READ_ROLES);
    if (denied || !session?.user) {
      return { ok: false, kind: denied?.status === 403 ? "forbidden" : "unauthenticated", message: denied?.message ?? "Unauthorized" };
    }

    const token = await createBackendToken(session.user.id, session.user.role);
    const response = await fetch(`${BACKEND_URL}/api/student/mentor-allocation/${encodeURIComponent(applicationId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body: unknown = await response.json().catch(() => null);
    const result = interpretAllocationResponse(response.status, body);
    if (!result.ok) return result;

    const allocation = result.allocation;
    const state = deriveMatchingState(applicationStatus, allocation);

    let directory: DirectoryProfile | null = null;
    let profileUnavailable = false;
    const mentorName = allocation?.mentor?.name;
    if (state === "matched" && mentorName) {
      const lookup = await fetchAgent<DirectoryProfile>({
        path: `/api/mentors/lookup?name=${encodeURIComponent(mentorName)}`,
        permissions: ["view_applications"],
        roles: STUDENT_READ_ROLES,
        tag: "Mentor Directory",
      });
      if (lookup.ok) directory = lookup.data;
      else if (lookup.kind !== "not-found") profileUnavailable = true; // listed-or-not is unknown; say so
    }

    return {
      ok: true,
      data: {
        applicationId,
        state,
        requestedExpertise: allocation?.requestedExpertise ?? [],
        // A recommendation is only meaningful while it is still a proposal.
        recommendation: state === "recommended" || state === "in-progress" ? allocation?.recommendation ?? null : null,
        mentor: state === "matched" && mentorName ? { name: mentorName, contact: allocation?.mentor?.contact ?? null, directory } : null,
        profileUnavailable,
        updatedAt: allocation?.updatedAt ?? null,
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[Mentor Allocation] Error:", error);
    return { ok: false, kind: "unavailable", message: "The mentoring service is unavailable. Please try again shortly." };
  }
}

/** Mentor info for each project, keyed by application id. Non-approved projects need no network call. */
export async function getMentorInfoForProjects(projects: StudentProject[]): Promise<Record<string, MentorResult>> {
  const entries = await Promise.all(
    projects.map(async (p) => [p.id, await getMentorInfo(p.id, p.reviewStatus)] as const),
  );
  return Object.fromEntries(entries);
}
