/**
 * User-facing error wording for the browser. Server and service text ("Internal Server Error", stack hints, upstream
 * detail) is never shown for failures the user cannot act on; those get one calm, generic message. Validation
 * outcomes the API wrote for the user (400/404/409/422/429, e.g. "You have already requested a meeting for that
 * date") are passed through because they tell the student what to change.
 */

export const GENERIC_ACTION_ERROR = "Something went wrong on our side. Please try again in a moment.";
export const OFFLINE_ERROR = "We couldn't reach the server. Check your connection and try again.";
export const SESSION_EXPIRED_ERROR = "Your session has expired. Please sign in again.";

const USER_ACTIONABLE = new Set([400, 404, 409, 422, 429]);

/** The message to show for a failed request. `fallback` replaces the generic text for a specific action. */
export function friendlyActionMessage(status: number, body: unknown, fallback = GENERIC_ACTION_ERROR): string {
  if (status === 401) return SESSION_EXPIRED_ERROR;
  if (status === 403) return "You don't have permission to do that.";
  if (USER_ACTIONABLE.has(status)) {
    const b = (body ?? {}) as { message?: unknown };
    if (typeof b.message === "string" && b.message.trim()) return b.message;
  }
  return fallback;
}

/** The message to show when the request itself threw (offline, timeout, unreadable response). */
export function friendlyThrown(error: unknown, fallback = GENERIC_ACTION_ERROR): string {
  if (error instanceof FriendlyError) return error.message;
  if (error instanceof TypeError) return OFFLINE_ERROR;
  return fallback;
}

/** An error whose message is already safe to show. Throw this from a fetch helper; catch it with friendlyThrown. */
export class FriendlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FriendlyError";
  }
}
