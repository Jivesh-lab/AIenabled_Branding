/** "2026-11-03" or a full timestamp -> "03 Nov 2026". Returns undefined when there is no usable date. */
export function formatShortDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: dateOnly ? "UTC" : undefined });
}

/** Day number and short month for a date tile: "03", "Nov". */
export function dateTileParts(value?: string | null): { day: string; month: string } | null {
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return null;
  const tz = dateOnly ? "UTC" : undefined;
  return {
    day: date.toLocaleDateString("en-IN", { day: "2-digit", timeZone: tz }),
    month: date.toLocaleDateString("en-IN", { month: "short", timeZone: tz }),
  };
}
