import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { Mail, Lock, Bell, User, CheckCircle2 } from "lucide-react";

const NOTIFICATIONS = [
  ["Application updates", "Receive status changes and reviewer feedback on your submissions.", true],
  ["Meeting reminders", "Get notified before scheduled mentor meetings.", true],
  ["Agent activity", "Updates from AI agents working on your projects.", false],
  ["Funding alerts", "New grant and funding opportunities.", true],
];

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader title="Account Settings" description="Manage your account, notifications, and profile preferences." />
      <div className="space-y-6">
        <Card className="p-6">
          <SectionHeading title="Account" subtitle="Email, password, and security settings." />
          <div className="space-y-5">
            <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-canvas">
              <div className="flex items-center gap-3">
                <div className="size-7 flex items-center justify-center rounded-lg bg-brand/10 text-brand"><Mail className="size-3.5" /></div>
                <div>
                  <p className="text-[12px] font-medium text-ink">Email address</p>
                  <p className="text-[11px] text-muted-ink">devansh.sharma@dbit.edu.in</p>
                </div>
              </div>
              <Link href="/workspace/student/settings/email" className="text-[12px] font-bold text-brand transition-colors hover:text-brand-deep">Change <CheckCircle2 className="size-3.5 ml-1" /></Link>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-canvas">
              <div className="flex items-center gap-3">
                <div className="size-7 flex items-center justify-center rounded-lg bg-brand/10 text-brand"><Lock className="size-3.5" /></div>
                <div>
                  <p className="text-[12px] font-medium text-ink">Password</p>
                  <p className="text-[11px] text-muted-ink">Last changed 90 days ago</p>
                </div>
              </div>
              <Link href="/workspace/student/settings/password" className="text-[12px] font-bold text-brand transition-colors hover:text-brand-deep">Change <CheckCircle2 className="size-3.5 ml-1" /></Link>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading title="Notifications" subtitle="Choose how you hear from the incubation centre." />
          <div className="space-y-4">
            {NOTIFICATIONS.map(([title, desc, enabled], idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-line bg-canvas">
                <div className="flex items-center gap-3">
                  <div className="size-7 flex items-center justify-center rounded-full bg-brand text-white"><Bell className="size-3" /></div>
                  <div>
                    <p className="text-[12px] font-medium text-ink">{title}</p>
                    <p className="text-[11px] text-muted-ink">{desc}</p>
                  </div>
                </div>
                <button className={`inline-flex h-5 w-9 items-center rounded-full border-2 transition-colors duration-200 ${
                  enabled ? "bg-brand border-brand" : "bg-slate-200 border-slate-300"
                }`}>
                  <span className={`block h-3 w-3 rounded-full bg-white shadow transform transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading title="Danger zone" subtitle="Actions that cannot be undone." />
          <div className="p-3 rounded-lg border border-line bg-canvas">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-ink">Delete account</p>
                <p className="text-[11px] text-muted-ink">Permanently remove your profile and all associated data.</p>
              </div>
              <button className="text-[12px] font-bold text-red-600 hover:text-red-700 transition-colors">Delete account</button>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
