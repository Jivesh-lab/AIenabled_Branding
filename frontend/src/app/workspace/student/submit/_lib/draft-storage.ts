/**
 * Draft persistence for Submit New Idea.
 *
 * There is no backend yet, so drafts live in this browser's localStorage. When
 * the API exists, replace `saveDraft` / `loadDraft` / `clearDraft` with calls
 * to it — the wizard only depends on these three functions.
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
export function saveDraft(values: IdeaFormValues, step: StepIndex, furthestStep: StepIndex): string | null {
  const { declarationAccepted: _omit, ...persistable } = values;
  void _omit;
  const savedAt = new Date().toISOString();
  const draft: StoredDraft = { values: persistable, step, furthestStep, savedAt };
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
