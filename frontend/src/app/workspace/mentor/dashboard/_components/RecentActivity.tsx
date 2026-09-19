import { MessageSquare, FileText, CheckCircle } from "lucide-react";

const ACTIVITY = [
  {
    id: "act1",
    user: "Riya P.",
    action: "sent a message",
    time: "2 hours ago",
    icon: MessageSquare,
  },
  {
    id: "act2",
    user: "EcoCharge",
    action: "uploaded revised Pitch Deck",
    time: "5 hours ago",
    icon: FileText,
  },
  {
    id: "act3",
    user: "FinTrack",
    action: "completed Milestones Q1",
    time: "Yesterday",
    icon: CheckCircle,
  },
];

export default function RecentActivity() {
  return (
    <div className="flex flex-col rounded-[12px] border border-line bg-white shadow-sm shadow-slate-200/50">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Recent Activity</h2>
      </div>

      <div className="flex flex-col p-5">
        <div className="space-y-6">
          {ACTIVITY.map((item, index) => (
            <div key={item.id} className="relative flex gap-3">
              {/* Timeline line */}
              {index !== ACTIVITY.length - 1 && (
                <div className="absolute left-[11px] top-6 h-full w-[2px] bg-slate-100" />
              )}
              
              <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <item.icon className="size-3" strokeWidth={2.5} />
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
      </div>
    </div>
  );
}
