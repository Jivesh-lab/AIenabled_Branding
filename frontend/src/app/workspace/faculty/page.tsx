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
  INITIAL_SUPPORT_REQUESTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  FacultySubRole,
  FacultyPermissions,
  IncubationProject,
  MentorAllocationRequest,
  FacultyMeeting,
  FacultyTask,
  StudentSupportRequest,
  FacultyNotification,
  AuditHistoryItem,
  fetchFacultyOverview,
  fetchSupportRequests,
  submitMentorAllocationRequest,
  decideMentorAllocation,
  createFacultyMeeting,
  respondSupportRequest,
  broadcastFacultyAnnouncement,
} from "@/services/facultyDataService";
import {
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
  FolderGit2,
  Users2,
  CalendarDays,
  CheckSquare,
  Bell,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  BookOpen,
  Send,
  Video,
  MapPin,
  Calendar,
  Lock,
  ArrowRight,
  HelpCircle,
  Megaphone,
  Briefcase,
  Layers,
  Award,
  ChevronRight,
  X,
  FileText
} from "lucide-react";

export default function FacultyManagementPage() {
  // Current active faculty persona
  const [activeRole, setActiveRole] = useState<FacultySubRole>("coordinator");
  const [activeTab, setActiveTab] = useState<
    "overview" | "coordinator" | "volunteer" | "projects" | "mentors" | "meetings" | "tasks" | "notifications"
  >("overview");

  // Local state for dynamic workflows
  const [projects, setProjects] = useState<IncubationProject[]>(INITIAL_PROJECTS);
  const [mentorRequests, setMentorRequests] = useState<MentorAllocationRequest[]>(INITIAL_MENTOR_REQUESTS);
  const [meetings, setMeetings] = useState<FacultyMeeting[]>(INITIAL_MEETINGS);
  const [tasks, setTasks] = useState<FacultyTask[]>(INITIAL_TASKS);
  const [supportRequests, setSupportRequests] = useState<StudentSupportRequest[]>(INITIAL_SUPPORT_REQUESTS);
  const [notifications, setNotifications] = useState<FacultyNotification[]>(INITIAL_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditHistoryItem[]>(INITIAL_AUDIT_LOGS);

  // Search & Filter state
  const [projectSearch, setProjectSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [mentorStatusFilter, setMentorStatusFilter] = useState("All");

  // Dialog & Detail Modals
  const [selectedProject, setSelectedProject] = useState<IncubationProject | null>(null);
  const [showNewMentorRequestModal, setShowNewMentorRequestModal] = useState(false);
  const [showMentorDecisionModal, setShowMentorDecisionModal] = useState<MentorAllocationRequest | null>(null);
  const [mentorDecisionType, setMentorDecisionType] = useState<"approve" | "reject">("approve");
  const [mentorDecisionComment, setMentorDecisionComment] = useState("");
  const [mentorAssignedName, setMentorAssignedName] = useState("");

  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showGuidanceModal, setShowGuidanceModal] = useState<StudentSupportRequest | null>(null);
  const [guidanceResponseText, setGuidanceResponseText] = useState("");

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");

  // Role toggle feedback
  const handleRoleChange = (role: FacultySubRole) => {
    setActiveRole(role);
    toast.info(`Switched to Faculty ${role === "coordinator" ? "Coordinator" : "Volunteer"} perspective`, {
      description: role === "coordinator" 
        ? "Authorized to approve mentor allocations, assign volunteers, and schedule official reviews."
        : "Focused on direct student project guidance, recommending mentors, and milestone check-ins.",
    });
  };

  // Load live data from Express backend & MongoDB on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [overviewRes, supportRes] = await Promise.all([
          fetchFacultyOverview(),
          fetchSupportRequests(),
        ]);
        if (!isMounted) return;
        if (overviewRes.projects && overviewRes.projects.length > 0) setProjects(overviewRes.projects);
        if (overviewRes.mentorRequests && overviewRes.mentorRequests.length > 0) setMentorRequests(overviewRes.mentorRequests);
        if (overviewRes.meetings && overviewRes.meetings.length > 0) setMeetings(overviewRes.meetings);
        if (overviewRes.tasks && overviewRes.tasks.length > 0) setTasks(overviewRes.tasks);
        if (supportRes && supportRes.length > 0) setSupportRequests(supportRes);
      } catch (err) {
        console.warn("[Faculty Hub] Backend fetch notice:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // KPI Metrics calculation
  // ---------------------------------------------------------------------------
  const metrics = useMemo(() => {
    const totalStudents = projects.reduce((acc, p) => acc + p.teamMembers.length, 0);
    const pendingMentorReqs = mentorRequests.filter((r) => r.status === "requested" || r.status === "recommended" || r.status === "under_review").length;
    const upcomingMeets = meetings.filter((m) => m.invitationStatus !== "Completed").length;
    const overdueMilestones = projects.reduce((acc, p) => acc + p.overdueMilestonesCount, 0);
    const pendingTasks = tasks.filter((t) => t.status !== "Completed").length;
    return {
      activeProjects: projects.length,
      totalStudents,
      pendingMentorReqs,
      upcomingMeets,
      overdueMilestones,
      pendingTasks,
    };
  }, [projects, mentorRequests, meetings, tasks]);

  // ---------------------------------------------------------------------------
  // Mentor Allocation Actions (Persists to MongoDB)
  // ---------------------------------------------------------------------------
  const handleProcessMentorDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMentorDecisionModal) return;

    if (!FacultyPermissions.canApproveMentorAllocation(activeRole)) {
      toast.error("Permission Denied", {
        description: "Only Faculty Coordinators possess authorization to finalize mentor approvals.",
      });
      return;
    }

    const isApproval = mentorDecisionType === "approve";
    const newStatus = isApproval ? "approved" : "rejected";
    const assigned = mentorAssignedName.trim() || showMentorDecisionModal.recommendedMentorName || "Assigned Industry Mentor";

    setMentorRequests((prev) =>
      prev.map((req) =>
        req.id === showMentorDecisionModal.id
          ? {
              ...req,
              status: newStatus,
              coordinatorComment: mentorDecisionComment,
              allocatedMentorName: isApproval ? assigned : undefined,
              updatedAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            }
          : req
      )
    );

    // If approved, update the underlying project record as well
    if (isApproval) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === showMentorDecisionModal.projectId
            ? {
                ...p,
                allocatedMentorName: assigned,
              }
            : p
        )
      );
    }

    // Log to audit history
    const newAudit: AuditHistoryItem = {
      id: `aud-${Date.now()}`,
      actor: activeRole === "coordinator" ? "Dr. K. R. Raman" : "Faculty User",
      role: activeRole,
      action: isApproval ? "APPROVE_MENTOR_ALLOCATION" : "REJECT_MENTOR_ALLOCATION",
      target: `Project #${showMentorDecisionModal.projectId}`,
      timestamp: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} IST`,
      details: `${isApproval ? "Approved" : "Rejected"} mentor request. Note: ${mentorDecisionComment || "None"}`,
    };
    setAuditLogs([newAudit, ...auditLogs]);

    // Persist to MongoDB backend
    await decideMentorAllocation(
      showMentorDecisionModal.id,
      newStatus,
      mentorDecisionComment,
      isApproval ? assigned : undefined
    );

    toast.success(isApproval ? "Mentor Allocation Approved" : "Mentor Request Rejected", {
      description: `Saved to MongoDB for '${showMentorDecisionModal.projectTitle}'.`,
    });

    setShowMentorDecisionModal(null);
    setMentorDecisionComment("");
    setMentorAssignedName("");
  };

  // Volunteer recommends a mentor (Persists to MongoDB)
  const handleVolunteerRecommendMentor = async (requestId: string, mentorName: string, org: string) => {
    setMentorRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              status: "recommended",
              recommendedMentorName: mentorName,
              recommendedMentorOrg: org,
              recommendedByVolunteerName: "Prof. Ananya Sen (Volunteer)",
              updatedAt: "Just now",
            }
          : req
      )
    );

    const targetReq = mentorRequests.find((r) => r.id === requestId);
    if (targetReq) {
      await submitMentorAllocationRequest({
        projectId: targetReq.projectId,
        justification: targetReq.justification,
        recommendedMentorName: mentorName,
        recommendedMentorOrg: org,
        recommendedByVolunteerName: "Prof. Ananya Sen",
      });
    }

    const newAudit: AuditHistoryItem = {
      id: `aud-${Date.now()}`,
      actor: "Prof. Ananya Sen",
      role: "volunteer",
      action: "RECOMMEND_MENTOR",
      target: `Request #${requestId}`,
      timestamp: "Just now",
      details: `Volunteer recommended mentor: ${mentorName} (${org})`,
    };
    setAuditLogs([newAudit, ...auditLogs]);

    toast.success("Mentor Recommendation Submitted", {
      description: "Saved to MongoDB & forwarded to Faculty Coordinator for official authorization.",
    });
  };

  // Student/Volunteer submits new mentor allocation request (Persists to MongoDB)
  const handleCreateMentorRequest = async (
    projectId: string,
    requestedExpertise: string[],
    justification: string,
    suggestedMentor?: string
  ) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;

    const newReq: MentorAllocationRequest = {
      id: `mr-${Date.now()}`,
      projectId: proj.id,
      projectTitle: proj.title,
      studentName: proj.leadStudent,
      studentRollNo: proj.rollNumber,
      domain: proj.domain,
      requestedExpertise,
      justification,
      recommendedMentorName: suggestedMentor,
      recommendedByVolunteerName: activeRole === "volunteer" ? "Prof. Ananya Sen" : undefined,
      status: suggestedMentor ? "recommended" : "requested",
      createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      updatedAt: "Just now",
    };

    setMentorRequests([newReq, ...mentorRequests]);

    // Persist to MongoDB backend
    await submitMentorAllocationRequest({
      projectId: proj.id,
      justification,
      requestedExpertise,
      recommendedMentorName: suggestedMentor,
      recommendedByVolunteerName: activeRole === "volunteer" ? "Prof. Ananya Sen" : undefined,
    });

    toast.success("Mentor Request Created", {
      description: `Saved to MongoDB for '${proj.title}'. Current status: ${newReq.status.replace("_", " ")}.`,
    });
    setShowNewMentorRequestModal(false);
  };

  // ---------------------------------------------------------------------------
  // Guidance & Support Actions (Persists to MongoDB)
  // ---------------------------------------------------------------------------
  const handleResolveGuidance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showGuidanceModal || !guidanceResponseText.trim()) return;

    setSupportRequests((prev) =>
      prev.map((sr) =>
        sr.id === showGuidanceModal.id
          ? {
              ...sr,
              status: "Resolved",
              volunteerResponse: guidanceResponseText.trim(),
            }
          : sr
      )
    );

    // Persist to MongoDB backend
    await respondSupportRequest(showGuidanceModal.id, guidanceResponseText.trim());

    toast.success("Guidance Logged Successfully", {
      description: `Saved to MongoDB database and dispatched to student ${showGuidanceModal.studentName}.`,
    });

    setShowGuidanceModal(null);
    setGuidanceResponseText("");
  };

  // ---------------------------------------------------------------------------
  // Announcement Action (Persists to MongoDB)
  // ---------------------------------------------------------------------------
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim()) return;

    if (!FacultyPermissions.canPublishAnnouncements(activeRole)) {
      toast.error("Unauthorized Action", {
        description: "Only Faculty Coordinators have permission to publish incubation broadcasts.",
      });
      return;
    }

    const newNotif: FacultyNotification = {
      id: `notif-${Date.now()}`,
      title: `Announcement: ${announcementTitle}`,
      message: announcementContent || "Official announcement from Faculty Coordinator.",
      timestamp: "Just now",
      category: "assignment",
      read: false,
      priority: "normal",
    };
    setNotifications([newNotif, ...notifications]);

    // Persist to MongoDB backend
    await broadcastFacultyAnnouncement(announcementTitle.trim(), announcementContent.trim(), "all");

    toast.success("Incubation Announcement Published", {
      description: `Stored in MongoDB and broadcasted to supervised cohorts.`,
    });

    setShowAnnouncementModal(false);
    setAnnouncementTitle("");
    setAnnouncementContent("");
  };

  // ---------------------------------------------------------------------------
  // Schedule Meeting Action (Persists to MongoDB)
  // ---------------------------------------------------------------------------
  const handleScheduleMeeting = async (
    title: string,
    projectId: string,
    date: string,
    startTime: string,
    type: FacultyMeeting["meetingType"],
    provider: FacultyMeeting["meetingProvider"],
    agenda: string
  ) => {
    const proj = projects.find((p) => p.id === projectId);
    const newMeet: FacultyMeeting = {
      id: `meet-${Date.now()}`,
      title,
      projectId,
      projectTitle: proj?.title || "Incubation Project",
      participants: [
        activeRole === "coordinator" ? "Dr. K. R. Raman" : "Prof. Ananya Sen",
        proj?.leadStudent || "Student Lead",
      ],
      date,
      startTime,
      durationMinutes: 45,
      timeZone: "IST (UTC+5:30)",
      meetingType: type,
      agenda,
      meetingProvider: provider,
      meetingLinkOrLocation:
        provider === "In-Person (DBITIC Lab 402)"
          ? "DBIT Incubation Centre, Lab 402"
          : "Authorized link generated upon OAuth confirmation",
      invitationStatus: "Sent",
    };

    setMeetings([newMeet, ...meetings]);

    // Persist to MongoDB backend
    await createFacultyMeeting(newMeet);

    toast.success("Meeting Scheduled", {
      description: `Saved in MongoDB & calendar invite dispatched for ${date} at ${startTime}.`,
    });
    setShowScheduleMeetingModal(false);
  };

  return (
    <PageContainer
      title="Faculty Management Module"
      description="Role-aware academic oversight, incubation project governance, mentor allocation workflows, and student supervision for DBITIC."
    >
      <div className="space-y-6">
        {/* ========================================================================= */}
        {/* TOP PERSPECTIVE / ROLE SELECTOR BAR                                      */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-brand-deep via-brand to-brand/90 text-white shadow-sm border border-brand/20">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              {activeRole === "coordinator" ? (
                <ShieldCheck className="size-6 text-brand-cyan" />
              ) : (
                <UserCheck className="size-6 text-brand-gold" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-blue-200 font-bold">
                  Active Faculty Persona
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    activeRole === "coordinator"
                      ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30"
                      : "bg-brand-gold/20 text-brand-gold border border-brand-gold/30"
                  }`}
                >
                  {activeRole === "coordinator" ? "Coordinator Mode" : "Volunteer Mode"}
                </span>
              </div>
              <h1 className="text-lg font-bold text-white mt-0.5">
                {activeRole === "coordinator"
                  ? "Dr. K. R. Raman (Incubation Faculty Coordinator)"
                  : "Prof. Ananya Sen (Faculty Volunteer Advisor)"}
              </h1>
              <p className="text-xs text-blue-100/80">
                {activeRole === "coordinator"
                  ? "Authoritative Governance: Overseeing cohort allocations, mentor approvals, and institutional sign-offs."
                  : "Direct Advisory: Mentoring assigned student teams, submitting mentor requests, and monitoring daily deliverables."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/15 backdrop-blur-xs self-start sm:self-auto">
            <button
              onClick={() => handleRoleChange("coordinator")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeRole === "coordinator"
                  ? "bg-white text-brand shadow-xs"
                  : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <ShieldCheck className="size-3.5" />
              <span>Coordinator View</span>
            </button>
            <button
              onClick={() => handleRoleChange("volunteer")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeRole === "volunteer"
                  ? "bg-white text-brand-deep shadow-xs"
                  : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <UserCheck className="size-3.5" />
              <span>Volunteer View</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INTERNAL SECTION NAVIGATION TABS                                         */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1.5 border-b border-line overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "coordinator", label: "Coordinator Desk", icon: ShieldCheck, badge: activeRole === "coordinator" ? "Lead" : undefined },
            { id: "volunteer", label: "Volunteer Desk", icon: UserCheck, badge: activeRole === "volunteer" ? "Active" : undefined },
            { id: "projects", label: "Projects & Teams", icon: FolderGit2, count: projects.length },
            { id: "mentors", label: "Mentor Allocation", icon: Users2, count: metrics.pendingMentorReqs },
            { id: "meetings", label: "Meetings & Calendar", icon: CalendarDays, count: metrics.upcomingMeets },
            { id: "tasks", label: "Tasks & Reports", icon: CheckSquare, count: metrics.pendingTasks },
            { id: "notifications", label: "Notifications", icon: Bell, count: notifications.filter((n) => !n.read).length },
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
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-cyan/20 text-brand-cyan-ink uppercase tracking-wider">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FACULTY OVERVIEW                                                  */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {[
                { label: "Assigned Projects", val: metrics.activeProjects, sub: "Supervised R&D", icon: FolderGit2, color: "bg-brand/10 text-brand" },
                { label: "Students Supported", val: metrics.totalStudents, sub: "Across 4 teams", icon: Users2, color: "bg-emerald-50 text-emerald-700" },
                { label: "Pending Mentors", val: metrics.pendingMentorReqs, sub: "Awaiting decision", icon: Sparkles, color: "bg-amber-50 text-amber-700" },
                { label: "Upcoming Meetings", val: metrics.upcomingMeets, sub: "Milestone reviews", icon: CalendarDays, color: "bg-indigo-50 text-indigo-700" },
                { label: "Overdue Milestones", val: metrics.overdueMilestones, sub: "Requires attention", icon: AlertTriangle, color: "bg-red-50 text-danger" },
                { label: "Tasks In Action", val: metrics.pendingTasks, sub: "Active items", icon: CheckSquare, color: "bg-slate-50 text-slate-700" },
              ].map((kpi) => (
                <Card key={kpi.label} className="p-3.5 border border-line bg-white shadow-2xs hover:border-brand/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-ink leading-tight">{kpi.label}</p>
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

            {/* Priority Alerts & Action Required Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 cols: Priority Actions & Incubation Portfolio */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="p-5 border border-amber-200 bg-amber-50/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-amber-950">Immediate Faculty Actions Required</h3>
                      <p className="text-xs text-amber-900/80 mt-0.5">
                        {activeRole === "coordinator"
                          ? "As Coordinator, you have 1 mentor recommendation ready for final authorization and 1 project with overdue milestones."
                          : "As Volunteer, ensure Project #proj-2 submits their biodegradation ASTM laboratory test report by 28 Oct."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeRole === "coordinator" ? (
                          <>
                            <button
                              onClick={() => setActiveTab("mentors")}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white transition-colors"
                            >
                              Process Mentor Approvals ({metrics.pendingMentorReqs})
                            </button>
                            <button
                              onClick={() => setShowAnnouncementModal(true)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 transition-colors"
                            >
                              Publish Announcement
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setActiveTab("volunteer")}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white transition-colors"
                            >
                              View Student Support Requests (1 Open)
                            </button>
                            <button
                              onClick={() => setShowNewMentorRequestModal(true)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 transition-colors"
                            >
                              Submit Mentor Request
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Cohort Health Summary */}
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-ink">Supervised Incubation Portfolio</h3>
                      <p className="text-xs text-muted-ink">Current status of active student startup cohorts</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("projects")}
                      className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                    >
                      View All Projects <ArrowRight className="size-3" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        onClick={() => setSelectedProject(proj)}
                        className="p-3.5 rounded-xl border border-line bg-canvas/30 hover:bg-canvas hover:border-brand/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-line text-muted-ink uppercase">
                              {proj.domain}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan-ink border border-brand-cyan/20">
                              TRL {proj.trl}
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
                          <h4 className="text-xs font-bold text-ink truncate">{proj.title}</h4>
                          <p className="text-[11px] text-muted-ink mt-0.5">
                            Lead: {proj.leadStudent} ({proj.rollNumber}) · Volunteer: {proj.assignedVolunteerName || "Unassigned"}
                          </p>
                        </div>

                        <div className="sm:w-36 shrink-0">
                          <ProgressBar value={proj.progress} label={`${proj.progress}% Complete`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right Col: Upcoming Reviews & Activity Feed */}
              <div className="space-y-4">
                {/* Upcoming Meetings */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <CalendarDays className="size-4 text-brand" /> Upcoming Scheduled Reviews
                    </h3>
                    <button
                      onClick={() => setShowScheduleMeetingModal(true)}
                      className="text-[11px] font-bold text-brand hover:underline"
                    >
                      + Schedule
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {meetings.map((m) => (
                      <div key={m.id} className="p-3 rounded-lg border border-line bg-canvas/30 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-ink">{m.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand font-semibold">
                            {m.meetingType}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-ink truncate">{m.projectTitle}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-line/60 text-[11px] text-muted-ink">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" /> {m.date} · {m.startTime}
                          </span>
                          <span className="font-medium text-ink">{m.meetingProvider}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Audit History Snippet */}
                <Card className="p-4">
                  <h3 className="text-xs font-bold text-ink mb-3 flex items-center gap-1.5">
                    <Clock className="size-4 text-muted-ink" /> Recent Activity & Audit Log
                  </h3>
                  <div className="space-y-3">
                    {auditLogs.slice(0, 4).map((log) => (
                      <div key={log.id} className="text-xs border-l-2 border-brand pl-2.5 py-0.5">
                        <p className="font-semibold text-ink leading-snug">{log.details}</p>
                        <p className="text-[10px] text-muted-ink mt-0.5">
                          {log.actor} ({log.role}) · {log.timestamp}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FACULTY COORDINATOR SECTION                                       */}
        {/* ========================================================================= */}
        {activeTab === "coordinator" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Permission banner if viewing in volunteer mode */}
            {activeRole !== "coordinator" && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                <Lock className="size-4.5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Viewing in Read-Only Volunteer Mode</p>
                  <p className="mt-0.5 text-amber-800">
                    Coordinator governance actions (final mentor approvals, volunteer reassignments, and announcements) require
                    the Faculty Coordinator role. Use the top switch to toggle into Coordinator Mode.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Faculty Coordinator Governance Center</h2>
                <p className="text-xs text-muted-ink">
                  Oversee incubation project health, process mentor allocations, and manage volunteer assignments.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={activeRole !== "coordinator"}
                  onClick={() => setShowAnnouncementModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors disabled:opacity-40"
                >
                  <Megaphone className="size-3.5" /> Publish Announcement
                </button>
                <button
                  disabled={activeRole !== "coordinator"}
                  onClick={() => setShowScheduleMeetingModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-ink text-xs font-bold hover:bg-canvas transition-colors disabled:opacity-40"
                >
                  <CalendarDays className="size-3.5" /> Schedule Review
                </button>
              </div>
            </div>

            {/* Pending Mentor Allocation Authorizations Queue */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-ink">Mentor Allocation Decision Queue</h3>
                  <p className="text-xs text-muted-ink">
                    Review mentor requests submitted by students and recommended by faculty volunteers.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                  {mentorRequests.filter((r) => r.status === "recommended" || r.status === "under_review").length} Awaiting Authorization
                </span>
              </div>

              <div className="space-y-3">
                {mentorRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-line bg-white hover:border-brand/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
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
                        <span className="text-[11px] text-muted-ink">by {req.studentName} ({req.studentRollNo})</span>
                      </div>
                      <p className="text-xs text-muted-ink mt-1">{req.justification}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {req.requestedExpertise.map((exp) => (
                          <span
                            key={exp}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand/5 border border-brand/15 text-brand"
                          >
                            {exp}
                          </span>
                        ))}
                      </div>
                      {req.recommendedMentorName && (
                        <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-emerald-600" />
                          <span>
                            Recommended by Volunteer <strong>{req.recommendedByVolunteerName}</strong>: {req.recommendedMentorName}{" "}
                            ({req.recommendedMentorOrg || "Industry Partner"})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === "recommended" || req.status === "under_review" || req.status === "requested" ? (
                        <>
                          <button
                            disabled={activeRole !== "coordinator"}
                            onClick={() => {
                              setShowMentorDecisionModal(req);
                              setMentorDecisionType("approve");
                              setMentorAssignedName(req.recommendedMentorName || "");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-40"
                          >
                            Authorize
                          </button>
                          <button
                            disabled={activeRole !== "coordinator"}
                            onClick={() => {
                              setShowMentorDecisionModal(req);
                              setMentorDecisionType("reject");
                            }}
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-danger hover:bg-red-50 text-xs font-bold transition-colors disabled:opacity-40"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-ink font-semibold">
                          Decision recorded: {req.coordinatorComment || "Approved"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Faculty Volunteer Workload & Assignments */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-ink mb-1">Faculty Volunteer Workload & Supervision Roster</h3>
              <p className="text-xs text-muted-ink mb-4">
                Assignments across departments and active research projects
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    name: "Prof. Ananya Sen",
                    role: "Faculty Volunteer",
                    dept: "Computer Science & AI",
                    activeProjects: 3,
                    specialization: "Applied ML, AgriTech, Edge Computing",
                    status: "Active (2 Reviews Scheduled)",
                  },
                  {
                    name: "Prof. Rajiv Menon",
                    role: "Faculty Volunteer",
                    dept: "Electronics & Embedded Systems",
                    activeProjects: 1,
                    specialization: "IoT Sensor Fusion, Firmware, Water Quality",
                    status: "Active",
                  },
                ].map((fac) => (
                  <div key={fac.name} className="p-4 rounded-xl border border-line bg-canvas/30 text-xs space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-ink text-sm">{fac.name}</h4>
                        <p className="text-muted-ink">{fac.dept}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand/10 text-brand">
                        {fac.activeProjects} Supervised
                      </span>
                    </div>
                    <p className="text-muted-ink">
                      <strong className="text-ink">Domain:</strong> {fac.specialization}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-line text-[11px] text-muted-ink">
                      <span>Status: {fac.status}</span>
                      <button
                        disabled={activeRole !== "coordinator"}
                        onClick={() => toast.info(`Reassigning modal for ${fac.name} ready for backend linkage.`)}
                        className="text-brand font-bold hover:underline disabled:opacity-40"
                      >
                        Adjust Assignment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FACULTY VOLUNTEER SECTION                                         */}
        {/* ========================================================================= */}
        {activeTab === "volunteer" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Faculty Volunteer Advisory Desk</h2>
                <p className="text-xs text-muted-ink">
                  Support assigned student innovators, record guidance notes, and recommend industry mentors.
                </p>
              </div>
              <button
                onClick={() => setShowNewMentorRequestModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors self-start sm:self-auto"
              >
                <Plus className="size-3.5" /> Submit Mentor Allocation Request
              </button>
            </div>

            {/* Student Questions & Support Queue */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-ink">Student Support & Inquiry Queue</h3>
                  <p className="text-xs text-muted-ink">Questions and advisory requests submitted by your project teams</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand/10 text-brand">
                  {supportRequests.filter((r) => r.status === "Open").length} Open Requests
                </span>
              </div>

              <div className="space-y-3">
                {supportRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-line bg-white hover:border-brand/30 transition-all text-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === "Open"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="font-bold text-ink">{req.projectTitle}</span>
                          <span className="text-muted-ink">({req.studentName})</span>
                        </div>
                        <p className="text-[11px] font-semibold text-brand mt-1">Topic: {req.category}</p>
                      </div>
                      <span className="text-[11px] text-muted-ink shrink-0">{req.submittedAt}</span>
                    </div>

                    <p className="text-muted-ink bg-canvas/50 p-2.5 rounded-lg border border-line leading-relaxed">
                      "{req.question}"
                    </p>

                    {req.volunteerResponse ? (
                      <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-emerald-900">
                        <p className="font-bold text-[11px] text-emerald-800">Logged Guidance:</p>
                        <p className="mt-0.5 text-xs">{req.volunteerResponse}</p>
                      </div>
                    ) : (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => setShowGuidanceModal(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors"
                        >
                          <MessageSquare className="size-3.5" /> Log Advisory Response
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Mentor Recommendation Workflow for Volunteers */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-ink mb-1">Mentor Nominations (Volunteer Scope)</h3>
              <p className="text-xs text-muted-ink mb-4">
                Nominate mentors based on student requirements. Nominations will be routed to the Coordinator for official approval.
              </p>

              <div className="space-y-3">
                {mentorRequests
                  .filter((r) => r.status === "requested" || r.status === "under_review")
                  .map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl border border-line bg-canvas/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-ink">{r.projectTitle}</h4>
                        <p className="text-[11px] text-muted-ink mt-0.5">
                          Requested Skills: {r.requestedExpertise.join(", ")}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const mentor = prompt("Enter suggested mentor name (e.g. Dr. Sunita Kapoor):", "Dr. Rajesh Varma");
                          if (mentor) {
                            handleVolunteerRecommendMentor(r.id, mentor, "Industry Partner Advisory");
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors shrink-0"
                      >
                        <Sparkles className="size-3.5" /> Recommend Mentor
                      </button>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PROJECTS & TEAMS                                                   */}
        {/* ========================================================================= */}
        {activeTab === "projects" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-line">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-ink" />
                  <input
                    type="text"
                    placeholder="Search title, student, roll no..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 w-56 bg-canvas/30"
                  />
                </div>

                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                >
                  <option value="All">All Domains</option>
                  <option value="AgriTech / ML">AgriTech / ML</option>
                  <option value="GreenTech / Materials">GreenTech / Materials</option>
                  <option value="IoT / Environment">IoT / Environment</option>
                  <option value="HealthTech / Blockchain">HealthTech / Blockchain</option>
                </select>

                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                >
                  <option value="All">All Stages</option>
                  <option value="Ideation">Ideation</option>
                  <option value="Research">Research</option>
                  <option value="Prototype">Prototype</option>
                  <option value="Validation">Validation</option>
                </select>
              </div>

              <span className="text-xs font-semibold text-muted-ink">
                Showing {projects.length} supervised projects
              </span>
            </div>

            {/* Project Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects
                .filter((p) => {
                  const q = projectSearch.toLowerCase();
                  const matchQ =
                    p.title.toLowerCase().includes(q) ||
                    p.leadStudent.toLowerCase().includes(q) ||
                    p.rollNumber.toLowerCase().includes(q);
                  const matchDomain = domainFilter === "All" || p.domain === domainFilter;
                  const matchStage = stageFilter === "All" || p.stage === stageFilter;
                  return matchQ && matchDomain && matchStage;
                })
                .map((proj) => (
                  <Card
                    key={proj.id}
                    interactive
                    onClick={() => setSelectedProject(proj)}
                    className="p-5 border border-line hover:border-brand/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-canvas border border-line text-ink uppercase">
                            {proj.domain}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan-ink border border-brand-cyan/20">
                            TRL {proj.trl}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
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

                      <h3 className="text-sm font-bold text-ink leading-snug hover:text-brand transition-colors">
                        {proj.title}
                      </h3>
                      <p className="text-xs text-muted-ink mt-1.5 line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>

                      <div className="mt-3.5 p-3 rounded-lg bg-canvas/40 border border-line text-xs space-y-1">
                        <div className="flex items-center justify-between text-muted-ink">
                          <span>Lead Innovator:</span>
                          <strong className="text-ink">{proj.leadStudent} ({proj.rollNumber})</strong>
                        </div>
                        <div className="flex items-center justify-between text-muted-ink">
                          <span>Team Size:</span>
                          <strong className="text-ink">{proj.teamMembers.length} Students</strong>
                        </div>
                        <div className="flex items-center justify-between text-muted-ink">
                          <span>Assigned Volunteer:</span>
                          <strong className="text-brand">{proj.assignedVolunteerName || "Unassigned"}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                      <div className="w-2/3">
                        <ProgressBar value={proj.progress} label={`${proj.progress}% Progression`} />
                      </div>
                      <span className="text-xs font-bold text-brand flex items-center gap-1">
                        Details <ChevronRight className="size-3.5" />
                      </span>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MENTOR ALLOCATION WORKFLOW                                        */}
        {/* ========================================================================= */}
        {activeTab === "mentors" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Mentor Allocation Workflow</h2>
                <p className="text-xs text-muted-ink">
                  Rigorous multi-stage lifecycle: <code>requested</code> → <code>under_review</code> → <code>recommended</code> → <code>approved</code> → <code>allocated</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewMentorRequestModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors shadow-xs"
                >
                  <Plus className="size-3.5" /> New Mentor Request
                </button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "requested", "under_review", "recommended", "approved", "allocated", "rejected"].map((st) => (
                <button
                  key={st}
                  onClick={() => setMentorStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    mentorStatusFilter === st
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-muted-ink border-line hover:border-brand/40"
                  }`}
                >
                  {st === "All" ? "All Requests" : st.replace("_", " ").toUpperCase()}
                </button>
              ))}
            </div>

            {/* Allocation Requests Cards */}
            <div className="space-y-3">
              {mentorRequests
                .filter((r) => mentorStatusFilter === "All" || r.status === mentorStatusFilter)
                .map((req) => (
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
                            Requested by {req.studentName} ({req.studentRollNo}) · {req.createdAt}
                          </span>
                        </div>

                        <p className="text-xs text-ink/80 leading-relaxed mb-3">
                          <strong>Justification:</strong> {req.justification}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="text-[11px] font-semibold text-muted-ink">Expertise Needed:</span>
                          {req.requestedExpertise.map((exp) => (
                            <span key={exp} className="px-2 py-0.5 rounded text-[10px] font-bold bg-canvas border border-line text-ink">
                              {exp}
                            </span>
                          ))}
                        </div>

                        {req.recommendedMentorName && (
                          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-950 mt-2">
                            <p className="font-bold flex items-center gap-1.5">
                              <Sparkles className="size-3.5 text-emerald-600" />
                              Nominated Mentor: {req.recommendedMentorName} ({req.recommendedMentorOrg || "Industry Lead"})
                            </p>
                            <p className="text-[11px] text-emerald-800 mt-0.5">
                              Recommended by {req.recommendedByVolunteerName || "Faculty Volunteer"}
                            </p>
                          </div>
                        )}

                        {req.coordinatorComment && (
                          <div className="mt-2 text-xs text-muted-ink bg-canvas p-2.5 rounded-lg border border-line">
                            <strong>Coordinator Note:</strong> {req.coordinatorComment}
                          </div>
                        )}
                      </div>

                      {/* Authorized Decision Actions */}
                      <div className="flex items-center lg:flex-col lg:items-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-line">
                        {req.status !== "approved" && req.status !== "allocated" && req.status !== "rejected" ? (
                          <>
                            {activeRole === "coordinator" ? (
                              <button
                                onClick={() => {
                                  setShowMentorDecisionModal(req);
                                  setMentorDecisionType("approve");
                                  setMentorAssignedName(req.recommendedMentorName || "");
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                              >
                                Authorize Mentor
                              </button>
                            ) : (
                              <div className="text-right">
                                <button
                                  onClick={() => {
                                    const mentor = prompt("Enter suggested mentor name:", "Dr. Rajesh Varma");
                                    if (mentor) handleVolunteerRecommendMentor(req.id, mentor, "Industry Partner");
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors"
                                >
                                  Nominate Mentor
                                </button>
                                <p className="text-[10px] text-muted-ink mt-1">Approval restricted to Coordinator</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
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

        {/* ========================================================================= */}
        {/* TAB 6: MEETINGS & CALENDAR                                               */}
        {/* ========================================================================= */}
        {activeTab === "meetings" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Meetings & Milestone Reviews</h2>
                <p className="text-xs text-muted-ink">
                  Schedule technical check-ins, record attendance, and view upcoming incubation review sessions.
                </p>
              </div>
              <button
                onClick={() => setShowScheduleMeetingModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors self-start sm:self-auto"
              >
                <Plus className="size-3.5" /> Schedule New Meeting
              </button>
            </div>

            {/* Provider Integration Notice */}
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-start gap-2.5">
              <Calendar className="size-4 text-brand shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">OAuth Calendar & Room Dispatch Integration Ready</p>
                <p className="text-[11px] text-blue-900/80 mt-0.5">
                  Scheduled meetings dispatch calendar ICS invites to attendees. Meeting links populate verified credentials via the institutional provider.
                </p>
              </div>
            </div>

            {/* Meeting List */}
            <div className="space-y-3">
              {meetings.map((m) => (
                <Card key={m.id} className="p-5 border border-line">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand/10 text-brand">
                          {m.meetingType}
                        </span>
                        <span className="text-xs font-bold text-ink">{m.title}</span>
                        <StatusBadge
                          label={m.invitationStatus}
                          tone={m.invitationStatus === "Confirmed" ? "success" : "neutral"}
                        />
                      </div>
                      <p className="text-xs text-muted-ink">Project: {m.projectTitle}</p>
                      <p className="text-xs text-ink mt-2 leading-relaxed">
                        <strong>Agenda:</strong> {m.agenda}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-ink">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5 text-brand" /> {m.date} ({m.startTime} IST, {m.durationMinutes} mins)
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5 text-muted-ink" /> {m.meetingLinkOrLocation}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          const note = prompt("Record review notes / action items:", m.notes || "Prototype passed benchmark criteria.");
                          if (note) {
                            setMeetings((prev) =>
                              prev.map((item) => (item.id === m.id ? { ...item, notes: note, attendanceLogged: true } : item))
                            );
                            toast.success("Meeting Notes & Attendance Saved");
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-line hover:border-brand/40 text-ink text-xs font-bold transition-colors"
                      >
                        {m.notes ? "Edit Notes" : "Log Notes"}
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: TASKS & PROGRESS REPORTS                                          */}
        {/* ========================================================================= */}
        {activeTab === "tasks" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Action Tasks & Milestone Progress</h2>
                <p className="text-xs text-muted-ink">
                  Assign tasks, request milestone progress reports, and track team compliance.
                </p>
              </div>
              <button
                onClick={() => setShowCreateTaskModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors self-start sm:self-auto"
              >
                <Plus className="size-3.5" /> Assign New Task
              </button>
            </div>

            {/* Task Cards */}
            <div className="space-y-3">
              {tasks.map((t) => (
                <Card key={t.id} className="p-4 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.priority === "High"
                            ? "bg-red-50 text-danger border border-red-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.priority} Priority
                      </span>
                      <span className="text-xs font-bold text-ink">{t.title}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          t.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : t.status === "Overdue"
                            ? "bg-red-50 text-danger"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-ink">{t.description}</p>
                    <p className="text-[11px] text-muted-ink mt-1">
                      Assigned to: <strong className="text-ink">{t.assignedTo}</strong> ({t.assignedRole}) · Due: {t.dueDate}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {t.status !== "Completed" && (
                      <button
                        onClick={() => {
                          setTasks((prev) =>
                            prev.map((item) => (item.id === t.id ? { ...item, status: "Completed" } : item))
                          );
                          toast.success(`Task '${t.title}' marked as completed.`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: NOTIFICATIONS                                                     */}
        {/* ========================================================================= */}
        {activeTab === "notifications" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">Faculty Notification Center</h2>
                <p className="text-xs text-muted-ink">Alerts, milestone updates, and mentor request transitions</p>
              </div>
              <button
                onClick={() => {
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  toast.success("All notifications marked as read.");
                }}
                className="text-xs font-bold text-brand hover:underline"
              >
                Mark All Read
              </button>
            </div>

            <div className="space-y-2.5">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  className={`p-4 border transition-all ${
                    n.read ? "border-line bg-white" : "border-brand/30 bg-brand/5 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`size-2 rounded-full mt-1.5 shrink-0 ${
                          n.priority === "urgent" ? "bg-danger" : "bg-brand"
                        }`}
                      />
                      <div>
                        <h4 className="text-xs font-bold text-ink">{n.title}</h4>
                        <p className="text-xs text-muted-ink mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-ink shrink-0">{n.timestamp}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: PROJECT DOSSIER SLIDE-OVER                                      */}
        {/* ========================================================================= */}
        {selectedProject && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedProject(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-line overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-line flex items-start justify-between bg-canvas/30">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-canvas border border-line text-ink uppercase">
                      {selectedProject.domain}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan-ink border border-brand-cyan/20">
                      TRL {selectedProject.trl}
                    </span>
                    <span className="text-xs font-semibold text-muted-ink">{selectedProject.stage}</span>
                  </div>
                  <h2 className="text-base font-bold text-ink">{selectedProject.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-1 rounded-md text-muted-ink hover:text-ink hover:bg-canvas"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs text-ink">
                <div>
                  <p className="font-bold text-ink mb-1">Project Abstract</p>
                  <p className="text-muted-ink bg-canvas/40 p-3 rounded-xl border border-line leading-relaxed">
                    {selectedProject.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-canvas border border-line">
                  <div>
                    <span className="text-muted-ink block text-[11px]">Lead Student</span>
                    <strong className="text-ink">{selectedProject.leadStudent} ({selectedProject.rollNumber})</strong>
                  </div>
                  <div>
                    <span className="text-muted-ink block text-[11px]">Assigned Volunteer</span>
                    <strong className="text-brand">{selectedProject.assignedVolunteerName || "Unassigned"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-ink block text-[11px]">Next Milestone</span>
                    <strong className="text-ink">{selectedProject.nextMilestone}</strong>
                  </div>
                  <div>
                    <span className="text-muted-ink block text-[11px]">Due Date</span>
                    <strong className="text-ink">{selectedProject.nextMilestoneDate}</strong>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-ink mb-2">Student Team Members</p>
                  <div className="space-y-1.5">
                    {selectedProject.teamMembers.map((m) => (
                      <div key={m.rollNumber} className="flex items-center justify-between p-2.5 rounded-lg border border-line bg-white">
                        <span>{m.name} ({m.role})</span>
                        <span className="text-muted-ink font-mono text-[11px]">{m.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-line bg-canvas/40 flex justify-end">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="px-4 py-2 text-xs font-bold text-muted-ink border border-line rounded-lg hover:bg-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: MENTOR DECISION MODAL (COORDINATOR)                             */}
        {/* ========================================================================= */}
        {showMentorDecisionModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setShowMentorDecisionModal(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand" />
                  {mentorDecisionType === "approve" ? "Authorize Mentor Allocation" : "Reject Mentor Request"}
                </h3>
                <button onClick={() => setShowMentorDecisionModal(null)}>
                  <X className="size-4 text-muted-ink" />
                </button>
              </div>

              <form onSubmit={handleProcessMentorDecision} className="p-6 space-y-4 text-xs">
                <div>
                  <p className="text-muted-ink">Project:</p>
                  <p className="font-bold text-ink">{showMentorDecisionModal.projectTitle}</p>
                </div>

                {mentorDecisionType === "approve" && (
                  <div>
                    <label className="block font-bold text-ink mb-1.5">Allocated Industry Mentor Name *</label>
                    <input
                      type="text"
                      required
                      value={mentorAssignedName}
                      onChange={(e) => setMentorAssignedName(e.target.value)}
                      placeholder="e.g. Dr. Vikram Malhotra (VP Tech)"
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-ink mb-1.5">Coordinator Governance Note / Justification</label>
                  <textarea
                    rows={3}
                    value={mentorDecisionComment}
                    onChange={(e) => setMentorDecisionComment(e.target.value)}
                    placeholder="Enter official institutional comments or conditions..."
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowMentorDecisionModal(null)}
                    className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 font-bold text-white rounded-lg transition-colors ${
                      mentorDecisionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-danger hover:bg-red-700"
                    }`}
                  >
                    {mentorDecisionType === "approve" ? "Confirm Allocation" : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: NEW MENTOR REQUEST MODAL                                        */}
        {/* ========================================================================= */}
        {showNewMentorRequestModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewMentorRequestModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Sparkles className="size-4 text-brand" /> New Mentor Allocation Request
                </h3>
                <button onClick={() => setShowNewMentorRequestModal(false)}>
                  <X className="size-4 text-muted-ink" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-ink mb-1.5">Select Incubation Project *</label>
                  <select
                    id="newReqProj"
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.leadStudent})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1.5">Required Industry Expertise *</label>
                  <input
                    id="newReqExp"
                    type="text"
                    placeholder="e.g. Cloud Security, Sensor Calibration, Deep Learning"
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1.5">Specific Problem / Justification *</label>
                  <textarea
                    id="newReqJust"
                    rows={3}
                    placeholder="Describe the exact technical bottleneck or scale-up hurdle..."
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowNewMentorRequestModal(false)}
                    className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const pId = (document.getElementById("newReqProj") as HTMLSelectElement).value;
                      const exp = (document.getElementById("newReqExp") as HTMLInputElement).value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const just = (document.getElementById("newReqJust") as HTMLTextAreaElement).value;
                      if (!just.trim()) {
                        toast.error("Please provide a justification.");
                        return;
                      }
                      handleCreateMentorRequest(pId, exp, just);
                    }}
                    className="px-4 py-2 font-bold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors shadow-xs"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: RECORD GUIDANCE / SUPPORT ADVISORY MODAL                        */}
        {/* ========================================================================= */}
        {showGuidanceModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setShowGuidanceModal(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <MessageSquare className="size-4 text-brand" /> Record Faculty Advisory Guidance
                </h3>
                <button onClick={() => setShowGuidanceModal(null)}>
                  <X className="size-4 text-muted-ink" />
                </button>
              </div>

              <form onSubmit={handleResolveGuidance} className="p-6 space-y-4 text-xs">
                <div>
                  <p className="text-muted-ink">Student Question ({showGuidanceModal.studentName}):</p>
                  <p className="font-semibold text-ink bg-canvas p-2.5 rounded-lg border border-line mt-1">
                    "{showGuidanceModal.question}"
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1.5">Advisor Guidance / Next Actions *</label>
                  <textarea
                    rows={4}
                    required
                    value={guidanceResponseText}
                    onChange={(e) => setGuidanceResponseText(e.target.value)}
                    placeholder="Enter technical recommendations, lab contacts, or action items..."
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowGuidanceModal(null)}
                    className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors shadow-xs"
                  >
                    Save & Dispatch to Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 5: SCHEDULE MEETING MODAL                                          */}
        {/* ========================================================================= */}
        {showScheduleMeetingModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setShowScheduleMeetingModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <CalendarDays className="size-4 text-brand" /> Schedule Review / Meeting
                </h3>
                <button onClick={() => setShowScheduleMeetingModal(false)}>
                  <X className="size-4 text-muted-ink" />
                </button>
              </div>

              <div className="p-6 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-ink mb-1">Meeting Title *</label>
                  <input
                    id="mTitle"
                    type="text"
                    defaultValue="Milestone Progress Review"
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Target Project *</label>
                  <select
                    id="mProj"
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-ink mb-1">Date *</label>
                    <input
                      id="mDate"
                      type="date"
                      defaultValue="2026-10-24"
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-ink mb-1">Time (IST) *</label>
                    <input
                      id="mTime"
                      type="time"
                      defaultValue="14:00"
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-ink mb-1">Review Type *</label>
                    <select
                      id="mType"
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                    >
                      <option>Milestone Review</option>
                      <option>Technical Mentorship</option>
                      <option>Progress Check-in</option>
                      <option>Grant Advisory</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-ink mb-1">Meeting Channel *</label>
                    <select
                      id="mChannel"
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                    >
                      <option>In-Person (DBITIC Lab 402)</option>
                      <option>Google Meet</option>
                      <option>Microsoft Teams</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Meeting Agenda</label>
                  <textarea
                    id="mAgenda"
                    rows={2}
                    defaultValue="Review TRL progression criteria and address hardware procurement timeline."
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowScheduleMeetingModal(false)}
                    className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const title = (document.getElementById("mTitle") as HTMLInputElement).value;
                      const proj = (document.getElementById("mProj") as HTMLSelectElement).value;
                      const date = (document.getElementById("mDate") as HTMLInputElement).value;
                      const time = (document.getElementById("mTime") as HTMLInputElement).value;
                      const type = (document.getElementById("mType") as HTMLSelectElement).value as any;
                      const channel = (document.getElementById("mChannel") as HTMLSelectElement).value as any;
                      const agenda = (document.getElementById("mAgenda") as HTMLTextAreaElement).value;
                      handleScheduleMeeting(title, proj, date, time, type, channel, agenda);
                    }}
                    className="px-4 py-2 font-bold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors shadow-xs"
                  >
                    Confirm & Dispatch Invites
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 6: PUBLISH ANNOUNCEMENT MODAL (COORDINATOR)                        */}
        {/* ========================================================================= */}
        {showAnnouncementModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setShowAnnouncementModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Megaphone className="size-4 text-brand" /> Publish Cohort Announcement
                </h3>
                <button onClick={() => setShowAnnouncementModal(false)}>
                  <X className="size-4 text-muted-ink" />
                </button>
              </div>

              <form onSubmit={handlePublishAnnouncement} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-ink mb-1.5">Announcement Headline *</label>
                  <input
                    type="text"
                    required
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="e.g. DST NIDHI Milestone-2 Submission Window Open"
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1.5">Detailed Notification Content *</label>
                  <textarea
                    rows={4}
                    required
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    placeholder="Provide guidelines, deadlines, and submission instructions for student innovators..."
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowAnnouncementModal(false)}
                    className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors shadow-xs"
                  >
                    Broadcast to Cohort
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 7: CREATE TASK MODAL                                               */}
        {/* ========================================================================= */}
        {showCreateTaskModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateTaskModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <CheckSquare className="size-4 text-brand" /> Assign Action Task
                </h3>
                <button onClick={() => setShowCreateTaskModal(false)}>
                  <X className="size-4 text-muted-ink" />
                </button>
              </div>

              <div className="p-6 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-ink mb-1">Task Title *</label>
                  <input
                    id="tTitle"
                    type="text"
                    placeholder="e.g. Complete ISO Test Documentation"
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Associated Project *</label>
                  <select
                    id="tProj"
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-ink mb-1">Assigned Owner *</label>
                    <input
                      id="tOwner"
                      type="text"
                      defaultValue="Prof. Ananya Sen"
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-ink mb-1">Due Date *</label>
                    <input
                      id="tDue"
                      type="date"
                      defaultValue="2026-10-30"
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Priority</label>
                  <select
                    id="tPrio"
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowCreateTaskModal(false)}
                    className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg hover:bg-canvas"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const title = (document.getElementById("tTitle") as HTMLInputElement).value;
                      const projId = (document.getElementById("tProj") as HTMLSelectElement).value;
                      const owner = (document.getElementById("tOwner") as HTMLInputElement).value;
                      const due = (document.getElementById("tDue") as HTMLInputElement).value;
                      const prio = (document.getElementById("tPrio") as HTMLSelectElement).value as any;

                      if (!title.trim()) {
                        toast.error("Please enter a task title.");
                        return;
                      }

                      const proj = projects.find((p) => p.id === projId);
                      const newTask: FacultyTask = {
                        id: `task-${Date.now()}`,
                        title: title.trim(),
                        projectId: projId,
                        projectTitle: proj?.title || "Project",
                        assignedTo: owner,
                        assignedRole: "volunteer",
                        dueDate: due,
                        priority: prio,
                        status: "Pending",
                        description: "Task logged via Faculty Management module.",
                      };
                      setTasks([newTask, ...tasks]);
                      toast.success("Task assigned successfully.");
                      setShowCreateTaskModal(false);
                    }}
                    className="px-4 py-2 font-bold bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors shadow-xs"
                  >
                    Assign Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
