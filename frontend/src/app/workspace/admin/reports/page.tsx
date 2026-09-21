"use client";

import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { toast } from "sonner";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  Briefcase,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

export default function ReportsPage() {
  function handleExportReport(format: "csv" | "pdf", reportName: string) {
    toast.success(`Generating ${format.toUpperCase()} export for "${reportName}"... Download started.`);
  }

  return (
    <PageContainer
      title="Reporting & Incubator Analytics"
      description="Operational metrics, ecosystem growth analytics, and exportable reports for leadership reviews."
    >
      <div className="space-y-6">
        {/* Export Action Bar */}
        <Card className="p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="size-4 text-indigo-600" /> Export Leadership Reports
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Download comprehensive platform analytics summaries formatted for executive reviews.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportReport("csv", "Incubation Ecosystem Summary")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <FileSpreadsheet className="size-3.5" /> Export CSV Report
            </button>
            <button
              onClick={() => handleExportReport("pdf", "Incubation Ecosystem Summary")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <FileText className="size-3.5" /> Export PDF Summary
            </button>
          </div>
        </Card>

        {/* Analytics Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Retention & Activity</span>
              <Users className="size-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">90.1%</div>
            <p className="text-xs text-emerald-600 font-semibold">128 Active Users / 142 Total Accounts</p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: "90%" }} />
            </div>
          </Card>

          <Card className="p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mentorship Coverage</span>
              <Briefcase className="size-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">1 : 3.8</div>
            <p className="text-xs text-blue-600 font-semibold">22 Active Mentors guiding 84 Student projects</p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: "78%" }} />
            </div>
          </Card>

          <Card className="p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Opportunity Conversion</span>
              <TrendingUp className="size-4 text-purple-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">4.2 Apps / Opportunity</div>
            <p className="text-xs text-purple-600 font-semibold">18 Opportunities posted • 76 Applications</p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full" style={{ width: "85%" }} />
            </div>
          </Card>
        </div>

        {/* Report Download Modules */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Available Report Modules</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Cohort Onboarding & Demographic Report", desc: "Detailed breakdown of student, faculty, and industry partner registrations per cohort quarter." },
              { title: "Mentorship Session & Guidance Log Report", desc: "Audit of completed mentor sessions, rating feedback, and unassigned student requests." },
              { title: "Industry Collaboration & Opportunity Report", desc: "List of active corporate challenges, applications received, and signed agreements." },
              { title: "Startup Incubation & Grant Disbursement Report", desc: "Venture milestone completion rates, KPI progress, and funding allocation tracking." },
            ].map((rep, idx) => (
              <Card key={idx} className="p-4 border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{rep.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{rep.desc}</p>
                </div>
                <button
                  onClick={() => handleExportReport("csv", rep.title)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shrink-0"
                >
                  Download
                </button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
