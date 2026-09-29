"use client";

import { useState } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, SectionHeading, StatusBadge } from "@/components/shared/Surface";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Award,
  Edit2,
  Save,
  X,
  Plus,
  MapPin,
  Globe,
  Link,
  Star,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";

const PROFILE_DATA = {
  name: "Dr. Anjali Krishnan",
  title: "Mentor — AgriTech & Deep Tech",
  avatar: "AK",
  email: "anjali.krishnan@incubation.edu",
  phone: "+91 98765 43210",
  location: "Bengaluru, Karnataka",
  linkedin: "linkedin.com/in/anjalikrishnan",
  website: "anjalikrishnan.in",
  bio: "Seasoned entrepreneur and investor with 18+ years of experience in AgriTech and Deep Tech. Founded 2 successful startups (1 acquired), invested in 14 early-stage companies, and mentored 60+ student entrepreneurs across IIT, NIT, and state-level incubation programs.",
  expertise: ["AgriTech", "IoT & Hardware", "Fundraising Strategy", "Product-Market Fit", "Go-to-Market", "IP Strategy", "B2B SaaS", "Deep Tech"],
  education: [
    { degree: "Ph.D., Agricultural Engineering", institution: "IISc Bangalore", year: "2006" },
    { degree: "B.Tech, Electronics Engineering", institution: "NITK Surathkal", year: "2001" },
  ],
  experience: [
    { role: "Co-Founder & CEO", org: "AgroSense Technologies (Acquired)", period: "2008–2016" },
    { role: "Partner", org: "Bharat Seed Fund", period: "2016–2021" },
    { role: "Independent Mentor & Advisor", org: "Various Incubation Programs", period: "2021–Present" },
  ],
  stats: {
    totalMentees: 62,
    activeMentees: 4,
    sessionsCompleted: 340,
    avgRating: 4.8,
    yearsExperience: 18,
  },
  availability: {
    daysAvailable: ["Monday", "Wednesday", "Friday"],
    timeSlot: "10:00 AM – 1:00 PM IST",
    sessionFormat: ["Video Call", "In-person (Bengaluru)"],
    maxMenteesPerCohort: 6,
  },
};

