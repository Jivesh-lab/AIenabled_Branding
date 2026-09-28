"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { Bell, Settings, Shield, Save, Eye, EyeOff, Users } from "lucide-react";

const NOTIFICATION_PREFS = [
  { id: "new_match", label: "New Startup Matches", description: "Get notified when AI matches a startup to your problem statement (score 75+)", default: true },
  { id: "application", label: "New Applications", description: "Alerts when a startup applies to one of your problems", default: true },
  { id: "meeting_reminder", label: "Meeting Reminders", description: "Notification 1 hour before scheduled meetings", default: true },
  { id: "agreement_expiry", label: "Agreement Expiry Reminders", description: "30-day and 7-day advance warnings before agreements expire", default: true },
  { id: "weekly_digest", label: "Weekly Digest", description: "Summary of all platform activity from the past week", default: false },
  { id: "platform_news", label: "Program Announcements", description: "Updates from the incubation program management team", default: false },
];

export default function IndustryPartnerSettingsPage() {
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_PREFS.map((n) => [n.id, n.default]))
  );
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState("All Incubated Startups");
  const [emailFrequency, setEmailFrequency] = useState("Instant");
  const [multiUser, setMultiUser] = useState(true);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
  }

  return (
    <PageContainer
      title="Settings"
      description="Manage notifications, team access, password, and account preferences for your organization's account."
    >
      <div className="space-y-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Notification Preferences */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
              <Bell className="size-4 text-brand" /> Notification Preferences
            </h2>
            <div className="space-y-3 mb-4">
              {NOTIFICATION_PREFS.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-canvas border border-line">
                  <div>
                    <p className="text-xs font-semibold text-ink">{n.label}</p>
                    <p className="text-[11px] text-muted-ink mt-0.5">{n.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifs((prev) => ({ ...prev, [n.id]: !prev[n.id] }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors focus:outline-none ${notifs[n.id] ? "bg-brand border-brand" : "bg-line border-line"}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${notifs[n.id] ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Email Notification Frequency</label>
              <select
                value={emailFrequency}
                onChange={(e) => setEmailFrequency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
              >
                <option>Instant</option>
                <option>Daily Digest</option>
                <option>Weekly Digest</option>
              </select>
            </div>
          </Card>

          {/* Team Access */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
              <Users className="size-4 text-brand" /> Team Access
            </h2>
            <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-canvas border border-line mb-4">
              <div>
                <p className="text-xs font-semibold text-ink">Enable Multi-User Access</p>
                <p className="text-[11px] text-muted-ink mt-0.5">Allow other team members from your organization to access this portal</p>
              </div>
              <button
                type="button"
                onClick={() => setMultiUser(!multiUser)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors focus:outline-none ${multiUser ? "bg-brand border-brand" : "bg-line border-line"}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${multiUser ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            {multiUser && (
              <div className="p-3 rounded-lg bg-brand/5 border border-brand/20">
                <p className="text-xs text-brand font-semibold">Multi-user access is enabled.</p>
                <p className="text-[11px] text-muted-ink mt-0.5">Contact incubation admin to add or remove team members for your organization.</p>
              </div>
            )}
          </Card>

          {/* Privacy */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
              <Settings className="size-4 text-brand" /> Privacy & Visibility
            </h2>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Company Profile Visibility</label>
              <select
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
              >
                <option>All Incubated Startups</option>
                <option>Shortlisted Startups Only</option>
                <option>Admin & Faculty Only</option>
              </select>
            </div>
          </Card>

          {/* Password */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
              <Shield className="size-4 text-brand" /> Change Password
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Current Password</label>
                <div className="relative">
                  <input type={showCurrentPwd ? "text" : "password"} placeholder="Current password..." className="w-full px-3 py-2 pr-10 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                  <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-ink hover:text-ink transition-colors">
                    {showCurrentPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showNewPwd ? "text" : "password"} placeholder="At least 8 characters..." className="w-full px-3 py-2 pr-10 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-ink hover:text-ink transition-colors">
                    {showNewPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Confirm New Password</label>
                <input type="password" placeholder="Confirm new password..." className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <button type="submit" className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors shadow-sm">
              <Save className="size-4" /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
