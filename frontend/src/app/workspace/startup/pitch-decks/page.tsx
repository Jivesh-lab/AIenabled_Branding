"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  Presentation,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Plus,
  Upload,
  Download,
  Eye,
  Sparkles,
  Star,
  AlertCircle,
  Edit2,
  Share2,
  MessageSquare,
} from "lucide-react";

type DeckStatus = "Approved" | "Pending Review" | "Rejected" | "Draft";

const PITCH_DECKS = [
  {
    id: "1",
    name: "Seed Round Deck v3 — AgroVision AI",
    version: "v3.0",
    status: "Approved" as DeckStatus,
    submittedDate: "Jan 15, 2025",
    reviewedDate: "Jan 18, 2025",
    pages: 14,
    format: "PDF",
    size: "4.2 MB",
    reviewedBy: "Faculty Mentor: Dr. Anjali Krishnan",
    feedback: "Excellent narrative structure and compelling traction data. The go-to-market slide needs to clearly differentiate the B2B2C model from direct-to-farmer approach. Market sizing TAM figure should cite source.",
    score: 88,
    tags: ["Fundraising", "Seed Round", "AgriTech"],
  },
  {
    id: "2",
    name: "Investor Update — Q4 2024 Traction Report",
    version: "v1.0",
    status: "Pending Review" as DeckStatus,
    submittedDate: "Jan 20, 2025",
    reviewedDate: null,
    pages: 8,
    format: "PPTX",
    size: "2.1 MB",
    reviewedBy: null,
    feedback: null,
    score: null,
    tags: ["Investor Update", "Q4 Report"],
  },
  {
    id: "3",
    name: "Pre-Seed Deck — Original",
    version: "v1.2",
    status: "Rejected" as DeckStatus,
    submittedDate: "Sep 1, 2024",
    reviewedDate: "Sep 5, 2024",
    pages: 18,
    format: "PDF",
    size: "7.8 MB",
    reviewedBy: "Program Coordinator",
    feedback: "Deck is too text-heavy and lacks visual storytelling. Financials section is missing. Problem statement needs to be more concise and customer-pain focused. Consider redesigning with a design guide.",
    score: 42,
    tags: ["Pre-Seed", "Archived"],
  },
  {
    id: "4",
    name: "Series A Prep Deck — Draft",
    version: "v0.1",
    status: "Draft" as DeckStatus,
    submittedDate: "Jan 22, 2025",
    reviewedDate: null,
    pages: 11,
    format: "PPTX",
    size: "3.4 MB",
    reviewedBy: null,
    feedback: null,
    score: null,
    tags: ["Series A", "Draft", "In Progress"],
  },
];

const STATUS_TONE: Record<DeckStatus, "success" | "attention" | "danger" | "neutral"> = {
  Approved: "success",
  "Pending Review": "attention",
  Rejected: "danger",
  Draft: "neutral",
};

const STATUS_ICON: Record<DeckStatus, typeof CheckCircle2> = {
  Approved: CheckCircle2,
  "Pending Review": Clock,
  Rejected: XCircle,
  Draft: Edit2,
};

