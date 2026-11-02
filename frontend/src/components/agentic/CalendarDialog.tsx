"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import GoogleCalendarCard from "./GoogleCalendarCard";
import WorkingHoursForm from "./WorkingHoursForm";

/** Small modal opened from the profile menu so every role can connect a calendar without a dedicated settings page. */
export default function CalendarDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Calendar and reminders" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Calendar, hours and reminders</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-ink">Reminders and meeting changes always reach you in the bell above and by email. Connecting Google Calendar adds the meetings themselves to your calendar.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-ink hover:bg-nav-hover hover:text-ink">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <GoogleCalendarCard />
        <hr className="my-4 border-line" />
        <WorkingHoursForm />
      </div>
    </div>
  );
}
