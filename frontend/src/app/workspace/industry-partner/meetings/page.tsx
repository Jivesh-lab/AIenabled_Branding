"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  CalendarDays,
  Clock,
  Video,
  MapPin,
  Users,
  Plus,
  Bell,
  Edit2,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";

type MeetingStatus = "Upcoming" | "Completed" | "Cancelled";
type MeetingFormat = "Video Call" | "In-Person" | "Phone Call";

const MEETINGS = [
  {
    id: "1",
    startup: "AgroVision AI",
    purpose: "Technical Deep-Dive: Inventory AI Demo",
    date: "Jan 28, 2025",
    time: "2:00 PM",
    duration: "90 min",
    format: "Video Call" as MeetingFormat,
    attendees: ["Rajesh Kumar (CEO)", "Anita Desai (CTO)", "Your Team: 3 people"],
    agenda: ["Live AI demo on warehouse inventory dataset", "API integration approach with SAP", "Pilot scope and timeline discussion", "Commercial terms outline"],
    status: "Upcoming" as MeetingStatus,
    location: null,
    notes: "",
  },
  {
    id: "2",
    startup: "CleanBuild Materials",
    purpose: "ESG Platform Scoping Workshop",
    date: "Feb 3, 2025",
    time: "11:00 AM",
    duration: "2 hours",
    format: "In-Person" as MeetingFormat,
    attendees: ["Arjun Reddy (CEO)", "Neha Singh (COO)", "Your ESG Lead", "Your Procurement Head"],
    agenda: ["Current ESG reporting workflow review", "BRSR compliance requirements walkthrough", "Integration with procurement ERP", "Next steps and pilot proposal"],
    status: "Upcoming" as MeetingStatus,
    location: "Hyderabad HQ, Conference Room B-2",
    notes: "",
  },
  {
    id: "3",
    startup: "IndusPredict",
    purpose: "CNC Predictive Maintenance Site Assessment",
    date: "Jan 10, 2025",
    time: "10:00 AM",
    duration: "3 hours",
    format: "In-Person" as MeetingFormat,
    attendees: ["Vikram Mehta (CEO)", "Priya Kaur (Tech Lead)", "Your Plant Manager"],
    agenda: ["Factory floor walk-through", "CNC machine sensor audit", "Data collection protocol discussion", "Edge device deployment plan"],
    status: "Completed" as MeetingStatus,
    location: "Pune Manufacturing Plant",
    notes: "Very productive. IndusPredict team impressed with their domain knowledge of CNC systems. Recommended moving to formal pilot proposal. Follow-up: Share machine specifications by Jan 15.",
  },
];

const STATUS_TONE: Record<MeetingStatus, "progress" | "success" | "neutral"> = {
  Upcoming: "progress",
  Completed: "success",
  Cancelled: "neutral",
};