export default function StartupPitchDecksPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <PageContainer
      title="Pitch Decks"
      description="Upload and manage your investor pitch decks — get AI-enhanced feedback and track review status from mentors and program coordinators."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Decks", value: PITCH_DECKS.length, icon: Presentation, color: "bg-brand/10 text-brand" },
            { label: "Approved", value: PITCH_DECKS.filter((d) => d.status === "Approved").length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Pending Review", value: PITCH_DECKS.filter((d) => d.status === "Pending Review").length, icon: Clock, color: "bg-amber-50 text-amber-700" },
            { label: "Avg Score", value: Math.round(PITCH_DECKS.filter((d) => d.score).reduce((a, d) => a + (d.score || 0), 0) / PITCH_DECKS.filter((d) => d.score).length), icon: Star, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
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

        {/* Upload button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
          >
            <Upload className="size-3.5" /> Upload New Deck
          </button>
        </div>

        {/* Deck Cards */}
        <div className="space-y-4">
          {PITCH_DECKS.map((deck) => {
            const StatusIcon = STATUS_ICON[deck.status];
            return (
              <Card key={deck.id} className="overflow-hidden">
                <div
                  className="p-5 cursor-pointer hover:bg-canvas/50 transition-colors"
                  onClick={() => setExpanded(expanded === deck.id ? null : deck.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* File icon */}
                    <div className="size-12 rounded-lg bg-canvas border border-line flex flex-col items-center justify-center shrink-0">
                      <FileText className="size-5 text-brand" />
                      <span className="text-[8px] font-bold text-muted-ink mt-0.5">{deck.format}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-ink">{deck.name}</h3>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded border border-line bg-canvas text-muted-ink">{deck.version}</span>
                        <StatusBadge label={deck.status} tone={STATUS_TONE[deck.status]} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5 text-[11px] text-muted-ink">
                        <span className="flex items-center gap-1"><Clock className="size-3" /> Submitted: {deck.submittedDate}</span>
                        <span>{deck.pages} slides · {deck.size}</span>
                        {deck.score && <span className="flex items-center gap-1"><Star className="size-3 text-brand-gold" /> Score: {deck.score}/100</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {deck.tags.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); }} className="size-7 rounded flex items-center justify-center border border-line text-muted-ink hover:border-brand/40 hover:text-brand transition-colors">
                        <Download className="size-3.5" />
                      </button>
                      <StatusIcon className={`size-4 shrink-0 ${deck.status === "Approved" ? "text-success" : deck.status === "Rejected" ? "text-danger" : deck.status === "Pending Review" ? "text-amber-600" : "text-muted-ink"}`} />
                    </div>
                  </div>
                </div>

                {expanded === deck.id && (
                  <div className="border-t border-line p-5 bg-canvas/50 space-y-4">
                    {deck.reviewedBy && (
                      <div>
                        <p className="text-xs font-bold text-ink mb-1">Reviewed by</p>
                        <p className="text-xs text-muted-ink">{deck.reviewedBy} · {deck.reviewedDate}</p>
                      </div>
                    )}
                    {deck.feedback && (
                      <div>
                        <p className="text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                          <MessageSquare className="size-3.5 text-brand" /> Reviewer Feedback
                        </p>
                        <p className="text-xs text-muted-ink leading-relaxed p-3 bg-white border border-line rounded-lg">{deck.feedback}</p>
                      </div>
                    )}
                    {deck.status === "Approved" && (
                      <div className="p-3 bg-brand/5 border border-brand/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-brand-cyan shrink-0" />
                          <p className="text-xs font-semibold text-ink">AI Pitch Scoring: {deck.score}/100</p>
                        </div>
                        <p className="text-[11px] text-muted-ink mt-1 leading-relaxed">Your deck scores highly on Problem Clarity (9/10) and Traction Evidence (8/10). Consider improving Market Sizing methodology (6/10) by citing credible third-party sources such as FICCI or NASSCOM reports.</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                        <Download className="size-3.5" /> Download
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                        <Share2 className="size-3.5" /> Share
                      </button>
                      {deck.status === "Draft" && (
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand/20 bg-brand/5 text-brand text-xs font-semibold hover:bg-brand/10 transition-colors">
                          Submit for Review
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Upload Dialog */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowUpload(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-base font-bold text-ink mb-4">Upload New Pitch Deck</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Deck Title *</label>
                  <input type="text" placeholder="e.g. Series A Deck — AgroVision AI v1.0" className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">File *</label>
                  <div className="border-2 border-dashed border-line rounded-lg p-8 text-center cursor-pointer hover:border-brand/40 transition-colors">
                    <Upload className="size-8 text-muted-ink mx-auto mb-2" />
                    <p className="text-xs text-muted-ink">Drag & drop PDF or PPTX, or <span className="text-brand font-semibold">browse</span></p>
                    <p className="text-[11px] text-muted-ink mt-1">Max 20 MB</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Context for Reviewer (Optional)</label>
                  <textarea rows={2} placeholder="Explain what you want feedback on..." className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-xs font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas">Cancel</button>
                <button onClick={() => setShowUpload(false)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover">
                  <Upload className="size-3.5" /> Submit for Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
