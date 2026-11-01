import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

/** Search on the left, the result count (and a way back to everyone) on the right. The health filter lives in the stat cards. */
export default function MenteeToolbar({
  search,
  onSearch,
  shown,
  total,
  filtered,
  onReset,
}: {
  search: string;
  onSearch: (value: string) => void;
  shown: number;
  total: number;
  /** True when a health filter or a search is narrowing the list. */
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-ink" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name, project or roll number"
          aria-label="Search mentees"
          className={cn(
            "h-10 w-full rounded-lg border border-line bg-white pl-9 pr-9 text-[13px] text-ink placeholder:text-muted-ink",
            "transition-colors duration-150 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          )}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-ink hover:bg-nav-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <XMarkIcon className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="flex items-center gap-3 text-[13px] text-muted-ink" aria-live="polite">
        <span>
          {filtered ? (
            <>
              Showing <span className="font-semibold tabular-nums text-ink">{shown}</span> of <span className="tabular-nums">{total}</span>
            </>
          ) : (
            <>
              <span className="font-semibold tabular-nums text-ink">{total}</span> {total === 1 ? "mentee" : "mentees"}
            </>
          )}
        </span>
        {filtered && (
          <button
            type="button"
            onClick={onReset}
            className="rounded font-semibold text-brand hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Show all
          </button>
        )}
      </p>
    </div>
  );
}
