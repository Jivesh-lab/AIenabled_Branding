"use client";

import { useState, useEffect } from "react";
import { MessageSquare, FileText, CheckCircle, Loader2 } from "lucide-react";

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  time: string;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true);
        const res = await fetch("/api/faculty/overview");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data?.projects)) {
            const list: ActivityItem[] = json.data.projects.slice(0, 4).map((p: any) => ({
              id: p.id || p._id,
              user: p.leadStudent || "Student Founder",
              action: `updated milestone status to ${p.stage || "In Review"}`,
              time: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "Recent",
            }));
            setActivities(list);
          }
        }
      } catch {
        // Silently catch
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, []);

  return (
    <div className="flex flex-col rounded-[12px] border border-line bg-white shadow-sm shadow-slate-200/50">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Recent Activity</h2>
      </div>

      <div className="flex flex-col p-5">
        {loading ? (
          <div className="flex items-center justify-center p-6 text-muted-ink">
            <Loader2 className="size-4 animate-spin mr-2" />
            <span className="text-xs">Loading activity...</span>
          </div>
        ) : activities.length === 0 ? (
          <p className="text-xs text-muted-ink text-center py-4">No recent activity recorded.</p>
        ) : (
          <div className="space-y-6">
            {activities.map((item, index) => (
              <div key={item.id} className="relative flex gap-3">
                {index !== activities.length - 1 && (
                  <div className="absolute left-[11px] top-6 h-full w-[2px] bg-slate-100" />
                )}
                
                <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <CheckCircle className="size-3" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col pb-1">
                  <p className="text-[13px] text-ink">
                    <span className="font-semibold">{item.user}</span> {item.action}
                  </p>
                  <span className="mt-0.5 text-[11px] text-muted-ink">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
