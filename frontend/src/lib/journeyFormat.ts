/** Small date helper kept dependency-free so the journey model stays unit-testable. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "4 Nov 2026" from YYYY-MM-DD; returns the input unchanged if it is not an ISO date. */
export function formatLongDateSafe(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}
