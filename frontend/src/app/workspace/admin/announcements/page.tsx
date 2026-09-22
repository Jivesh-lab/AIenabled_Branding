"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Megaphone,
  Mail,
  Send,
  Plus,
  Clock,
  UserCheck,
  CheckCircle2,
  FileText,
  Eye,
} from "lucide-react";

type AnnouncementItem = {
  _id: string;
  title: string;
  body: string;
  targetRole: string;
  priority: string;
  authorName: string;
  createdAt: string;
};

const MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    _id: "a1",
    title: "Annual Innovation Hackathon 2026 - Registration Open",
    body: "All students and startup teams are invited to submit their innovative prototypes for the annual incubator challenge.",
    targetRole: "all",
    priority: "urgent",
    authorName: "Operations Manager",
    createdAt: "2026-09-20T10:00:00.000Z",
  },
  {
    _id: "a2",
    title: "Mentor Session Feedback Submission Reminder",
    body: "Mentors are requested to submit session feedback logs within 24 hours of completing a mentee meeting.",
    targetRole: "mentor",
    priority: "high",
    authorName: "Operations Manager",
    createdAt: "2026-09-18T16:00:00.000Z",
  },
];

const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    name: "Onboarding Welcome & Credentials",
    subject: "Welcome to AAI-DBITIC Incubation Platform",
    body: "Dear {{name}},\n\nYour user account has been provisioned under the role {{role}}. Please log in using your temporary password:\nTemp Password: {{tempPassword}}\n\nLog in at: http://localhost:3000/login",
  },
  {
    id: "password_reset",
    name: "Admin Password Reset Notice",
    subject: "Password Reset for Your AAI-DBITIC Account",
    body: "Dear {{name}},\n\nYour account password has been reset by an administrator.\nNew Temporary Password: {{tempPassword}}\n\nYou will be required to set a new password upon first sign-in.",
  },
  {
    id: "approval_accepted",
    name: "Registration Approved Notice",
    subject: "Your Registration Application Has Been Approved",
    body: "Dear {{name}},\n\nYour application to join the AAI-DBITIC ecosystem as a {{role}} has been reviewed and approved! You may now sign in to your workspace.",
  },
];

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(MOCK_ANNOUNCEMENTS);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [priority, setPriority] = useState("normal");

  // Selected Email Template Preview
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0]);

  useEffect(() => {
    setIsMounted(true);
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/announcements`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.announcements && data.announcements.length > 0) {
          setAnnouncements(data.announcements);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !contentBody.trim()) {
      toast.error("Title and Content Body are required.");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/announcements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, body: contentBody, targetRole, priority }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        toast.success("Announcement published successfully!");
        setTitle("");
        setContentBody("");
        fetchAnnouncements();
      } else {
        toast.error(data.message || "Failed to publish announcement.");
      }
    } catch {
      toast.error("Failed to publish announcement.");
    }
  }

  return (
    <PageContainer
      title="Announcements & Email Communication"
      description="Broadcast system announcements to all users or specific roles, and manage automated email notification templates."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Announcement Composer */}
          <Card className="p-5 border border-slate-200 lg:col-span-2 space-y-4">
            <div className="border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="size-5 text-amber-600" /> Broadcast System Announcement
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Publish announcements displayed on user dashboards and workspace banners.
              </p>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Announcement Title</label>
                <Input
                  required
                  placeholder="e.g. Cohort 2026 Pitch Deck Submissions Deadline"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target Audience</label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
                  >
                    <option value="all">All Ecosystem Users</option>
                    <option value="student">Students Only</option>
                    <option value="faculty">Faculty Only</option>
                    <option value="mentor">Mentors Only</option>
                    <option value="industry">Industry Partners Only</option>
                    <option value="investor">Investors Only</option>
                    <option value="startup">Startups Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Banner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Content Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type the full announcement body text..."
                  value={contentBody}
                  onChange={(e) => setContentBody(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <Send className="size-3.5" /> Publish Announcement
                </button>
              </div>
            </form>
          </Card>

          {/* Email Template Previewer */}
          <Card className="p-5 border border-slate-200 space-y-4">
            <div className="border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="size-5 text-indigo-600" /> System Email Templates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Preview automated onboarding & notification email templates.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Template</label>
                <select
                  value={selectedTemplate.id}
                  onChange={(e) => {
                    const found = EMAIL_TEMPLATES.find((t) => t.id === e.target.value);
                    if (found) setSelectedTemplate(found);
                  }}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
                >
                  {EMAIL_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-semibold text-slate-800">Subject: {selectedTemplate.subject}</p>
                <div className="p-2.5 rounded bg-white border border-slate-100 font-mono text-[11px] whitespace-pre-wrap text-slate-700">
                  {selectedTemplate.body}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Published Announcements List */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Broadcast Announcements</h2>

          <div className="space-y-3">
            {announcements.map((item) => (
              <Card key={item._id} className="p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                      Target: {item.targetRole}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase">
                      Priority: {item.priority}
                    </span>
                    <span suppressHydrationWarning className="text-[11px] text-slate-400 font-mono">
                      {isMounted ? new Date(item.createdAt).toLocaleDateString() : item.createdAt}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
                </div>

                <div className="text-right text-[11px] text-slate-400 font-mono shrink-0">
                  Posted by {item.authorName}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
