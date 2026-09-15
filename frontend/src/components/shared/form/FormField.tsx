/**
 * Form field primitives shared by every AAI–DBITIC form.
 *
 * FormField renders the label, required marker, hint and error around any
 * control, and wires the ids so the control can reference them through
 * `aria-describedby`. `controlClass` is the one styling source for text
 * inputs, textareas and selects so they cannot drift apart.
 */
import { cn } from "@/lib/utils";

/** Shared control styling: 40px height, #D8EAF0 border, blue focus, red error. */
export const controlClass = cn(
  "w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink",
  "placeholder:text-muted-ink/80",
  "transition-colors duration-150 outline-none",
  "hover:border-brand-cyan/40",
  "focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/15",
  "aria-invalid:border-danger aria-invalid:ring-danger/15 aria-invalid:focus-visible:ring-3",
  "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted-ink"
);

export function fieldIds(id: string) {
  return { hint: `${id}-hint`, error: `${id}-error` };
}

/** Space-separated ids for aria-describedby, omitting parts that are not rendered. */
export function describedBy(id: string, { hint, error }: { hint?: boolean; error?: boolean }) {
  const ids = fieldIds(id);
  return [hint && ids.hint, error && ids.error].filter(Boolean).join(" ") || undefined;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={fieldIds(id).error} role="alert" className="mt-1.5 text-[12px] font-medium text-danger">
      {message}
    </p>
  );
}

export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  aside,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Right-aligned content on the label row, e.g. a character counter. */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          ) : (
            <span className="ml-1.5 text-[12px] font-normal text-muted-ink">(optional)</span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>
        {aside}
      </div>

      {hint && (
        <p id={fieldIds(id).hint} className="-mt-0.5 mb-2 text-[12px] leading-relaxed text-muted-ink">
          {hint}
        </p>
      )}

      {children}
      <FieldError id={id} message={error} />
    </div>
  );
}

/** A titled group of fields inside a form step. Not a card — just a heading and a rule. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-line pt-6 first:border-t-0 first:pt-0", className)}>
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-muted-ink">{description}</p>}
      </div>
      {children}
    </section>
  );
}
