"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  BookOpen,
  Plus,
  Search,
  Download,
  ExternalLink,
  Star,
  StarOff,
  FileText,
  Video,
  Link as LinkIcon,
  Presentation,
  Upload,
  Filter,
  BookMarked,
} from "lucide-react";

type ResourceType = "PDF" | "Video" | "Template" | "Article" | "Tool";

const RESOURCES = [
  {
    id: "1",
    title: "Lean Canvas: The Ultimate Guide for Startup Founders",
    type: "PDF" as ResourceType,
    description: "Step-by-step guide to completing a Lean Canvas with 20+ real-world startup examples from Indian incubation programs.",
    tags: ["Business Model", "Strategy", "Early Stage"],
    savedBy: 18,
    url: "#",
    bookmarked: true,
    added: "Jan 10, 2025",
  },
  {
    id: "2",
    title: "Investor Pitch Deck Template (AgriTech Focus)",
    type: "Template" as ResourceType,
    description: "12-slide pitch deck template optimized for AgriTech seed-stage fundraising. Includes narration guide for each slide.",
    tags: ["Fundraising", "Pitch", "AgriTech"],
    savedBy: 31,
    url: "#",
    bookmarked: true,
    added: "Dec 22, 2024",
  },
  {
    id: "3",
    title: "Understanding TRL 1–9: A Practical Primer for Students",
    type: "Video" as ResourceType,
    description: "45-minute explainer video covering Technology Readiness Levels with Indian startup case studies across AgriTech, HealthTech, and CleanTech.",
    tags: ["TRL", "Deep Tech", "Research"],
    savedBy: 24,
    url: "#",
    bookmarked: false,
    added: "Nov 15, 2024",
  },
  {
    id: "4",
    title: "DST-NIDHI Seed Fund Application Guide 2024–25",
    type: "Article" as ResourceType,
    description: "Comprehensive walkthrough of the DST NIDHI Seed Fund eligibility criteria, application process, evaluation rubric, and common rejection reasons.",
    tags: ["Grants", "Government", "Funding"],
    savedBy: 42,
    url: "#",
    bookmarked: false,
    added: "Oct 30, 2024",
  },
  {
    id: "5",
    title: "IP Fundamentals for Student Innovators",
    type: "PDF" as ResourceType,
    description: "Beginner's guide to Patents, Copyrights, Trademarks, and Trade Secrets for student entrepreneurs. Includes provisional patent filing checklist.",
    tags: ["IP", "Legal", "Innovation"],
    savedBy: 15,
    url: "#",
    bookmarked: true,
    added: "Oct 5, 2024",
  },
  {
    id: "6",
    title: "Market Sizing Master Class (TAM, SAM, SOM)",
    type: "Video" as ResourceType,
    description: "Learn to correctly calculate and present market sizing using the top-down and bottom-up approaches relevant to Indian markets.",
    tags: ["Market Research", "Strategy", "Pitch"],
    savedBy: 28,
    url: "#",
    bookmarked: false,
    added: "Sep 18, 2024",
  },
];

const TYPE_ICON: Record<ResourceType, typeof FileText> = {
  PDF: FileText,
  Video: Video,
  Template: Presentation,
  Article: BookOpen,
  Tool: LinkIcon,
};

const TYPE_COLOR: Record<ResourceType, string> = {
  PDF: "bg-red-50 text-red-700 border-red-200",
  Video: "bg-purple-50 text-purple-700 border-purple-200",
  Template: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Article: "bg-blue-50 text-blue-700 border-blue-200",
  Tool: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function MentorResourcesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "All">("All");
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>(
    Object.fromEntries(RESOURCES.map((r) => [r.id, r.bookmarked]))
  );
  const [showUpload, setShowUpload] = useState(false);

  const filtered = RESOURCES.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "All" || r.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <PageContainer
      title="Resource Library"
      description="Curated tools, guides, templates, and articles to share with your mentees — build your personal mentor toolkit."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Resources", value: RESOURCES.length, icon: BookOpen, color: "bg-brand/10 text-brand" },
            { label: "Bookmarked", value: Object.values(bookmarked).filter(Boolean).length, icon: BookMarked, color: "bg-amber-50 text-amber-700" },
            { label: "PDFs & Templates", value: RESOURCES.filter((r) => r.type === "PDF" || r.type === "Template").length, icon: FileText, color: "bg-slate-50 text-slate-600" },
            { label: "Videos", value: RESOURCES.filter((r) => r.type === "Video").length, icon: Video, color: "bg-purple-50 text-purple-700" },
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

        {/* Filters & Upload */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(["All", "PDF", "Video", "Template", "Article", "Tool"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${typeFilter === f ? "bg-brand text-white border-brand" : "bg-white text-muted-ink border-line hover:border-brand/40 hover:text-brand"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-ink" />
              <input
                type="text"
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-48"
              />
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
            >
              <Upload className="size-3.5" /> Add Resource
            </button>
          </div>
        </div>

        {/* Resource Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((resource) => {
            const Icon = TYPE_ICON[resource.type];
            return (
              <Card key={resource.id} interactive className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`size-10 rounded-lg flex items-center justify-center border shrink-0 ${TYPE_COLOR[resource.type]}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-ink leading-snug">{resource.title}</h3>
                      <button
                        onClick={() => setBookmarked((prev) => ({ ...prev, [resource.id]: !prev[resource.id] }))}
                        className="shrink-0"
                      >
                        {bookmarked[resource.id] ? (
                          <Star className="size-4 text-brand-gold fill-current" />
                        ) : (
                          <StarOff className="size-4 text-muted-ink hover:text-brand-gold transition-colors" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-ink mt-1 leading-relaxed">{resource.description}</p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {resource.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                      <div className="flex items-center gap-3 text-[11px] text-muted-ink">
                        <span>{resource.savedBy} saves</span>
                        <span>Added {resource.added}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button className="inline-flex items-center gap-1 px-2 py-1 rounded border border-line text-muted-ink text-[11px] hover:border-brand/40 hover:text-brand transition-colors">
                          <Download className="size-3" /> Save
                        </button>
                        <button className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand text-white text-[11px] hover:bg-brand-hover transition-colors">
                          <ExternalLink className="size-3" /> Open
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Upload Dialog */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowUpload(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-base font-bold text-ink mb-4">Add New Resource</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Title *</label>
                  <input type="text" placeholder="Resource title..." className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Type *</label>
                    <select className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none bg-white">
                      <option>PDF</option><option>Video</option><option>Template</option><option>Article</option><option>Tool</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">URL / File</label>
                    <input type="text" placeholder="https://..." className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Description</label>
                  <textarea rows={3} className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-xs font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas">Cancel</button>
                <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-hover">Add Resource</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
