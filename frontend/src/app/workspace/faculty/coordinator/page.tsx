"use client";

import { useState, useMemo, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Card, StatusBadge, ProgressBar } from "@/components/shared/Surface";
import { toast } from "sonner";
import {
  INITIAL_PROJECTS,
  INITIAL_MENTOR_REQUESTS,
  INITIAL_MEETINGS,
  INITIAL_TASKS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  IncubationProject,
  MentorAllocationRequest,
  FacultyMeeting,
  FacultyTask,
  FacultyNotification,
  AuditHistoryItem,
  fetchFacultyOverview,
  decideMentorAllocation,
  createFacultyMeeting,
  broadcastFacultyAnnouncement,
} from "@/services/facultyDataService";
import {
  ShieldCheck,
  FolderGit2,
  Users2,
  CalendarDays,
  CheckSquare,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Megaphone,
  Briefcase,
  Layers,
  ChevronRight,
  X,
  FileCheck2,
  Building2,
  Calendar,
  Lock,
  ArrowRight
} from "lucide-react";

export default function FacultyCoordinatorPage() {
  const [projects, setProjects] = useState<IncubationProject[]>(INITIAL_PROJECTS);
  const [mentorRequests, setMentorRequests] = useState<MentorAllocationRequest[]>(INITIAL_MENTOR_REQUESTS);
  const [meetings, setMeetings] = useState<FacultyMeeting[]>(INITIAL_MEETINGS);
  const [tasks, setTasks] = useState<FacultyTask[]>(INITIAL_TASKS);
  const [auditLogs, setAuditLogs] = useState<AuditHistoryItem[]>(INITIAL_AUDIT_LOGS);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<"governance" | "mentors" | "volunteers" | "reviews" | "audit">("governance");

  // Modals
  const [selectedProject, setSelectedProject] = useState<IncubationProject | null>(null);
  const [decisionModalItem, setDecisionModalItem] = useState<MentorAllocationRequest | null>(null);
  const [decisionType, setDecisionType] = useState<"approve" | "reject">("approve");
  const [decisionComment, setDecisionComment] = useState("");
  const [assignedMentorName, setAssignedMentorName] = useState("");
  const [aiMatchingLoading, setAiMatchingLoading] = useState(false);
  const [aiMentorRecommendations, setAiMentorRecommendations] = useState<any[]>([]);

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState("Official Stage Milestone Review");
  const [scheduleProjectId, setScheduleProjectId] = useState(projects[0]?.id || "proj-1");
  const [scheduleDate, setScheduleDate] = useState("2026-10-25");
  const [scheduleTime, setScheduleTime] = useState("14:30");
  const [scheduleAgenda, setScheduleAgenda] = useState("Evaluate TRL prototype progression against DST benchmark metrics.");

  // Volunteer Roster
  const [volunteers, setVolunteers] = useState([
    {
      id: "fac-vol-1",
      name: "Prof. Ananya Sen",
      dept: "Computer Science & AI",
      activeProjects: 3,
      specialization: "Applied ML, AgriTech, Edge Vision",
      workloadStatus: "Optimal",
    },
    {
      id: "fac-vol-2",
      name: "Prof. Rajiv Menon",
      dept: "Electronics & Embedded Systems",
      activeProjects: 1,
      specialization: "IoT Sensor Fusion, Firmware, Water Quality",
      workloadStatus: "Available",
    },
    {
      id: "fac-vol-3",
      name: "Dr. Sandeep Kulkarni",
      dept: "Mechanical & Materials Tech",
      activeProjects: 2,
      specialization: "Biopolymers, Finite Element Analysis",
      workloadStatus: "Optimal",
    },
  ]);

  // Load live data from Express backend & MongoDB on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await fetchFacultyOverview();
        if (!isMounted) return;
        if (res.projects && res.projects.length > 0) setProjects(res.projects);
        if (res.mentorRequests && res.mentorRequests.length > 0) setMentorRequests(res.mentorRequests);
        if (res.meetings && res.meetings.length > 0) setMeetings(res.meetings);
        if (res.tasks && res.tasks.length > 0) setTasks(res.tasks);
      } catch (err) {
        console.warn("[Coordinator] Backend fetch notice:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Metrics
  const metrics = useMemo(() => {
    const pendingDecisions = mentorRequests.filter((r) => r.status === "recommended" || r.status === "under_review" || r.status === "requested").length;
    const atRiskProjects = projects.filter((p) => p.health === "At Risk").length;
    const upcomingReviews = meetings.filter((m) => m.invitationStatus !== "Completed").length;
    return {
      governedProjects: projects.length,
      pendingDecisions,
      atRiskProjects,
      upcomingReviews,
      activeVolunteers: volunteers.length,
    };
  }, [projects, mentorRequests, meetings, volunteers]);

  // Mentor Decision Process (Persists to MongoDB)
  const handleFinalizeDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModalItem) return;

    const isApproval = decisionType === "approve";
    const newStatus = isApproval ? "approved" : "rejected";
    const assigned = assignedMentorName.trim() || decisionModalItem.recommendedMentorName || "Assigned Industry Lead";

    setMentorRequests((prev) =>
      prev.map((req) =>
        req.id === decisionModalItem.id
          ? {
              ...req,
              status: newStatus,
              coordinatorComment: decisionComment.trim(),
              allocatedMentorName: isApproval ? assigned : undefined,
              updatedAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            }
          : req
      )
    );

    if (isApproval) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === decisionModalItem.projectId
            ? { ...p, allocatedMentorName: assigned }
            : p
        )
      );
    }

    const log: AuditHistoryItem = {
      id: `aud-${Date.now()}`,
      actor: "Dr. K. R. Raman",
      role: "coordinator",
      action: isApproval ? "AUTHORIZE_MENTOR" : "REJECT_MENTOR",
      target: `Project #${decisionModalItem.projectId}`,
      timestamp: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} IST`,
      details: `${isApproval ? "Formally authorized mentor" : "Rejected request"}: ${decisionComment || "No comment"}`,
    };
    setAuditLogs([log, ...auditLogs]);

    // Persist to MongoDB backend
    await decideMentorAllocation(
      decisionModalItem.id,
      newStatus,
      decisionComment.trim(),
      isApproval ? assigned : undefined
    );

    toast.success(isApproval ? "Mentor Allocation Authorized" : "Mentor Request Rejected", {
      description: `Saved to MongoDB database for '${decisionModalItem.projectTitle}'.`,
    });

    setDecisionModalItem(null);
    setDecisionComment("");
    setAssignedMentorName("");
  };

  // Schedule Review Meeting (Persists to MongoDB)
  const handleScheduleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === scheduleProjectId);

    const newMeeting: FacultyMeeting = {
      id: `meet-${Date.now()}`,
      title: scheduleTitle,
      projectId: scheduleProjectId,
      projectTitle: proj?.title || "Incubation Project",
      participants: ["Dr. K. R. Raman (Coordinator)", proj?.assignedVolunteerName || "Volunteer", proj?.leadStudent || "Student"],
      date: scheduleDate,
      startTime: scheduleTime,
      durationMinutes: 45,
      timeZone: "IST (UTC+5:30)",
      meetingType: "Milestone Review",
      agenda: scheduleAgenda,
      meetingProvider: "In-Person (DBITIC Lab 402)",
      meetingLinkOrLocation: "DBIT Incubation Centre, Lab 402",
      invitationStatus: "Sent",
    };

    setMeetings([newMeeting, ...meetings]);

    // Persist to MongoDB backend
    await createFacultyMeeting(newMeeting);

    toast.success("Milestone Review Scheduled", {
      description: `Saved to MongoDB & calendar invite queued for ${scheduleDate} at ${scheduleTime}.`,
    });
    setShowScheduleModal(false);
  };

  // Publish Announcement (Persists to MongoDB)
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim()) return;

    await broadcastFacultyAnnouncement(announcementTitle.trim(), announcementBody.trim(), "all");

    toast.success("Incubation Announcement Published", {
      description: `Broadcasted to MongoDB and visible across all cohorts.`,
    });
    setShowAnnouncementModal(false);
    setAnnouncementTitle("");
    setAnnouncementBody("");
  };

  return (
    <PageContainer
      title="Faculty Coordinator Control Center"
      description="Executive governance, mentor allocation authorizations, volunteer assignments, and cohort milestone compliance for DBIT Incubation Centre."
    >
      <div className="space-y-6">
        {/* Coordinator Identity Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-deep via-brand to-brand/90 text-white shadow-sm border border-brand/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-7 text-brand-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-blue-200 font-bold">
                  Authorized Governance Authority
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 uppercase">
                  Faculty Coordinator
                </span>
              </div>
              <h1 className="text-xl font-bold text-white mt-0.5">Dr. K. R. Raman</h1>
              <p className="text-xs text-blue-100/80">
                Institutional Lead · Don Bosco Institute of Technology Incubation Centre (DBIT)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all"
            >
              <Megaphone className="size-3.5" /> Publish Announcement
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-brand-deep text-xs font-bold transition-all shadow-xs"
            >
              <CalendarDays className="size-3.5" /> Schedule Review
            </button>
          </div>
        </div>

        {/* Governance KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {[
            { label: "Supervised Projects", val: metrics.governedProjects, sub: "Active Cohort", icon: FolderGit2, color: "bg-brand/10 text-brand" },
            { label: "Pending Decisions", val: metrics.pendingDecisions, sub: "Mentor Requests", icon: Sparkles, color: "bg-amber-50 text-amber-700" },
            { label: "At Risk Cohort", val: metrics.atRiskProjects, sub: "Overdue Milestones", icon: AlertTriangle, color: "bg-red-50 text-danger" },
            { label: "Scheduled Reviews", val: metrics.upcomingReviews, sub: "Next 30 Days", icon: CalendarDays, color: "bg-indigo-50 text-indigo-700" },
            { label: "Active Volunteers", val: metrics.activeVolunteers, sub: "Supervising Faculty", icon: Users2, color: "bg-emerald-50 text-emerald-700" },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-3.5 border border-line bg-white shadow-2xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-ink">{kpi.label}</p>
                  <p className="text-2xl font-black text-ink mt-1 tracking-tight">{kpi.val}</p>
                  <p className="text-[10px] text-muted-ink mt-0.5">{kpi.sub}</p>
                </div>
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <kpi.icon className="size-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-line overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "governance", label: "Cohort Portfolio", icon: FolderGit2, count: projects.length },
            { id: "mentors", label: "Mentor Approvals Queue", icon: Sparkles, count: metrics.pendingDecisions },
            { id: "volunteers", label: "Volunteer Workload & Assignments", icon: Users2, count: volunteers.length },
            { id: "reviews", label: "Scheduled Reviews", icon: CalendarDays, count: meetings.length },
            { id: "audit", label: "Audit & Governance Trail", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? "border-brand text-brand bg-brand/5 shadow-2xs"
                    : "border-transparent text-muted-ink hover:text-ink hover:bg-canvas"
                }`}
              >
                <Icon className={`size-4 ${isActive ? "text-brand" : "text-muted-ink"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? "bg-brand text-white" : "bg-line text-muted-ink"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: COHORT PORTFOLIO & RISK OVERSIGHT */}
        {activeTab === "governance" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-line">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-ink" />
                <input
                  type="text"
                  placeholder="Search project, lead student, domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 w-64 bg-canvas/30"
                />
              </div>

              <div className="flex items-center gap-2">
                {["All", "On Track", "Needs Attention", "At Risk"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                      statusFilter === st
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-muted-ink border-line hover:border-brand/40"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects
                .filter((p) => {
                  const q = searchQuery.toLowerCase();
                  const matchQ = p.title.toLowerCase().includes(q) || p.leadStudent.toLowerCase().includes(q) || p.domain.toLowerCase().includes(q);
                  const matchStatus = statusFilter === "All" || p.health === statusFilter;
                  return matchQ && matchStatus;
                })
                .map((proj) => (
                  <Card
                    key={proj.id}
                    interactive
                    onClick={() => setSelectedProject(proj)}
                    className="p-5 border border-line hover:border-brand/40 transition-all flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-canvas border border-line text-ink uppercase">
                            {proj.domain}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              proj.health === "On Track"
                                ? "bg-emerald-50 text-emerald-700"
                                : proj.health === "Needs Attention"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-danger"
                            }`}
                          >
                            {proj.health}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-muted-ink">{proj.stage}</span>
                      </div>

                      <h3 className="text-sm font-bold text-ink leading-snug">{proj.title}</h3>
                      <p className="text-xs text-muted-ink mt-1.5 line-clamp-2 leading-relaxed">{proj.description}</p>

                      <div className="mt-3.5 p-3 rounded-lg bg-canvas/40 border border-line text-xs space-y-1.5">
                        <div className="flex justify-between text-muted-ink">
                          <span>Student Lead:</span>
                          <strong className="text-ink">{proj.leadStudent} ({proj.rollNumber})</strong>
                        </div>
                        <div className="flex justify-between text-muted-ink">
                          <span>Assigned Volunteer:</span>
                          <strong className="text-brand">{proj.assignedVolunteerName || "Unassigned"}</strong>
                        </div>
                        <div className="flex justify-between text-muted-ink">
                          <span>Allocated Mentor:</span>
                          <strong className="text-emerald-700">{proj.allocatedMentorName || "Pending Allocation"}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                      <div className="w-2/3">
                        <ProgressBar value={proj.progress} label={`${proj.progress}% Progression`} />
                      </div>
                      <span className="text-xs font-bold text-brand flex items-center gap-1">
                        Dossier <ChevronRight className="size-3.5" />
                      </span>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* TAB 2: MENTOR DECISION QUEUE */}
        {activeTab === "mentors" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <ShieldCheck className="size-4.5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Official Governance Authorization Gate</p>
                <p className="text-amber-900/80 mt-0.5">
                  Only the Faculty Coordinator possesses legal and institutional authority to issue appointment letters
                  and finalize mentor allocations for student startups.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {mentorRequests.map((req) => (
                <Card key={req.id} className="p-5 border border-line">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <StatusBadge
                          label={req.status.replace("_", " ")}
                          tone={
                            req.status === "approved" || req.status === "allocated"
                              ? "success"
                              : req.status === "rejected"
                              ? "danger"
                              : "attention"
                          }
                        />
                        <span className="text-xs font-bold text-ink">{req.projectTitle}</span>
                        <span className="text-[11px] text-muted-ink">
                          by {req.studentName} ({req.studentRollNo}) · {req.createdAt}
                        </span>
                      </div>

                      <p className="text-xs text-muted-ink leading-relaxed mb-2.5">
                        <strong className="text-ink">Justification:</strong> {req.justification}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-[11px] font-semibold text-muted-ink">Requested Domains:</span>
                        {req.requestedExpertise.map((exp) => (
                          <span key={exp} className="px-2 py-0.5 rounded text-[10px] font-bold bg-canvas border border-line text-ink">
                            {exp}
                          </span>
                        ))}
                      </div>

                      {req.recommendedMentorName && (
                        <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-950 mt-2">
                          <p className="font-bold flex items-center gap-1.5">
                            <Sparkles className="size-3.5 text-emerald-600" />
                            Nominated Mentor: {req.recommendedMentorName} ({req.recommendedMentorOrg || "Industry Lead"})
                          </p>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Nominated by Volunteer: <strong>{req.recommendedByVolunteerName}</strong>
                          </p>
                        </div>
                      )}

                      {req.coordinatorComment && (
                        <div className="mt-2 text-xs text-muted-ink bg-canvas p-2.5 rounded-lg border border-line">
                          <strong>Recorded Coordinator Note:</strong> {req.coordinatorComment}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-line">
                      {req.status !== "approved" && req.status !== "allocated" && req.status !== "rejected" ? (
                        <>
                          <button
                            onClick={() => {
                              setDecisionModalItem(req);
                              setDecisionType("approve");
                              setAssignedMentorName(req.recommendedMentorName || "");
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
                          >
                            Authorize Mentor
                          </button>
                          <button
                            onClick={() => {
                              setDecisionModalItem(req);
                              setDecisionType("reject");
                            }}
                            className="px-3.5 py-1.5 rounded-lg border border-red-200 text-danger hover:bg-red-50 text-xs font-bold transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                          Decision Finalized
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: VOLUNTEER WORKLOAD & ASSIGNMENTS */}
        {activeTab === "volunteers" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">Supervising Faculty Volunteers</h3>
                <p className="text-xs text-muted-ink">Monitor faculty workload, advisory domains, and team allocations</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {volunteers.map((v) => (
                <Card key={v.id} className="p-4 border border-line text-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-ink">{v.name}</h4>
                      <p className="text-muted-ink">{v.dept}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand/10 text-brand">
                      {v.activeProjects} Teams
                    </span>
                  </div>

                  <p className="text-muted-ink bg-canvas/40 p-2.5 rounded-lg border border-line">
                    <strong className="text-ink">Specialization:</strong> {v.specialization}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-line text-[11px] text-muted-ink">
                    <span>Workload: <strong className="text-emerald-700">{v.workloadStatus}</strong></span>
                    <button
                      onClick={() => toast.info(`Reassignment dialog ready for ${v.name}.`)}
                      className="text-brand font-bold hover:underline"
                    >
                      Reassign
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SCHEDULED REVIEWS */}
        {activeTab === "reviews" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">Official Project Reviews</h3>
                <p className="text-xs text-muted-ink">Convened by Faculty Coordinator for milestone validation</p>
              </div>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors"
              >
                <Plus className="size-3.5" /> Schedule Review
              </button>
            </div>

            <div className="space-y-3">
              {meetings.map((m) => (
                <Card key={m.id} className="p-4 border border-line text-xs">
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <span className="font-bold text-ink text-sm">{m.title}</span>
                      <p className="text-muted-ink mt-0.5">{m.projectTitle}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand/10 text-brand">
                      {m.meetingType}
                    </span>
                  </div>
                  <p className="text-ink mt-2 bg-canvas/40 p-2.5 rounded-lg border border-line">
                    <strong>Agenda:</strong> {m.agenda}
                  </p>
                  <div className="flex items-center justify-between mt-3 text-muted-ink text-[11px]">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-brand" /> {m.date} · {m.startTime} ({m.durationMinutes}m)
                    </span>
                    <span className="font-medium text-ink">{m.meetingProvider}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-ink mb-1">Incubation Governance Audit Trail</h3>
              <p className="text-xs text-muted-ink mb-4">Immutable log of approvals, nominations, and allocations</p>
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="text-xs border-l-2 border-brand pl-3 py-1">
                    <p className="font-bold text-ink leading-snug">{log.details}</p>
                    <p className="text-[11px] text-muted-ink mt-0.5">
                      Actor: <strong className="text-ink">{log.actor}</strong> ({log.role.toUpperCase()}) · {log.timestamp}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* MODAL: MENTOR AUTHORIZATION DIALOG */}
        {decisionModalItem && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setDecisionModalItem(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand" />
                  {decisionType === "approve" ? "Authorize Mentor Allocation" : "Reject Mentor Request"}
                </h3>
                <button onClick={() => setDecisionModalItem(null)}><X className="size-4 text-muted-ink" /></button>
              </div>

              <form onSubmit={handleFinalizeDecision} className="p-6 space-y-4 text-xs">
                <div>
                  <p className="text-muted-ink">Project:</p>
                  <p className="font-bold text-ink text-sm">{decisionModalItem.projectTitle}</p>
                </div>

                {decisionType === "approve" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-ink">Official Allocated Mentor Name *</label>
                      <button
                        type="button"
                        disabled={aiMatchingLoading}
                        onClick={async () => {
                          setAiMatchingLoading(true);
                          try {
                            const res = await fetch("/api/agents/mentor-match", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                domain: decisionModalItem.domain || "AgriTech / ML",
                                requestedExpertise: decisionModalItem.requestedExpertise || [],
                                challenges: decisionModalItem.justification || "",
                              }),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setAiMentorRecommendations(data.recommendations || []);
                              toast.success("AI Mentor-Matching recommendations generated.");
                            }
                          } catch {
                            toast.error("Failed to fetch mentor recommendations.");
                          } finally {
                            setAiMatchingLoading(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-brand bg-brand/10 hover:bg-brand/20 rounded-md transition-colors"
                      >
                        <Sparkles className="size-3" />
                        {aiMatchingLoading ? "Analyzing..." : "Get AI Recommendations"}
                      </button>
                    </div>

                    {aiMentorRecommendations.length > 0 && (
                      <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 space-y-2">
                        <span className="text-[11px] font-bold text-indigo-900 block">AI Recommended Candidates:</span>
                        <div className="space-y-1.5">
                          {aiMentorRecommendations.map((m: any) => (
                            <div
                              key={m.id}
                              onClick={() => setAssignedMentorName(`${m.name} (${m.role})`)}
                              className="p-2 bg-white rounded border border-indigo-100/70 hover:border-brand cursor-pointer flex items-center justify-between transition-all"
                            >
                              <div>
                                <strong className="text-slate-900 block text-[11px]">{m.name} <span className="text-slate-500 font-normal">· {m.affiliation}</span></strong>
                                <span className="text-[10px] text-slate-500">{m.match_reasons?.[0]}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  {m.match_score}% Match
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <input
                      type="text"
                      required
                      value={assignedMentorName}
                      onChange={(e) => setAssignedMentorName(e.target.value)}
                      placeholder="e.g. Dr. Vikram Malhotra (VP Tech)"
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-ink mb-1.5">Coordinator Governance Note / Conditions *</label>
                  <textarea
                    rows={3}
                    required
                    value={decisionComment}
                    onChange={(e) => setDecisionComment(e.target.value)}
                    placeholder="Enter approval conditions, NDA requirements, or justification..."
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button type="button" onClick={() => setDecisionModalItem(null)} className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas">Cancel</button>
                  <button type="submit" className={`px-4 py-2 font-bold text-white rounded-lg transition-colors ${decisionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-danger hover:bg-red-700"}`}>
                    {decisionType === "approve" ? "Authorize Allocation" : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: SCHEDULE REVIEW */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowScheduleModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <CalendarDays className="size-4 text-brand" /> Schedule Official Milestone Review
                </h3>
                <button onClick={() => setShowScheduleModal(false)}><X className="size-4 text-muted-ink" /></button>
              </div>

              <form onSubmit={handleScheduleReview} className="p-6 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-ink mb-1">Review Meeting Title *</label>
                  <input type="text" required value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} className="w-full px-3 py-2 border border-line rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Target Project *</label>
                  <select value={scheduleProjectId} onChange={(e) => setScheduleProjectId(e.target.value)} className="w-full px-3 py-2 border border-line rounded-lg bg-white">
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} ({p.leadStudent})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-ink mb-1">Date *</label>
                    <input type="date" required value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full px-3 py-2 border border-line rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block font-bold text-ink mb-1">Time (IST) *</label>
                    <input type="time" required value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full px-3 py-2 border border-line rounded-lg bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Review Agenda *</label>
                  <textarea rows={2} required value={scheduleAgenda} onChange={(e) => setScheduleAgenda(e.target.value)} className="w-full px-3 py-2 border border-line rounded-lg resize-none bg-white" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button type="button" onClick={() => setShowScheduleModal(false)} className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 font-bold bg-brand text-white rounded-lg hover:bg-brand-hover">Dispatch Invites</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: BROADCAST ANNOUNCEMENT */}
        {showAnnouncementModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowAnnouncementModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Megaphone className="size-4 text-brand" /> Publish Cohort Announcement
                </h3>
                <button onClick={() => setShowAnnouncementModal(false)}><X className="size-4 text-muted-ink" /></button>
              </div>

              <form onSubmit={handleBroadcastAnnouncement} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-ink mb-1">Announcement Title *</label>
                  <input type="text" required value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="e.g. DST NIDHI Grant Window Open" className="w-full px-3 py-2 border border-line rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Content / Instructions *</label>
                  <textarea rows={4} required value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} placeholder="Provide instructions for all student founders..." className="w-full px-3 py-2 border border-line rounded-lg resize-none bg-white" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button type="button" onClick={() => setShowAnnouncementModal(false)} className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 font-bold bg-brand text-white rounded-lg hover:bg-brand-hover">Broadcast</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PROJECT DOSSIER MODAL */}
        {selectedProject && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setSelectedProject(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-line overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-line flex items-start justify-between bg-canvas/30">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand/10 text-brand uppercase">{selectedProject.domain}</span>
                  <h2 className="text-base font-bold text-ink mt-1">{selectedProject.title}</h2>
                </div>
                <button onClick={() => setSelectedProject(null)}><X className="size-5 text-muted-ink" /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 text-xs text-ink">
                <p className="text-muted-ink bg-canvas/40 p-3 rounded-xl border border-line leading-relaxed">{selectedProject.description}</p>
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-canvas border border-line">
                  <div><span className="text-muted-ink block text-[11px]">Lead Student</span><strong className="text-ink">{selectedProject.leadStudent} ({selectedProject.rollNumber})</strong></div>
                  <div><span className="text-muted-ink block text-[11px]">Assigned Volunteer</span><strong className="text-brand">{selectedProject.assignedVolunteerName || "Unassigned"}</strong></div>
                  <div><span className="text-muted-ink block text-[11px]">Allocated Mentor</span><strong className="text-emerald-700">{selectedProject.allocatedMentorName || "Pending Allocation"}</strong></div>
                  <div><span className="text-muted-ink block text-[11px]">Next Milestone</span><strong className="text-ink">{selectedProject.nextMilestone} ({selectedProject.nextMilestoneDate})</strong></div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-line bg-canvas/40 flex justify-end">
                <button onClick={() => setSelectedProject(null)} className="px-4 py-2 text-xs font-bold text-muted-ink border border-line rounded-lg">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
