/**
 * Pure rules shared by the student BFF routes and server pages: who may call, how upstream
 * failures are classified, and how errors are shaped. No framework imports, so it is unit-tested
 * directly (see apiPolicy.test.ts).
 */

export type Role = "student" | "faculty" | "mentor" | "investor" | "admin" | "super_admin";

export interface SessionUser {
  id?: string | null;
  role?: string | null;
  name?: string | null;
  email?: string | null;
}

/** Roles that may use the student application API. Applicants must be students. */
export const STUDENT_WRITE_ROLES: readonly Role[] = ["student"];
/** Roles that may open student read endpoints (admins inspect the student workspace; they see only their own records). */
export const STUDENT_READ_ROLES: readonly Role[] = ["student", "admin", "super_admin"];

export interface AuthFailure {
  status: 401 | 403;
  message: string;
}

/** null when the caller may proceed; otherwise the rejection to return. */
export function authorize(user: SessionUser | null | undefined, allowedRoles: readonly Role[]): AuthFailure | null {
  if (!user?.id) return { status: 401, message: "Unauthorized" };
  if (!user.role || !allowedRoles.includes(user.role as Role)) {
    return { status: 403, message: "You do not have permission to perform this action." };
  }
  return null;
}

export type FailureKind = "unauthenticated" | "forbidden" | "not-found" | "unavailable";

export function classifyStatus(status: number): FailureKind {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  return "unavailable";
}

const KIND_MESSAGE: Record<FailureKind, string> = {
  unauthenticated: "Your session has expired. Please sign in again.",
  forbidden: "You do not have access to this.",
  "not-found": "We couldn't find that.",
  unavailable: "The application service is unavailable. Please try again shortly.",
};

/** Human message for an upstream failure: the service's own detail when it gave one, else a safe default. */
export function failureMessage(kind: FailureKind, body: unknown): string {
  const b = (body ?? {}) as { message?: unknown; detail?: unknown };
  if (typeof b.message === "string" && b.message) return b.message;
  if (typeof b.detail === "string" && b.detail) return b.detail;
  const nested = (b.detail as { message?: unknown } | undefined)?.message;
  if (typeof nested === "string" && nested) return nested;
  return KIND_MESSAGE[kind];
}

/**
 * Error body returned to the browser. Keeps FastAPI's `detail` (field-level 422 errors are read from
 * it) and always adds a plain `message`, so every failure has one consistent, displayable shape.
 */
export function errorBody(status: number, upstream: unknown): Record<string, unknown> {
  const base = upstream && typeof upstream === "object" ? (upstream as Record<string, unknown>) : {};
  return { ...base, message: failureMessage(classifyStatus(status), upstream) };
}

/** Network failures and timeouts are "service unavailable"; anything else is a server bug. */
export function classifyThrown(error: unknown): { status: 503 | 500; message: string } {
  const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
  return error instanceof TypeError || timedOut
    ? { status: 503, message: KIND_MESSAGE.unavailable }
    : { status: 500, message: "Internal Server Error" };
}

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
