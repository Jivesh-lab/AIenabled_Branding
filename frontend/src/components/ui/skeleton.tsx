import { cn } from "@/lib/utils";

/**
 * The one skeleton primitive (shadcn convention). A skeleton is a SHAPE, never data: it carries no text, so it
 * can never be mistaken for a real project name or number. Motion is a restrained pulse and is switched off for
 * people who prefer reduced motion.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-slate-200/70 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
