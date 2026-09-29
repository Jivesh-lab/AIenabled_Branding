"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  Newspaper,
  Plus,
  Search,
  Sparkles,
  Copy,
  CheckCheck,
  Clock,
  Send,
  ExternalLink,
  Hash,
  Link,
  Mail,
  Globe,
  Edit2,
  Trash2,
  ChevronDown,
} from "lucide-react";

type PRType = "Press Release" | "Social Post" | "Blog Article" | "Quote";
type PRStatus = "Draft" | "Published" | "Scheduled";

const PR_ENTRIES = [
  {
    id: "1",
    title: "AgroVision AI Raises ₹1.2Cr Seed Round to Scale Precision Farming Drones",
    type: "Press Release" as PRType,
    status: "Published" as PRStatus,
    publishedDate: "Jan 15, 2025",
    platforms: ["Your Startup Story", "TechCircle", "AgroSpectra"],
    excerpt: "Pune-based startup AgroVision AI today announced the closure of its ₹1.2 crore seed funding round led by Bharat Seed Fund, with participation from two angel investors...",
    generatedByAI: false,
  },
  {
    id: "2",
    title: "🚀 Excited to announce our partnership with 6 FPOs across Maharashtra!",
    type: "Social Post" as PRType,
    status: "Published" as PRStatus,
    publishedDate: "Jan 20, 2025",
    platforms: ["LinkedIn", "Twitter/X"],
    excerpt: "🌾 We've signed agreements with 6 Farmer Producer Organizations representing 2,400+ smallholder farmers across Nashik, Pune, and Satara districts...",
    generatedByAI: true,
  },
  {
    id: "3",
    title: "How AI Drones Are Transforming Pest Management in Indian Agriculture",
    type: "Blog Article" as PRType,
    status: "Draft" as PRStatus,
    publishedDate: "—",
    platforms: [],
    excerpt: "Precision agriculture is no longer the exclusive domain of large corporate farms. With the advent of affordable autonomous drone technology...",
    generatedByAI: true,
  },
  {
    id: "4",
    title: "Q4 Traction Update: 94.2% Accuracy, ₹18L ARR, Next Milestone Milestone",
    type: "Press Release" as PRType,
    status: "Draft" as PRStatus,
    publishedDate: "—",
    platforms: [],
    excerpt: "As we close Q4 2024, AgroVision AI has achieved several significant milestones. Our machine learning model now boasts 94.2% disease detection accuracy...",
    generatedByAI: false,
  },
];

