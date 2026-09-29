"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge } from "@/components/shared/Surface";
import {
  Search,
  MapPin,
  Building2,
  TrendingUp,
  Star,
  ExternalLink,
  Filter,
  ChevronDown,
  Sparkles,
  Users,
  IndianRupee,
} from "lucide-react";

const STARTUPS = [
  {
    id: "1",
    name: "AgroVision AI",
    tagline: "Autonomous precision farming drones powered by computer vision AI",
    domain: "AgriTech",
    stage: "Seed",
    location: "Pune, MH",
    team: 12,
    traction: "₹18L ARR · 6 clients",
    match: 94,
    tags: ["AI/ML", "Drones", "Computer Vision", "Agriculture"],
    tech: ["Python", "TensorFlow", "ROS", "Edge AI"],
    openTo: ["Pilot Partnership", "Data Sharing", "Technology Integration"],
  },
  {
    id: "2",
    name: "IndusPredict",
    tagline: "AI-powered predictive maintenance for industrial CNC and heavy equipment",
    domain: "Industry 4.0",
    stage: "Seed",
    location: "Pune, MH",
    team: 9,
    traction: "₹22L ARR · 4 factories",
    match: 91,
    tags: ["IoT", "Predictive Analytics", "Manufacturing", "Edge AI"],
    tech: ["PyTorch", "MQTT", "InfluxDB", "Raspberry Pi"],
    openTo: ["Pilot Partnership", "OEM Integration", "White-labeling"],
  },
  {
    id: "3",
    name: "CleanBuild Materials",
    tagline: "Sustainable fly-ash construction materials reducing carbon by 65%",
    domain: "CleanTech",
    stage: "Seed",
    location: "Hyderabad, TS",
    team: 7,
    traction: "2 pilots · CSIR certified",
    match: 87,
    tags: ["Sustainability", "Construction", "Materials", "ESG"],
    tech: ["Materials Science", "Carbon Analytics", "BRSR Platform"],
    openTo: ["Supply Partnership", "Pilot Deployment", "ESG Reporting Integration"],
  },
  {
    id: "4",
    name: "WaterSafe IoT",
    tagline: "Industrial water quality and effluent monitoring IoT platform",
    domain: "CleanTech",
    stage: "Pre-Seed",
    location: "Chennai, TN",
    team: 6,
    traction: "₹8L ARR · 3 industrial sites",
    match: 82,
    tags: ["IoT", "Environment", "Compliance", "Water"],
    tech: ["Node.js", "InfluxDB", "CPCB APIs", "ESP32"],
    openTo: ["CSR Partnership", "Pilot Deployment", "Data Integration"],
  },
  {
    id: "5",
    name: "LogiRoute AI",
    tagline: "AI-powered last-mile route optimization for urban deliveries",
    domain: "Logistics",
    stage: "Pre-Seed",
    location: "Bengaluru, KA",
    team: 5,
    traction: "2 pilots · 18% fuel savings",
    match: 76,
    tags: ["AI/ML", "Logistics", "Route Optimization", "SaaS"],
    tech: ["Python", "OR-Tools", "FastAPI", "React Native"],
    openTo: ["Pilot Partnership", "API Integration", "White-labeling"],
  },
  {
    id: "6",
    name: "SafeGrip Safety Tech",
    tagline: "Wearable IoT safety monitoring for construction and manufacturing workers",
    domain: "SafetyTech",
    stage: "Pre-Seed",
    location: "Ahmedabad, GJ",
    team: 4,
    traction: "1 pilot · 3 companies",
    match: 71,
    tags: ["IoT", "Worker Safety", "Wearables", "Industry 4.0"],
    tech: ["Embedded C", "BLE", "Firebase", "Flutter"],
    openTo: ["Pilot Partnership", "CSR Initiative", "Bulk Hardware Order"],
  },
];

export default function IndustryDirectoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const domains = ["All", ...Array.from(new Set(STARTUPS.map((s) => s.domain)))];

  const filtered = STARTUPS.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.domain.toLowerCase().includes(search.toLowerCase()) || s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === "All" || s.domain === filter;
    return matchSearch && matchFilter;
  });

  return (
    <PageContainer
      title="Startup Directory"
      description="Explore all incubated startups — filter by domain, technology, and engagement type to find the right partner."
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {domains.map((d) => (
              <button
                key={d}
                onClick={() => setFilter(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === d ? "bg-brand text-white border-brand" : "bg-white text-muted-ink border-line hover:border-brand/40 hover:text-brand"}`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-ink" />
            <input
              type="text"
              placeholder="Search startups, tech, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-52"
            />
          </div>
        </div>

        <p className="text-xs text-muted-ink">{filtered.length} startups found</p>

        {/* Startup Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((startup) => (
            <Card key={startup.id} interactive className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="size-10 rounded-lg bg-brand/10 flex items-center justify-center text-xs font-black text-brand shrink-0">
                  {startup.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-ink">{startup.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded border border-line bg-canvas text-muted-ink">{startup.stage}</span>
                    <span className="text-[11px] text-muted-ink">{startup.domain}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-black text-brand">{startup.match}%</p>
                  <p className="text-[10px] text-muted-ink">match</p>
                </div>
              </div>

              <p className="text-xs text-muted-ink italic mb-3">{startup.tagline}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-ink mb-3">
                <span className="flex items-center gap-1"><MapPin className="size-3" /> {startup.location}</span>
                <span className="flex items-center gap-1"><Users className="size-3" /> {startup.team} people</span>
                <span className="flex items-center gap-1"><TrendingUp className="size-3" /> {startup.traction}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {startup.tags.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-cyan-soft text-brand-cyan-ink border border-brand-cyan/20">{tag}</span>
                ))}
              </div>

              <div className="pt-3 border-t border-line">
                <p className="text-[11px] font-bold text-ink mb-1.5">Open to:</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {startup.openTo.map((o) => (
                    <span key={o} className="px-2 py-0.5 text-[10px] font-semibold rounded-full border border-brand/20 bg-brand/5 text-brand">{o}</span>
                  ))}
                </div>
                <button className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
                  <ExternalLink className="size-3.5" /> View Full Profile
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
