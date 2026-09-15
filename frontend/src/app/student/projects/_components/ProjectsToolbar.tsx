import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClass } from "@/components/shared/form/FormField";
import { MATURITY_LABEL, MATURITY_LEVELS, REVIEW_STATUSES, REVIEW_STATUS_LABEL } from "@/types/status";
import {
  SORT_LABEL,
  type MaturityFilter,
  type ProjectFilters,
  type SortKey,
  type StatusFilter,
} from "../_lib/filter-projects";

const selectClass = cn(controlClass, "h-10 cursor-pointer pr-8 lg:w-auto");

export default function ProjectsToolbar({
  filters,
  onChange,
}: {
  filters: ProjectFilters;
  onChange: <K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <label htmlFor="project-search" className="sr-only">
          Search projects
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-ink"
          aria-hidden="true"
        />
        <input
          id="project-search"
          type="search"
          value={filters.query}
          onChange={(e) => onChange("query", e.target.value)}
          placeholder="Search projects…"
          autoComplete="off"
          className={cn(controlClass, "h-10 pl-9")}
        />
      </div>

      {/* Review status and maturity are separate filters on separate axes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:shrink-0">
        <div>
          <label htmlFor="filter-status" className="sr-only">
            Review status
          </label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(e) => onChange("status", e.target.value as StatusFilter)}
            className={selectClass}
          >
            <option value="ALL">All review statuses</option>
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REVIEW_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-maturity" className="sr-only">
            Maturity
          </label>
          <select
            id="filter-maturity"
            value={filters.maturity}
            onChange={(e) => onChange("maturity", e.target.value as MaturityFilter)}
            className={selectClass}
          >
            <option value="ALL">All maturity levels</option>
            {MATURITY_LEVELS.map((m) => (
              <option key={m} value={m}>
                {MATURITY_LABEL[m]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sort-projects" className="sr-only">
            Sort projects
          </label>
          <select
            id="sort-projects"
            value={filters.sort}
            onChange={(e) => onChange("sort", e.target.value as SortKey)}
            className={selectClass}
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                Sort: {SORT_LABEL[key]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