const TYPE_COLOR: Record<PRType, string> = {
  "Press Release": "bg-blue-50 text-blue-700 border-blue-200",
  "Social Post": "bg-purple-50 text-purple-700 border-purple-200",
  "Blog Article": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Quote: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_TONE: Record<PRStatus, "success" | "neutral" | "progress"> = {
  Published: "success",
  Draft: "neutral",
  Scheduled: "progress",
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  LinkedIn: <Link className="size-3" />,
  "Twitter/X": <Hash className="size-3" />,
};

export default function StartupPRPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PRStatus | "All">("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiType, setAiType] = useState<PRType>("Press Release");
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filtered = PR_ENTRIES.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || p.status === filter;
    return matchSearch && matchFilter;
  });

  function copyExcerpt(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function generateAI() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setTimeout(() => {
      setAiOutput(`**${aiType}: ${aiPrompt}**\n\nFOR IMMEDIATE RELEASE\n\n[Company Name], the Pune-based precision agriculture technology startup, today announced [KEY MILESTONE/NEWS], marking a significant step forward in the company's mission to democratize AI-powered farming tools for smallholder farmers across India.\n\n"${aiPrompt} represents our commitment to building technology that creates real impact for Indian farmers," said [Founder Name], Co-Founder & CEO of [Company]. "We are proud to [ACHIEVEMENT/MILESTONE]."\n\n**Key Highlights:**\n• [METRIC 1]: Quantified achievement with specific numbers\n• [METRIC 2]: Business or technology milestone\n• [METRIC 3]: Market or user growth indicator\n\n**About [Company]:**\n[Company] is an incubated startup at the [Incubation Name], developing autonomous precision agriculture solutions. The company has served [X] farmers across [Y] districts, achieving [Z]% accuracy in [key metric].\n\n**Media Contact:**\n[Name] | [Email] | [Phone]`);
      setAiLoading(false);
    }, 1800);
  }

  return (
    <PageContainer
      title="PR & Communications"
      description="Manage press releases, social posts, and blog articles. Use AI to draft content aligned with your brand and milestones."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Assets", value: PR_ENTRIES.length, icon: Newspaper, color: "bg-brand/10 text-brand" },
            { label: "Published", value: PR_ENTRIES.filter((p) => p.status === "Published").length, icon: Globe, color: "bg-emerald-50 text-emerald-700" },
            { label: "Drafts", value: PR_ENTRIES.filter((p) => p.status === "Draft").length, icon: Edit2, color: "bg-amber-50 text-amber-700" },
            { label: "AI Generated", value: PR_ENTRIES.filter((p) => p.generatedByAI).length, icon: Sparkles, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
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

        {/* AI Content Generator */}
        <Card className="p-5 border-brand-cyan/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-brand-cyan" />
            <h2 className="text-sm font-bold text-ink">AI PR Content Generator</h2>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-cyan/10 text-brand-cyan-ink border border-brand-cyan/20">BETA</span>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateAI()}
              placeholder="Describe your news or milestone (e.g. 'We closed ₹50L pre-seed round from DST NIDHI')..."
              className="flex-1 px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <select
              value={aiType}
              onChange={(e) => setAiType(e.target.value as PRType)}
              className="px-2 py-2 text-xs border border-line rounded-lg focus:outline-none bg-white text-muted-ink"
            >
              <option>Press Release</option>
              <option>Social Post</option>
              <option>Blog Article</option>
              <option>Quote</option>
            </select>
            <button
              onClick={generateAI}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {aiLoading ? "Generating..." : <><Sparkles className="size-3.5" /> Generate</>}
            </button>
          </div>
          {aiOutput && (
            <div className="relative">
              <pre className="p-4 rounded-lg bg-canvas border border-line text-xs text-ink whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto">
                {aiOutput}
              </pre>
              <button
                onClick={() => { navigator.clipboard.writeText(aiOutput); setCopied("ai"); setTimeout(() => setCopied(null), 2000); }}
                className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-line text-muted-ink text-[10px] hover:border-brand/40 hover:text-brand transition-colors"
              >
                {copied === "ai" ? <><CheckCheck className="size-3 text-success" /> Copied!</> : <><Copy className="size-3" /> Copy</>}
              </button>
            </div>
          )}
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(["All", "Published", "Draft", "Scheduled"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === f ? "bg-brand text-white border-brand" : "bg-white text-muted-ink border-line hover:border-brand/40 hover:text-brand"}`}
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
                placeholder="Search PR assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-48"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
              <Plus className="size-3.5" /> New Draft
            </button>
          </div>
        </div>

        {/* PR Assets */}
        <div className="space-y-3">
          {filtered.map((pr) => (
            <Card key={pr.id} className="overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-canvas/50 transition-colors"
                onClick={() => setExpanded(expanded === pr.id ? null : pr.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${TYPE_COLOR[pr.type]}`}>{pr.type}</span>
                      <StatusBadge label={pr.status} tone={STATUS_TONE[pr.status]} />
                      {pr.generatedByAI && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan-ink">
                          <Sparkles className="size-2.5" /> AI
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-ink leading-snug">{pr.title}</h3>
                    {pr.publishedDate !== "—" && (
                      <p className="text-[11px] text-muted-ink mt-0.5 flex items-center gap-1">
                        <Clock className="size-3" /> {pr.publishedDate}
                        {pr.platforms.length > 0 && ` · ${pr.platforms.join(", ")}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pr.status === "Draft" && (
                      <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                        <Send className="size-3" /> Publish
                      </button>
                    )}
                    <ChevronDown className={`size-4 text-muted-ink transition-transform ${expanded === pr.id ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </div>

              {expanded === pr.id && (
                <div className="border-t border-line p-5 bg-canvas/50 space-y-3">
                  <p className="text-sm text-muted-ink leading-relaxed italic">{pr.excerpt}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyExcerpt(pr.id, pr.excerpt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors"
                    >
                      {copied === pr.id ? <><CheckCheck className="size-3.5 text-success" /> Copied!</> : <><Copy className="size-3.5" /> Copy</>}
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-brand/40 hover:text-brand transition-colors">
                      <Edit2 className="size-3.5" /> Edit
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted-ink text-xs font-semibold hover:border-danger/40 hover:text-danger transition-colors ml-auto">
                      <Trash2 className="size-3.5" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
