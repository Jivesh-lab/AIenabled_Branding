"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Pop-up shown once, right after the backend confirms a submission. It is only opened from the submit handler's
 * success path, so it never appears for a draft save, a failure, or when a submitted idea is revisited later.
 * The tick draws itself; with "reduce motion" on, it simply appears.
 */
export default function SubmissionSuccessDialog({
  open,
  ideaName,
  referenceId,
  onClose,
}: {
  open: boolean;
  ideaName: string;
  referenceId: string;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape closes, the page behind does not scroll, and focus starts on the primary action.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const frame = requestAnimationFrame(() => primaryRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(frame);
    };
  }, [open]);

  const tickDelay = reduceMotion ? 0 : 0.25;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="submission-success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submission-success-title"
            aria-describedby="submission-success-desc"
            onClick={(e) => e.stopPropagation()}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="w-full max-w-sm rounded-2xl border border-line bg-white p-7 text-center shadow-2xl"
          >
            {/* Animated tick: a ring that pops in, then the check mark draws itself. */}
            <div className="relative mx-auto flex size-20 items-center justify-center">
              {!reduceMotion && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-success/20"
                  initial={{ scale: 0.6, opacity: 0.7 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
                />
              )}
              <motion.svg
                viewBox="0 0 52 52"
                className="relative size-20"
                aria-hidden="true"
                initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 18 }}
              >
                <circle cx="26" cy="26" r="24" className="fill-success/10 stroke-success" strokeWidth="2" />
                <motion.path
                  d="M15 27.5 L23 35 L37.5 18.5"
                  fill="none"
                  className="stroke-success"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, delay: tickDelay, ease: "easeOut" }}
                />
              </motion.svg>
            </div>

            <h2 id="submission-success-title" className="mt-5 text-[18px] font-semibold text-ink">
              Idea submitted
            </h2>
            <p id="submission-success-desc" className="mt-1.5 text-[13px] leading-relaxed text-muted-ink">
              <span className="font-semibold text-ink">{ideaName}</span> has been sent for review. We&apos;ll update its status here as it moves forward.
            </p>
            <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1 text-[12px] text-muted-ink">
              Reference
              <span className="truncate font-mono font-medium text-ink">{referenceId}</span>
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                ref={primaryRef}
                type="button"
                onClick={onClose}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
              >
                View submission
              </button>
              <Link
                href="/workspace/student/projects"
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-line bg-white px-4 text-[14px] font-medium text-ink transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                My Projects
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
