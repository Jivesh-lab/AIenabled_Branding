import Link from "next/link";
import { FolderSearch, Lightbulb, Plus } from "lucide-react";
import { Card } from "@/components/shared/Surface";

type Variant =
  | { kind: "no-projects" }
  | { kind: "no-results"; query: string; onClear: () => void }
  | { kind: "no-filter-match"; onClear: () => void };

const submitLinkClass =
  "inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1";

const clearButtonClass =
  "inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-[14px] font-medium text-ink transition-colors duration-150 hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export default function EmptyState(props: Variant) {
  const content =
    props.kind === "no-projects"
      ? {
          icon: Lightbulb,
          title: "You haven't submitted any ideas yet",
          body: "Submit your first idea to start its review and incubation journey.",
        }
      : props.kind === "no-results"
        ? {
            icon: FolderSearch,
            title: `No projects match “${props.query.trim()}”`,
            body: "Try a different name or domain, or submit a new idea.",
          }
        : {
            icon: FolderSearch,
            title: "No projects found",
            body: "Try changing your filters or submit a new idea.",
          };

  const Icon = content.icon;

  return (
    <Card className="px-6 py-12 text-center">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-brand-cyan-soft">
        <Icon className="size-5 text-brand" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-[16px] font-semibold text-ink">{content.title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-[14px] text-muted-ink">{content.body}</p>

      <div className="mt-6 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
        {props.kind !== "no-projects" && (
          <button type="button" onClick={props.onClear} className={clearButtonClass}>
            {props.kind === "no-results" ? "Clear search" : "Clear filters"}
          </button>
        )}
        <Link href="/workspace/student/submit" className={submitLinkClass}>
          <Plus className="-ml-0.5 size-4" aria-hidden="true" />
          Submit New Idea
        </Link>
      </div>
    </Card>
  );
}
