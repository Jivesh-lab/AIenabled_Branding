"use client";

import { useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading } from "@/components/shared/Surface";
import {
  Activity,
  ArrowRight,
  BarChart4,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Lightbulb,
  Presentation,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

export default function StartupDashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "tasks">("overview");

  return (
    <PageContainer
      title="Startup Dashboard"
      description="Welcome back. Monitor your growth, track funding milestones, and manage incubation tasks."
    >
      <div className="space-y-6">
        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Monthly MRR", value: "₹13.6L", change: "+15.3%", icon: DollarSign, color: "bg-emerald-50 text-emerald-700" },
            { label: "Active Clients", value: "38", change: "+10", icon: Users, color: "bg-brand/10 text-brand" },
            { label: "Burn Rate", value: "₹8.2L/mo", change: "-2.4%", icon: Activity, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
            { label: "Runway", value: "14 mos", change: "-1 mo", icon: Clock, color: "bg-amber-50 text-amber-700" },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-ink">{kpi.label}</p>
                  <div className="flex items-end gap-2 mt-1">
                    <p className="text-2xl font-bold text-ink">{kpi.value}</p>
                    <p className={`text-xs font-semibold mb-1 ${kpi.change.startsWith("+") ? "text-success" : "text-danger"}`}>
                      {kpi.change}
                    </p>
                  </div>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${kpi.color}`}>
                  <kpi.icon className="size-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Hero Action Banner */}
        <div className="rounded-xl border border-brand/20 bg-gradient-to-r from-brand-deep to-brand p-5 text-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold uppercase tracking-wider">
                  <Sparkles className="size-3 mr-1" /> AI Action Item
                </span>
              </div>
              <h2 className="text-lg font-bold">Your Series A deck is missing key financial projections.</h2>
              <p className="text-xs text-blue-200 mt-1 max-w-2xl">
                Based on mentor feedback from Dr. Krishnan, we recommend updating slide 12 with a 3-year P&L forecast before the upcoming investor matchmaking event on Feb 15.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href="/workspace/startup/pitch-decks"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-brand-deep text-xs font-bold hover:bg-white/90 transition-colors shadow-sm"
              >
                <Presentation className="size-3.5" /> Update Pitch Deck
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Links / Hub */}
            <Card className="p-5">
              <SectionHeading title="Workspace Hub" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {[
                  { label: "KPIs & Metrics", icon: BarChart4, href: "/workspace/startup/kpis", color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Burn Rate", icon: TrendingUp, href: "/workspace/startup/burn-rate", color: "text-rose-600", bg: "bg-rose-50" },
                  { label: "Pitch Decks", icon: Presentation, href: "/workspace/startup/pitch-decks", color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "PR & Comms", icon: FileText, href: "/workspace/startup/pr", color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Branding", icon: Sparkles, href: "/workspace/startup/branding", color: "text-amber-600", bg: "bg-amber-50" },
                ].map((item) => (
                  <Link key={item.label} href={item.href}>
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-line bg-canvas hover:border-brand/30 hover:shadow-sm transition-all group h-full">
                      <div className={`size-10 rounded-lg flex items-center justify-center mb-2 ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                        <item.icon className="size-5" />
                      </div>
                      <p className="text-xs font-semibold text-ink text-center">{item.label}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Active Programs & Matchmaking */}
            <Card className="p-5">
              <SectionHeading title="Opportunities & Mentorship" action={{ label: "View all", href: "#" }} />
              <div className="space-y-3 mt-4">
                <div className="p-4 rounded-xl border border-line bg-canvas flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                      <Target className="size-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-0.5">Corporate Challenge</p>
                      <h4 className="text-sm font-bold text-ink mb-1">TATA Technologies Industry 4.0 Pilot</h4>
                      <p className="text-xs text-muted-ink">Your application was shortlisted! Next round interview scheduled.</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20 mb-1">Shortlisted</span>
                    <p className="text-[10px] text-muted-ink">Feb 5, 2025</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-line bg-canvas flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                      <Users className="size-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Mentorship</p>
                      <h4 className="text-sm font-bold text-ink mb-1">1:1 with Dr. Anjali Krishnan</h4>
                      <p className="text-xs text-muted-ink">Go-to-market strategy review and deck feedback.</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-brand/10 text-brand border border-brand/20 mb-1">Scheduled</span>
                    <p className="text-[10px] text-muted-ink">Tomorrow, 2:00 PM</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Tasks & Updates */}
          <div className="space-y-6">
            <Card className="flex flex-col h-[calc(100%-1rem)]">
              <div className="p-5 border-b border-line flex gap-4">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`text-sm font-bold pb-4 -mb-5 border-b-2 transition-colors ${activeTab === "overview" ? "border-brand text-brand" : "border-transparent text-muted-ink hover:text-ink"}`}
                >
                  Updates
                </button>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={`text-sm font-bold pb-4 -mb-5 border-b-2 transition-colors ${activeTab === "tasks" ? "border-brand text-brand" : "border-transparent text-muted-ink hover:text-ink"}`}
                >
                  Tasks (3)
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto">
                {activeTab === "tasks" ? (
                  <div className="space-y-3">
                    {[
                      { id: 1, title: "Update Series A Pitch Deck", due: "Feb 10", priority: "High" },
                      { id: 2, title: "Submit Monthly KPI Report", due: "Jan 31", priority: "Medium" },
                      { id: 3, title: "Review TATA Pilot NDA", due: "Feb 2", priority: "High" },
                      { id: 4, title: "Schedule Mentor check-in", due: "Feb 15", priority: "Low", done: true },
                    ].map((task) => (
                      <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border ${task.done ? "bg-canvas/50 border-transparent opacity-60" : "bg-white border-line"}`}>
                        <button className={`mt-0.5 size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${task.done ? "bg-success border-success text-white" : "border-muted-ink"}`}>
                          {task.done && <CheckCircle2 className="size-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${task.done ? "text-muted-ink line-through" : "text-ink"}`}>{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-ink flex items-center gap-1"><Clock className="size-3" /> {task.due}</span>
                            {!task.done && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${task.priority === "High" ? "bg-danger/10 text-danger" : task.priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-canvas text-muted-ink"}`}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { title: "Platform Update", desc: "New AI matchmaking algorithm deployed. Check your Industry Partner matches.", time: "2 hours ago", type: "system" },
                      { title: "Grant Alert", desc: "NABARD AgriTech Innovation Grant applications open next week.", time: "1 day ago", type: "alert" },
                      { title: "Document Approved", desc: "Seed Round Deck v3 was approved by Program Admin.", time: "2 days ago", type: "success" },
                    ].map((update, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="mt-1 flex flex-col items-center">
                          <div className={`size-2 rounded-full ${update.type === "system" ? "bg-brand" : update.type === "alert" ? "bg-brand-gold" : "bg-success"}`} />
                          {i !== 2 && <div className="w-px h-full bg-line my-1" />}
                        </div>
                        <div className="pb-3">
                          <p className="text-xs font-bold text-ink">{update.title}</p>
                          <p className="text-[11px] text-muted-ink mt-0.5">{update.desc}</p>
                          <p className="text-[9px] text-muted-ink font-medium uppercase tracking-wider mt-1">{update.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
