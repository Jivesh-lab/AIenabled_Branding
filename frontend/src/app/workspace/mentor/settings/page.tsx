"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading } from "@/components/shared/Surface";
import { Settings, Bell, Shield, Palette, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const NOTIFICATION_PREFS = [
  { id: "session_reminder", label: "Session Reminders", description: "Get notified 30 minutes before each scheduled session", default: true },
  { id: "mentee_update", label: "Mentee Progress Updates", description: "Receive weekly summary of mentee milestone activity", default: true },
  { id: "new_assignment", label: "New Mentee Assignments", description: "Alert when admin assigns a new mentee to you", default: true },
  { id: "feedback_received", label: "Feedback Received", description: "Notification when a mentee submits session feedback", default: false },
  { id: "platform_news", label: "Platform Updates & News", description: "Monthly digest of incubation program announcements", default: false },
];

export default function MentorSettingsPage() {
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_PREFS.map((n) => [n.id, n.default]))
  );
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [calendarSync, setCalendarSync] = useState(false);
  const [sessionReminder, setSessionReminder] = useState("30");
  const [profileVisibility, setProfileVisibility] = useState("All Mentees");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Mentor settings saved successfully.");
  }

  return (
    <PageContainer
      title="Settings"
      description="Manage your notification preferences, password, session settings, and privacy controls."
    >
      <div className="space-y-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Notification Preferences */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
              <Bell className="size-4 text-brand" /> Notification Preferences
            </h2>
            <div className="space-y-3">
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
          </Card>

          {/* Session Settings */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
              <Settings className="size-4 text-brand" /> Session Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-canvas border border-line">
                <div>
                  <p className="text-xs font-semibold text-ink">Google Calendar Sync</p>
                  <p className="text-[11px] text-muted-ink mt-0.5">Automatically sync sessions to your Google Calendar</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCalendarSync(!calendarSync)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors focus:outline-none ${calendarSync ? "bg-brand border-brand" : "bg-line border-line"}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${calendarSync ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Session Reminder Lead Time</label>
                <select
                  value={sessionReminder}
                  onChange={(e) => setSessionReminder(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                >
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                  <option value="120">2 hours before</option>
                  <option value="1440">1 day before</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Privacy */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
              <Palette className="size-4 text-brand" /> Privacy & Visibility
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Profile Visibility</label>
                <select
                  value={profileVisibility}
                  onChange={(e) => setProfileVisibility(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                >
                  <option>All Mentees</option>
                  <option>Assigned Mentees Only</option>
                  <option>Admin & Faculty Only</option>
                </select>
              </div>
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
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current password..."
                    className="w-full px-3 py-2 pr-10 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-ink hover:text-ink transition-colors">
                    {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="At least 8 characters..."
                    className="w-full px-3 py-2 pr-10 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-ink hover:text-ink transition-colors">
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors shadow-sm"
            >
              <Save className="size-4" /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
