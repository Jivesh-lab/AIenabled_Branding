/**
 * Draft persistence for Submit New Idea.
 *
 * This is the browser-side copy. The server copy (POST /api/applications/draft)
 * is the durable one; the wizard writes both on every save and never lets
 * either overwrite the other without the student choosing (see `draftsDiffer`).
 *
 * Every storage access is wrapped: localStorage can be unavailable (private
 * mode, blocked site data) and the page must still work without it.
 *
 * Note: attachments are stored as metadata only (name, size). Actual file
 * bytes cannot be kept in localStorage and will need re-uploading once a real
 * upload endpoint exists.
 */
import { IDEA_DEFAULT_VALUES, type IdeaFormValues, type StepIndex } from "./idea-schema";

const STORAGE_KEY = "aai-dbitic:student:idea-draft:v1";

export interface StoredDraft {
  /** The declaration is never persisted — it must be confirmed at submission time. */
  values: Omit<IdeaFormValues, "declarationAccepted">;
  step: StepIndex;
  furthestStep: StepIndex;
  savedAt: string;
  /** The server-side application this browser copy belongs to, once one exists. */
  applicationId: string | null;
}

function isStep(value: unknown): value is StepIndex {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

/** Parses a raw stored string into a draft, tolerating older or partial shapes. */
export function parseDraft(raw: string | null): StoredDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.savedAt !== "string") return null;

    const { declarationAccepted: _omit, ...defaults } = IDEA_DEFAULT_VALUES;
    void _omit;
    const values = { ...defaults, ...(parsed.values ?? {}) };
    // Guard array fields against corrupted storage.
    for (const key of ["teamMembers", "technologies", "attachments"] as const) {
      if (!Array.isArray(values[key])) values[key] = [];
    }

    return {
      values,
      step: isStep(parsed.step) ? parsed.step : 0,
      furthestStep: isStep(parsed.furthestStep) ? parsed.furthestStep : 0,
      savedAt: parsed.savedAt,
      applicationId: typeof parsed.applicationId === "string" ? parsed.applicationId : null,
    };
  } catch {
    return null;
  }
}

export function readRawDraft(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Returns the save timestamp, or null when storage is unavailable. */
export function saveDraft(
  values: IdeaFormValues,
  step: StepIndex,
  furthestStep: StepIndex,
  applicationId: string | null = null,
): string | null {
  const { declarationAccepted: _omit, ...persistable } = values;
  void _omit;
  const savedAt = new Date().toISOString();
  const draft: StoredDraft = { values: persistable, step, furthestStep, savedAt, applicationId };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

// ---------------------------------------------------------------------------
// useSyncExternalStore bindings — read the stored draft during render without
// an effect, and without a server/client hydration mismatch.
// ---------------------------------------------------------------------------
export function subscribeToDraft(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function getDraftServerSnapshot(): string | null {
  return null;
}

export function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "declarationAccepted" && key !== "_draft")
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** True when the browser copy and the server copy hold different form content. */
export function draftsDiffer(a: object, b: object): boolean {
  return stableStringify(a) !== stableStringify(b);
}
