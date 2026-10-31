"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MessageSquare, Calendar, Loader2, Users } from "lucide-react";

interface MenteeItem {
  id: string;
  startup: string;
  founders: string;
  stage: string;
  health: string;
  lastInteraction: string;
}

export default function AssignedMentees() {
  const [mentees, setMentees] = useState<MenteeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMentees() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/projects");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const mapped: MenteeItem[] = json.data.map((p: any) => ({
              id: p.id || p._id,
              startup: p.title || "Untitled Project",
              founders: p.leadStudent || (p.teamMembers && p.teamMembers[0]) || "Student Founder",
              stage: p.stage || `TRL ${p.trl || 1}`,
              health: p.health === "At Risk" ? "at_risk" : p.health === "Needs Attention" ? "needs_attention" : "on_track",
              lastInteraction: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "Recent",
            }));
            setMentees(mapped);
          }
        }
      } catch {
        // Handled silently
      } finally {
        setLoading(false);
      }
    }
    fetchMentees();
  }, []);

  return (
    <div className="flex flex-col rounded-[12px] border border-line bg-white shadow-sm shadow-slate-200/50">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Assigned Mentees</h2>
          <p className="mt-0.5 text-[13px] text-muted-ink">Startups and projects you are currently advising.</p>
        </div>
        <Link href="/workspace/mentor/mentees" className="text-[13px] font-medium text-brand hover:underline">
          View all
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8 text-muted-ink">
          <Loader2 className="size-5 animate-spin mr-2" />
          <span className="text-xs">Loading mentees...</span>
        </div>
      ) : mentees.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Users className="size-8 text-slate-300 mb-2" />
          <p className="text-xs text-muted-ink">No assigned mentees at this time.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {mentees.map((mentee, i) => (
            <div
              key={mentee.id}
              className={cn(
                "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between",
                i !== mentees.length - 1 && "border-b border-line"
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-semibold text-ink">{mentee.startup}</h3>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      mentee.health === "on_track"
                        ? "bg-emerald-50 text-emerald-700"
                        : mentee.health === "needs_attention"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    )}
                  >
                    {mentee.health === "on_track"
                      ? "On Track"
                      : mentee.health === "needs_attention"
                      ? "Needs Attention"
                      : "At Risk"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-muted-ink">
                  {mentee.founders} &bull; {mentee.stage} &bull; Active {mentee.lastInteraction}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/workspace/mentor/mentees"
                  className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <MessageSquare className="size-3.5" />
                  View
                </Link>
                <Link
                  href="/workspace/mentor/schedule"
                  className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <Calendar className="size-3.5" />
                  Schedule
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
