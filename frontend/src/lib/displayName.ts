/**
 * Accounts are sometimes stored as "Name (Role label)". The label is noise in a list or a greeting, so it is dropped
 * for display; the stored value is never changed.
 */
export function cleanName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name;
}

export function initialsOf(name: string): string {
  return cleanName(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** First name for greetings: "Dr. Vikramaditya Rao (Mentor)" -> "Vikramaditya". Titles are skipped. */
export function firstNameOf(name: string | null | undefined): string | undefined {
  const parts = cleanName(name ?? "").split(/\s+/).filter(Boolean);
  const first = parts.find((part) => !/^(dr|prof|mr|mrs|ms)\.?$/i.test(part));
  return first || undefined;
}
