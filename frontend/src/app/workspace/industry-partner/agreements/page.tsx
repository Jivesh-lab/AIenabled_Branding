"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  FileSignature,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  Plus,
  Calendar,
  IndianRupee,
  Building2,
  Shield,
  RefreshCw,
} from "lucide-react";

type AgreementStatus = "Active" | "Expired" | "Pending Signature" | "Draft";

const AGREEMENTS = [
  {
    id: "1",
    title: "Pilot Agreement — AI Inventory Optimization",
    startup: "AgroVision AI",
    type: "Pilot Agreement",
    signedDate: "Jan 20, 2025",
    expiryDate: "Jul 20, 2025",
    value: "₹12L",
    status: "Active" as AgreementStatus,
    clauses: [
      "6-month pilot scope on 2 warehouses (Nashik, Pune)",
      "AgroVision to integrate with SAP MM module within 4 weeks",
      "Target: 90%+ demand forecast accuracy on 50 top SKUs",
      "Monthly performance reviews with KPI dashboard access",
      "IP developed during pilot is jointly owned (60:40)",
      "Termination clause: 30-day notice after month 2",
    ],
    renewalDeadline: "Jun 20, 2025",
    milestones: [
      { label: "SAP Integration Complete", status: "pending", date: "Feb 15, 2025" },
      { label: "Month 1 KPI Review", status: "pending", date: "Feb 20, 2025" },
      { label: "Month 3 Checkpoint", status: "pending", date: "Apr 20, 2025" },
    ],
  },
  {
    id: "2",
    title: "Non-Disclosure Agreement — CNC Predictive Maintenance",
    startup: "IndusPredict",
    type: "NDA",
    signedDate: "Jan 15, 2025",
    expiryDate: "Jan 15, 2026",
    value: "—",
    status: "Active" as AgreementStatus,
    clauses: [
      "Mutual NDA covering CNC machine specifications and sensor data",
      "Confidential period: 2 years from termination",
      "Excludes publicly available technical specifications",
      "Governing law: Indian Contract Act, 1872, Jurisdiction: Pune",
    ],
    renewalDeadline: "Dec 15, 2025",
    milestones: [],
  },
  {
    id: "3",
    title: "ESG Platform PoC Agreement — Carbon Tracking",
    startup: "CleanBuild Materials",
    type: "PoC Agreement",
    signedDate: null,
    expiryDate: "—",
    value: "₹5L (PoC phase)",
    status: "Pending Signature" as AgreementStatus,
    clauses: [
      "12-week PoC for BRSR-compliant carbon tracking platform",
      "Data: 3 months of procurement + logistics datasets to be shared",
      "Deliverable: Working dashboard with 5 BRSR indicators live",
      "Success criteria: Report generation time < 2 hours",
    ],
    renewalDeadline: "—",
    milestones: [],
  },
];

const STATUS_TONE: Record<AgreementStatus, "success" | "progress" | "neutral" | "attention"> = {
  Active: "success",
  Expired: "neutral",
  "Pending Signature": "attention",
  Draft: "neutral",
};

export default function IndustryAgreementsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const active = AGREEMENTS.filter((a) => a.status === "Active").length;
  const pending = AGREEMENTS.filter((a) => a.status === "Pending Signature").length;

  return (
    <PageContainer
      title="Agreements & Pilots"
      description="Manage all signed agreements, pilot contracts, and NDAs with startup partners — track milestones, renewals, and compliance."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Agreements", value: AGREEMENTS.length, icon: FileSignature, color: "bg-brand/10 text-brand" },
            { label: "Active", value: active, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Pending Signature", value: pending, icon: AlertCircle, color: "bg-amber-50 text-amber-700" },
            { label: "Active Pilots", value: AGREEMENTS.filter((a) => a.type === "Pilot Agreement" && a.status === "Active").length, icon: Building2, color: "bg-brand-cyan/10 text-brand-cyan-ink" },
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
          <h2 className="text-sm font-bold text-ink">{AGREEMENTS.length} Agreements</h2>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
            <Plus className="size-3.5" /> New Agreement
          </button>
        </div>

        {/* Agreement Cards */}
        <div className="space-y-4">
          {AGREEMENTS.map((agr) => (
            <Card key={agr.id} className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded border border-line bg-canvas text-muted-ink">{agr.type}</span>
                      <StatusBadge label={agr.status} tone={STATUS_TONE[agr.status]} />
                    </div>
                    <h3 className="text-sm font-bold text-ink leading-snug">{agr.title}</h3>
                    <p className="text-[12px] text-muted-ink mt-0.5">With: {agr.startup}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-ink">
                      {agr.signedDate && <span className="flex items-center gap-1"><Calendar className="size-3" /> Signed: {agr.signedDate}</span>}
                      {agr.expiryDate !== "—" && <span className="flex items-center gap-1"><Clock className="size-3" /> Expires: {agr.expiryDate}</span>}
                      <span className="flex items-center gap-1"><IndianRupee className="size-3" /> Value: {agr.value}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="size-7 rounded flex items-center justify-center border border-line text-muted-ink hover:border-brand/40 hover:text-brand transition-colors">
                      <Download className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setExpanded(expanded === agr.id ? null : agr.id)}
                      className="size-7 rounded flex items-center justify-center border border-line text-muted-ink hover:border-brand/40 hover:text-brand transition-colors"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    {agr.status === "Pending Signature" && (
                      <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                        <Shield className="size-3" /> Sign
                      </button>
                    )}
                    {agr.status === "Active" && agr.renewalDeadline !== "—" && (
                      <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand/20 bg-brand/5 text-brand text-xs font-semibold hover:bg-brand/10 transition-colors">
                        <RefreshCw className="size-3" /> Renew
                      </button>
                    )}
                  </div>
                </div>

                {expanded === agr.id && (
                  <div className="mt-4 pt-4 border-t border-line space-y-4">
                    <div>
                      <p className="text-xs font-bold text-ink mb-2 flex items-center gap-1.5"><Shield className="size-3.5 text-brand" /> Key Agreement Clauses</p>
                      <ul className="space-y-1.5">
                        {agr.clauses.map((clause, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-ink">
                            <span className="text-brand font-bold shrink-0">{i + 1}.</span> {clause}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {agr.milestones.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-ink mb-2">Pilot Milestones</p>
                        <div className="space-y-1.5">
                          {agr.milestones.map((m) => (
                            <div key={m.label} className="flex items-center gap-2.5 p-2 rounded-lg bg-canvas border border-line">
                              <div className={`size-4 rounded-full flex items-center justify-center shrink-0 border ${m.status === "done" ? "bg-success border-success" : "border-line bg-white"}`}>
                                {m.status === "done" && <span className="text-white text-[10px]">✓</span>}
                              </div>
                              <span className="text-xs flex-1 text-ink">{m.label}</span>
                              <span className="text-[11px] text-muted-ink shrink-0">{m.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
