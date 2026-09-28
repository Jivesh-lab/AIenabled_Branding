"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  Link,
  MapPin,
  User,
  Edit2,
  Save,
  X,
  Plus,
  Target,
  Tag,
} from "lucide-react";

const PROFILE_DATA = {
  companyName: "Bharat Industrial Solutions Ltd.",
  shortName: "BISL",
  industry: "Heavy Manufacturing & Engineering",
  website: "www.bharatindustrial.com",
  linkedin: "linkedin.com/company/bharatindustrial",
  hq: "Pune, Maharashtra",
  founded: "1987",
  employees: "2,400+",
  revenue: "₹850Cr+",
  bio: "Bharat Industrial Solutions Ltd. is one of India's leading heavy manufacturing companies with presence across automotive components, construction equipment, and industrial automation. We actively partner with startups and innovation ecosystems to drive Industry 4.0 adoption across our 6 manufacturing plants.",
  pointsOfContact: [
    { name: "Rajendra Kulkarni", title: "Chief Innovation Officer", email: "r.kulkarni@bisl.in", phone: "+91 98200 11234" },
    { name: "Meena Joshi", title: "Head of Procurement", email: "m.joshi@bisl.in", phone: "+91 98200 56789" },
  ],
  engagementAreas: ["Industry 4.0 / Predictive Maintenance", "Supply Chain AI & Optimization", "Carbon Footprint / ESG Automation", "Worker Safety Technology", "Smart Energy Management"],
  openToEngagement: ["Pilot Partnerships", "Technology Integration (API/OEM)", "Data Sharing MOUs", "CSR-backed Innovation Projects"],
  plants: ["Pune (HQ)", "Nashik", "Aurangabad", "Bengaluru", "Coimbatore", "Vadodara"],
};

export default function IndustryPartnerProfilePage() {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(PROFILE_DATA.bio);
  const [tags, setTags] = useState(PROFILE_DATA.engagementAreas);
  const [newTag, setNewTag] = useState("");

  function addTag() {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags((prev) => [...prev, newTag.trim()]);
      setNewTag("");
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  return (
    <PageContainer
      title="Company Profile"
      description="Your organization's public profile — visible to incubated startups seeking industry partnerships."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Company Header Card */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            <div className="size-16 rounded-2xl bg-brand flex items-center justify-center text-xl font-bold text-white shrink-0">
              {PROFILE_DATA.shortName}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-ink">{PROFILE_DATA.companyName}</h2>
                  <p className="text-sm text-brand font-semibold">{PROFILE_DATA.industry}</p>
                  <p className="text-xs text-muted-ink mt-0.5 flex items-center gap-1"><MapPin className="size-3" /> {PROFILE_DATA.hq}</p>
                </div>
                <button
                  onClick={() => setEditing(!editing)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${editing ? "bg-canvas border border-line text-muted-ink" : "bg-brand text-white hover:bg-brand-hover"}`}
                >
                  {editing ? <><X className="size-3.5" /> Cancel</> : <><Edit2 className="size-3.5" /> Edit</>}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-muted-ink">
                <a href="#" className="flex items-center gap-1 hover:text-brand transition-colors"><Globe className="size-3" /> {PROFILE_DATA.website}</a>
                <a href="#" className="flex items-center gap-1 hover:text-brand transition-colors"><Link className="size-3" /> {PROFILE_DATA.linkedin}</a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-line">
            {[
              { label: "Founded", value: PROFILE_DATA.founded },
              { label: "Employees", value: PROFILE_DATA.employees },
              { label: "Revenue", value: PROFILE_DATA.revenue },
              { label: "Plants", value: PROFILE_DATA.plants.length.toString() },
            ].map((s) => (
              <div key={s.label} className="text-center p-2 rounded-lg bg-canvas border border-line">
                <p className="text-base font-bold text-ink">{s.value}</p>
                <p className="text-[10px] text-muted-ink uppercase font-semibold tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* About */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><Building2 className="size-4 text-brand" /> About the Organization</h3>
          {editing ? (
            <textarea rows={5} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
          ) : (
            <p className="text-sm text-muted-ink leading-relaxed">{bio}</p>
          )}
        </Card>

        {/* Engagement Areas */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><Target className="size-4 text-brand-cyan" /> Innovation Focus Areas</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${editing ? "bg-brand-cyan-soft border-brand-cyan/30 text-brand-cyan-ink" : "bg-brand/5 border-brand/20 text-brand"}`}>
                {tag}
                {editing && (
                  <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-danger transition-colors">
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}
            {editing && (
              <div className="flex items-center gap-1.5">
                <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="Add focus area..." className="px-2 py-1 text-xs border border-dashed border-brand/40 rounded-full focus:outline-none focus:ring-1 focus:ring-brand/30 w-32" />
                <button onClick={addTag} className="size-6 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-hover transition-colors"><Plus className="size-3" /></button>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Points of Contact */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink mb-3">Points of Contact</h3>
            <div className="space-y-3">
              {PROFILE_DATA.pointsOfContact.map((poc) => (
                <div key={poc.email} className="p-3 rounded-lg bg-canvas border border-line">
                  <p className="text-xs font-bold text-ink">{poc.name}</p>
                  <p className="text-[11px] text-muted-ink mt-0.5">{poc.title}</p>
                  <div className="mt-1.5 space-y-0.5">
                    <a href={`mailto:${poc.email}`} className="text-[11px] text-muted-ink flex items-center gap-1 hover:text-brand transition-colors"><Mail className="size-3" /> {poc.email}</a>
                    <p className="text-[11px] text-muted-ink flex items-center gap-1"><Phone className="size-3" /> {poc.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Plants & Engagement */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink mb-3">Manufacturing Locations</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {PROFILE_DATA.plants.map((plant) => (
                <span key={plant} className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-line bg-canvas text-muted-ink flex items-center gap-1">
                  <MapPin className="size-3 text-brand" /> {plant}
                </span>
              ))}
            </div>
            <h3 className="text-sm font-bold text-ink mb-3">Open to Engage Via</h3>
            <div className="flex flex-wrap gap-1.5">
              {PROFILE_DATA.openToEngagement.map((e) => (
                <span key={e} className="px-2 py-0.5 text-[11px] font-semibold rounded-full border border-brand/20 bg-brand/5 text-brand">{e}</span>
              ))}
            </div>
          </Card>
        </div>

        {editing && (
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-xs font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas transition-colors">Cancel</button>
            <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors">
              <Save className="size-3.5" /> Save Profile
            </button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
