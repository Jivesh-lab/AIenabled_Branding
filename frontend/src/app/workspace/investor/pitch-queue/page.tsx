"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import {
  Play,
  Clock,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Download,
  SkipForward,
  CheckCircle2,
  Calendar,
  Building2,
  IndianRupee,
  TrendingUp,
  MapPin,
  Sparkles,
  Eye,
} from "lucide-react";

const PITCH_QUEUE = [
  {
    id: "1",
    startup: "Agri-Drone Solutions",
    tagline: "Autonomous precision farming drones for smallholder farmers",
    domain: "AgriTech",
    stage: "Seed",
    ask: "₹1.2Cr",
    equity: "8–12%",
    location: "Pune, MH",
    duration: "8 min",
    submittedDate: "Jan 15, 2025",
    score: 94,
    watched: false,
    status: "New" as const,
    founders: "Rajesh Kumar (CEO) · Anita Desai (CTO)",
    highlights: ["DGCA approved", "6 paying clients", "Patent pending"],
    tags: ["Deep Tech", "Hardware", "Rural"],
  },
  {
    id: "2",
    startup: "EduMetrics AI",
    tagline: "Adaptive analytics for tier-2 college students",
    domain: "EdTech",
    stage: "Pre-Seed",
    ask: "₹40L",
    equity: "SAFE @ ₹4Cr",
    location: "Bengaluru, KA",
    duration: "6 min",
    submittedDate: "Jan 18, 2025",
    score: 88,
    watched: true,
    status: "Reviewing" as const,
    founders: "Meera Iyer (CEO) · Sam Pillai (CPO) · Dev Nair (CTO)",
    highlights: ["8 colleges live", "22% MoM growth", "Ex-IIT team"],
    tags: ["B2B SaaS", "AI/ML", "EdTech"],
  },
  {
    id: "3",
    startup: "RuralPay",
    tagline: "Offline-first UPI for rural kirana merchants",
    domain: "FinTech",
    stage: "Seed",
    ask: "₹80L",
    equity: "6–8%",
    location: "Jaipur, RJ",
    duration: "7 min",
    submittedDate: "Jan 20, 2025",
    score: 79,
    watched: false,
    status: "New" as const,
    founders: "Vikas Sharma (CEO) · Priyanka Jain (CTO)",
    highlights: ["RBI sandbox", "840 merchants", "₹2.3Cr GMV/mo"],
    tags: ["FinTech", "Rural", "Offline"],
  },
  {
    id: "4",
    startup: "CleanBuild Materials",
    tagline: "Fly-ash based sustainable construction blocks",
    domain: "CleanTech",
    stage: "Series A",
    ask: "₹3Cr",
    equity: "15–18%",
    location: "Hyderabad, TS",
    duration: "12 min",
    submittedDate: "Jan 22, 2025",
    score: 75,
    watched: false,
    status: "New" as const,
    founders: "Arjun Reddy (CEO) · Neha Singh (COO)",
    highlights: ["CSIR certified", "State govt MoU", "65% less carbon"],
    tags: ["CleanTech", "B2G", "Construction"],
  },
];

const STATUS_TONE: Record<string, "progress" | "success" | "attention" | "neutral"> = {
  New: "info" as never,
  Reviewing: "progress",
  Shortlisted: "success",
  Passed: "neutral",
};