export default function MentorProfilePage() {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(PROFILE_DATA.bio);
  const [expertise, setExpertise] = useState(PROFILE_DATA.expertise);
  const [newTag, setNewTag] = useState("");

  function addTag() {
    if (newTag.trim() && !expertise.includes(newTag.trim())) {
      setExpertise((prev) => [...prev, newTag.trim()]);
      setNewTag("");
    }
  }

  function removeTag(tag: string) {
    setExpertise((prev) => prev.filter((t) => t !== tag));
  }

  return (
    <PageContainer
      title="My Profile"
      description="Your public mentor profile — visible to students, incubation management, and partner institutions."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Profile Header Card */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            {/* Avatar */}
            <div className="size-20 rounded-2xl bg-brand flex items-center justify-center text-2xl font-bold text-white shrink-0">
              {PROFILE_DATA.avatar}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-ink">{PROFILE_DATA.name}</h2>
                  <p className="text-sm text-brand font-semibold">{PROFILE_DATA.title}</p>
                  <p className="text-xs text-muted-ink mt-0.5 flex items-center gap-1"><MapPin className="size-3" /> {PROFILE_DATA.location}</p>
                </div>
                <button
                  onClick={() => setEditing(!editing)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${editing ? "bg-canvas border border-line text-muted-ink" : "bg-brand text-white hover:bg-brand-hover"}`}
                >
                  {editing ? <><X className="size-3.5" /> Cancel</> : <><Edit2 className="size-3.5" /> Edit</>}
                </button>
              </div>

              {/* Contact */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-muted-ink">
                <a href={`mailto:${PROFILE_DATA.email}`} className="flex items-center gap-1 hover:text-brand transition-colors"><Mail className="size-3" /> {PROFILE_DATA.email}</a>
                <span className="flex items-center gap-1"><Phone className="size-3" /> {PROFILE_DATA.phone}</span>
                <a href="#" className="flex items-center gap-1 hover:text-brand transition-colors"><Link className="size-3" /> {PROFILE_DATA.linkedin}</a>
                <a href="#" className="flex items-center gap-1 hover:text-brand transition-colors"><Globe className="size-3" /> {PROFILE_DATA.website}</a>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-line">
            {[
              { label: "Total Mentees", value: PROFILE_DATA.stats.totalMentees },
              { label: "Active Now", value: PROFILE_DATA.stats.activeMentees },
              { label: "Sessions Done", value: PROFILE_DATA.stats.sessionsCompleted },
              { label: "Avg Rating", value: `${PROFILE_DATA.stats.avgRating}/5 ⭐` },
              { label: "Years Exp.", value: PROFILE_DATA.stats.yearsExperience },
            ].map((s) => (
              <div key={s.label} className="text-center p-2 rounded-lg bg-canvas border border-line">
                <p className="text-lg font-bold text-ink">{s.value}</p>
                <p className="text-[10px] text-muted-ink uppercase font-semibold tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Bio */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><User className="size-4 text-brand" /> About Me</h3>
          {editing ? (
            <textarea
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
            />
          ) : (
            <p className="text-sm text-muted-ink leading-relaxed">{bio}</p>
          )}
        </Card>

        {/* Expertise Tags */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><Award className="size-4 text-brand-gold" /> Areas of Expertise</h3>
          <div className="flex flex-wrap gap-2">
            {expertise.map((tag) => (
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
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tag..."
                  className="px-2 py-1 text-xs border border-dashed border-brand/40 rounded-full focus:outline-none focus:ring-1 focus:ring-brand/30 w-24"
                />
                <button onClick={addTag} className="size-6 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-hover transition-colors">
                  <Plus className="size-3" />
                </button>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Education */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink mb-3">Education</h3>
            <div className="space-y-3">
              {PROFILE_DATA.education.map((edu) => (
                <div key={edu.degree} className="p-3 rounded-lg bg-canvas border border-line">
                  <p className="text-xs font-bold text-ink">{edu.degree}</p>
                  <p className="text-[11px] text-muted-ink mt-0.5">{edu.institution} · {edu.year}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Experience */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink mb-3">Experience</h3>
            <div className="space-y-3">
              {PROFILE_DATA.experience.map((exp) => (
                <div key={exp.role} className="p-3 rounded-lg bg-canvas border border-line">
                  <p className="text-xs font-bold text-ink">{exp.role}</p>
                  <p className="text-[11px] text-muted-ink mt-0.5">{exp.org}</p>
                  <p className="text-[10px] text-muted-ink mt-0.5">{exp.period}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Availability */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><Clock className="size-4 text-brand-cyan" /> Availability & Session Preferences</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-canvas border border-line">
              <p className="text-[10px] text-muted-ink uppercase font-semibold tracking-wider">Days Available</p>
              <p className="text-xs font-semibold text-ink mt-1">{PROFILE_DATA.availability.daysAvailable.join(", ")}</p>
            </div>
            <div className="p-3 rounded-lg bg-canvas border border-line">
              <p className="text-[10px] text-muted-ink uppercase font-semibold tracking-wider">Time Slot</p>
              <p className="text-xs font-semibold text-ink mt-1">{PROFILE_DATA.availability.timeSlot}</p>
            </div>
            <div className="p-3 rounded-lg bg-canvas border border-line">
              <p className="text-[10px] text-muted-ink uppercase font-semibold tracking-wider">Formats</p>
              <p className="text-xs font-semibold text-ink mt-1">{PROFILE_DATA.availability.sessionFormat.join(", ")}</p>
            </div>
            <div className="p-3 rounded-lg bg-canvas border border-line">
              <p className="text-[10px] text-muted-ink uppercase font-semibold tracking-wider">Max Mentees</p>
              <p className="text-xs font-semibold text-ink mt-1">{PROFILE_DATA.availability.maxMenteesPerCohort} per cohort</p>
            </div>
          </div>
        </Card>

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