export default function IndustryMeetingsPage() {
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(MEETINGS.map((m) => [m.id, m.notes]))
  );
  const [editNotes, setEditNotes] = useState<Record<string, boolean>>({});
  const [showNew, setShowNew] = useState(false);

  return (
    <PageContainer
      title="Meetings"
      description="Manage scheduled meetings with startup teams — coordinate demos, site visits, and scoping workshops."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Meetings", value: MEETINGS.length, icon: CalendarDays, color: "bg-brand/10 text-brand" },
            { label: "Upcoming", value: MEETINGS.filter((m) => m.status === "Upcoming").length, icon: Clock, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
            { label: "Completed", value: MEETINGS.filter((m) => m.status === "Completed").length, icon: Check, color: "bg-emerald-50 text-emerald-700" },
            { label: "Startups Engaged", value: new Set(MEETINGS.map((m) => m.startup)).size, icon: Users, color: "bg-amber-50 text-amber-700" },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-ink">{s.label}</p>
                  <p className="text-2xl font-bold text-ink mt-1">{s.value}</p>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="size-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">All Meetings</h2>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
            <Plus className="size-3.5" /> Schedule Meeting
          </button>
        </div>

        {/* Meeting Cards */}
        <div className="space-y-4">
          {MEETINGS.map((mtg) => (
            <Card key={mtg.id} className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Date block */}
                  <div className="shrink-0 text-center w-14 p-2 rounded-lg bg-canvas border border-line">
                    <p className="text-[10px] text-muted-ink uppercase font-bold">{mtg.date.split(" ")[0].slice(0, 3)}</p>
                    <p className="text-xl font-black text-ink">{mtg.date.split(" ")[1].replace(",", "")}</p>
                    <p className="text-[10px] text-muted-ink">{mtg.date.split(" ")[2]}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-ink">{mtg.startup}</h3>
                      <StatusBadge label={mtg.status} tone={STATUS_TONE[mtg.status]} />
                    </div>
                    <p className="text-xs font-semibold text-brand mb-1">{mtg.purpose}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-ink">
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {mtg.time} · {mtg.duration}</span>
                      <span className="flex items-center gap-1">{mtg.format === "Video Call" ? <Video className="size-3" /> : <MapPin className="size-3" />} {mtg.format}</span>
                      {mtg.location && <span className="flex items-center gap-1"><MapPin className="size-3" /> {mtg.location}</span>}
                    </div>
                  </div>

                  {mtg.status === "Upcoming" && (
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors shrink-0">
                      <Video className="size-3.5" /> Join
                    </button>
                  )}
                </div>

                {/* Agenda */}
                <div className="mt-4 p-3 rounded-lg bg-canvas border border-line">
                  <p className="text-[11px] font-bold text-ink mb-1.5">Meeting Agenda</p>
                  <ul className="space-y-1">
                    {mtg.agenda.map((item, i) => (
                      <li key={i} className="text-xs text-muted-ink flex items-start gap-1.5">
                        <span className="text-brand font-bold shrink-0">{i + 1}.</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Attendees */}
                <div className="mt-3">
                  <p className="text-[11px] font-bold text-ink mb-1 flex items-center gap-1"><Users className="size-3 text-brand" /> Attendees</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mtg.attendees.map((a) => (
                      <span key={a} className="px-2 py-0.5 text-[11px] rounded-full bg-canvas border border-line text-muted-ink">{a}</span>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-4 pt-4 border-t border-line">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-ink flex items-center gap-1"><FileText className="size-3 text-brand" /> Meeting Notes</p>
                    <button
                      onClick={() => setEditNotes((prev) => ({ ...prev, [mtg.id]: !prev[mtg.id] }))}
                      className="text-[11px] text-muted-ink hover:text-brand transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="size-3" /> {editNotes[mtg.id] ? "Done" : "Edit"}
                    </button>
                  </div>
                  {editNotes[mtg.id] ? (
                    <textarea
                      rows={3}
                      value={notes[mtg.id]}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [mtg.id]: e.target.value }))}
                      placeholder="Add meeting notes, follow-ups, and action items..."
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                    />
                  ) : (
                    <p className="text-xs text-muted-ink italic leading-relaxed">
                      {notes[mtg.id] || "No notes yet. Click Edit to add meeting notes."}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* New Meeting Dialog */}
        {showNew && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-base font-bold text-ink mb-4">Schedule New Meeting</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Startup *</label>
                  <select className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none bg-white">
                    {["AgroVision AI", "CleanBuild Materials", "WaterSafe IoT", "IndusPredict"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Purpose *</label>
                  <input type="text" placeholder="e.g. Technical demo and pilot scoping..." className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Date *</label>
                    <input type="date" className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Time *</label>
                    <input type="time" className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Format *</label>
                  <select className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none bg-white">
                    <option>Video Call</option><option>In-Person</option><option>Phone Call</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-xs font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas">Cancel</button>
                <button onClick={() => setShowNew(false)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover">
                  <Bell className="size-3.5" /> Schedule & Notify
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