export default function InvestorPitchQueuePage() {
  const [interest, setInterest] = useState<Record<string, "up" | "down" | null>>(
    Object.fromEntries(PITCH_QUEUE.map((p) => [p.id, null]))
  );
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});

  const newCount = PITCH_QUEUE.filter((p) => p.status === "New").length;

  return (
    <PageContainer
      title="Pitch Queue"
      description="Review curated pitch videos from startups matched to your investment thesis. Rate, note, and shortlist with one click."
    >
      <div className="space-y-6">
        {/* Header stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "In Queue", value: PITCH_QUEUE.length, icon: Play, color: "bg-brand/10 text-brand" },
            { label: "New (Unreviewed)", value: newCount, icon: Sparkles, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
            { label: "Reviewed", value: PITCH_QUEUE.filter((p) => p.watched).length, icon: Eye, color: "bg-emerald-50 text-emerald-700" },
            { label: "Avg AI Score", value: Math.round(PITCH_QUEUE.reduce((a, p) => a + p.score, 0) / PITCH_QUEUE.length), icon: Star, color: "bg-amber-50 text-amber-700" },
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

        {/* Pitch Cards */}
        <div className="space-y-4">
          {PITCH_QUEUE.map((pitch) => (
            <Card key={pitch.id} className="overflow-hidden">
              {/* Video Player Area */}
              {activeVideo === pitch.id && (
                <div className="bg-slate-900 h-48 flex items-center justify-center border-b border-line relative">
                  <div className="text-center text-white">
                    <Play className="size-12 mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-semibold">{pitch.startup} — Pitch Video</p>
                    <p className="text-xs text-slate-400 mt-1">Duration: {pitch.duration} · Playing simulation</p>
                  </div>
                  <button
                    onClick={() => setActiveVideo(null)}
                    className="absolute top-3 right-3 text-xs text-white/60 hover:text-white bg-black/30 px-2 py-1 rounded"
                  >
                    Close
                  </button>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Score */}
                  <div className={`shrink-0 size-12 rounded-lg flex items-center justify-center text-base font-black border-2 ${pitch.score >= 90 ? "border-success text-success bg-emerald-50" : pitch.score >= 80 ? "border-brand text-brand bg-brand/5" : "border-brand-gold text-brand-gold-ink bg-amber-50"}`}>
                    {pitch.score}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-ink">{pitch.startup}</h3>
                      <StatusBadge label={pitch.status} tone={pitch.watched ? "progress" : "neutral"} />
                      {!pitch.watched && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand text-white">NEW</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-ink italic mb-2">{pitch.tagline}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-ink mb-2">
                      <span className="flex items-center gap-1"><Building2 className="size-3" /> {pitch.stage} · {pitch.domain}</span>
                      <span className="flex items-center gap-1"><IndianRupee className="size-3" /> {pitch.ask} · {pitch.equity}</span>
                      <span className="flex items-center gap-1"><MapPin className="size-3" /> {pitch.location}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {pitch.duration} pitch</span>
                      <span className="flex items-center gap-1"><Calendar className="size-3" /> {pitch.submittedDate}</span>
                    </div>
                    <p className="text-[11px] text-muted-ink">Founders: {pitch.founders}</p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {pitch.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Action Column */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setActiveVideo(activeVideo === pitch.id ? null : pitch.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
                    >
                      <Play className="size-3.5" /> {activeVideo === pitch.id ? "Pause" : "Watch"}
                    </button>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setInterest((prev) => ({ ...prev, [pitch.id]: prev[pitch.id] === "up" ? null : "up" }))}
                        className={`flex-1 h-7 rounded flex items-center justify-center border text-[11px] transition-colors ${interest[pitch.id] === "up" ? "bg-success/10 border-success/40 text-success" : "border-line text-muted-ink hover:border-success/40 hover:text-success"}`}
                      >
                        <ThumbsUp className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setInterest((prev) => ({ ...prev, [pitch.id]: prev[pitch.id] === "down" ? null : "down" }))}
                        className={`flex-1 h-7 rounded flex items-center justify-center border text-[11px] transition-colors ${interest[pitch.id] === "down" ? "bg-danger/10 border-danger/40 text-danger" : "border-line text-muted-ink hover:border-danger/40 hover:text-danger"}`}
                      >
                        <ThumbsDown className="size-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => setShowNotes((prev) => ({ ...prev, [pitch.id]: !prev[pitch.id] }))}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-line text-muted-ink text-[11px] hover:border-brand/40 hover:text-brand transition-colors"
                    >
                      <MessageSquare className="size-3" /> Notes
                    </button>
                  </div>
                </div>

                {/* Notes Area */}
                {showNotes[pitch.id] && (
                  <div className="mt-4 border-t border-line pt-4">
                    <label className="block text-xs font-semibold text-ink mb-1.5">Private Investment Notes</label>
                    <textarea
                      rows={3}
                      value={notes[pitch.id] || ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [pitch.id]: e.target.value }))}
                      placeholder="Add your due diligence notes, questions, or follow-up items..."
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button className="px-3 py-1 rounded bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">Save Notes</button>
                      <button className="px-3 py-1 rounded border border-line text-muted-ink text-xs font-semibold hover:bg-canvas transition-colors">Request Meeting</button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
