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
  IncubationProject,
  MentorAllocationRequest,
  FacultyMeeting,
  FacultyTask,
  StudentSupportRequest,
  fetchFacultyOverview,
  fetchSupportRequests,
  submitMentorAllocationRequest,
  respondSupportRequest,
  updateFacultyTaskStatus,
} from "@/services/facultyDataService";
import {
  UserCheck,
  FolderGit2,
  Users2,
  CalendarDays,
  CheckSquare,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  BookOpen,
  ChevronRight,
  X,
  Layers,
  Send,
  Calendar,
  AlertCircle
} from "lucide-react";

export default function FacultyVolunteerPage() {
  const [projects, setProjects] = useState<IncubationProject[]>(INITIAL_PROJECTS);
  const [mentorRequests, setMentorRequests] = useState<MentorAllocationRequest[]>(INITIAL_MENTOR_REQUESTS);
  const [meetings, setMeetings] = useState<FacultyMeeting[]>(INITIAL_MEETINGS);
  const [tasks, setTasks] = useState<FacultyTask[]>(INITIAL_TASKS);
  const [supportRequests, setSupportRequests] = useState<StudentSupportRequest[]>(INITIAL_SUPPORT_REQUESTS);

  // Active section tab
  const [activeTab, setActiveTab] = useState<"teams" | "guidance" | "mentors" | "tasks" | "meetings">("teams");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedProject, setSelectedProject] = useState<IncubationProject | null>(null);

  const [showNewMentorReqModal, setShowNewMentorReqModal] = useState(false);
  const [newReqProjectId, setNewReqProjectId] = useState(projects[0]?.id || "proj-1");
  const [newReqExpertise, setNewReqExpertise] = useState("Industrial Scale-up, Regulatory Compliance");
  const [newReqJustification, setNewReqJustification] = useState("");
  const [newReqNominatedMentor, setNewReqNominatedMentor] = useState("");

  const [showGuidanceModal, setShowGuidanceModal] = useState<StudentSupportRequest | null>(null);
  const [guidanceResponse, setGuidanceResponse] = useState("");

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
        console.warn("[Volunteer] Backend fetch notice:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Metrics
  const metrics = useMemo(() => {
    const assignedTeams = projects.filter((p) => p.assignedVolunteerName?.includes("Ananya Sen")).length;
    const openInquiries = supportRequests.filter((s) => s.status === "Open").length;
    const pendingMentorReviews = mentorRequests.filter((r) => r.status === "recommended" || r.status === "under_review").length;
    const pendingTasks = tasks.filter((t) => t.status !== "Completed").length;
    return {
      assignedTeams: assignedTeams || 3,
      openInquiries,
      pendingMentorReviews,
      pendingTasks,
      upcomingMeets: meetings.length,
    };
  }, [projects, supportRequests, mentorRequests, tasks, meetings]);

  // Submit new mentor nomination (Persists to MongoDB)
  const handleCreateMentorNomination = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === newReqProjectId);
    if (!proj) return;

    const expertiseList = newReqExpertise.split(",").map((s) => s.trim()).filter(Boolean);

    const newReq: MentorAllocationRequest = {
      id: `mr-${Date.now()}`,
      projectId: proj.id,
      projectTitle: proj.title,
      studentName: proj.leadStudent,
      studentRollNo: proj.rollNumber,
      domain: proj.domain,
      requestedExpertise: expertiseList,
      justification: newReqJustification.trim() || "Technical scaling support requested by student founder.",
      recommendedMentorName: newReqNominatedMentor.trim() || undefined,
      recommendedMentorOrg: newReqNominatedMentor.trim() ? "Industry Partner Network" : undefined,
      recommendedByVolunteerName: "Prof. Ananya Sen (Volunteer)",
      status: newReqNominatedMentor.trim() ? "recommended" : "requested",
      createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      updatedAt: "Just now",
    };

    setMentorRequests([newReq, ...mentorRequests]);

    // Persist to MongoDB backend
    await submitMentorAllocationRequest({
      projectId: proj.id,
      justification: newReqJustification.trim() || "Technical scaling support requested by student founder.",
      requestedExpertise: expertiseList,
      recommendedMentorName: newReqNominatedMentor.trim() || undefined,
      recommendedMentorOrg: newReqNominatedMentor.trim() ? "Industry Partner Network" : undefined,
      recommendedByVolunteerName: "Prof. Ananya Sen",
    });

    toast.success("Mentor Request & Nomination Submitted", {
      description: `Saved to MongoDB and forwarded to Faculty Coordinator for institutional review.`,
    });

    setShowNewMentorReqModal(false);
    setNewReqJustification("");
    setNewReqNominatedMentor("");
  };

  // Log guidance note to student (Persists to MongoDB)
  const handleSaveGuidance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showGuidanceModal || !guidanceResponse.trim()) return;

    setSupportRequests((prev) =>
      prev.map((sr) =>
        sr.id === showGuidanceModal.id
          ? { ...sr, status: "Resolved", volunteerResponse: guidanceResponse.trim() }
          : sr
      )
    );

    // Persist to MongoDB backend
    await respondSupportRequest(showGuidanceModal.id, guidanceResponse.trim());

    toast.success("Advisory Guidance Recorded", {
      description: `Saved to MongoDB database and dispatched to student founder ${showGuidanceModal.studentName}.`,
    });

    setShowGuidanceModal(null);
    setGuidanceResponse("");
  };

  // Toggle task status (Persists to MongoDB)
  const handleCompleteTask = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "Completed" } : t))
    );

    // Persist to MongoDB backend
    await updateFacultyTaskStatus(taskId, "Completed");

    toast.success("Task Marked as Completed", {
      description: "Updated status in MongoDB database.",
    });
  };

  return (
    <PageContainer
      title="Faculty Volunteer Advisory Desk"
      description="Direct hands-on mentoring of assigned student founders, guidance logging, milestone reviews, and mentor recommendations."
    >
      <div className="space-y-6">
        {/* Volunteer Identity Header */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-brand-deep to-brand text-white shadow-sm border border-brand/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <UserCheck className="size-7 text-brand-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-amber-200 font-bold">
                  Direct Innovation Advisory
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-gold/20 text-brand-gold border border-brand-gold/30 uppercase">
                  Faculty Volunteer
                </span>
              </div>
              <h1 className="text-xl font-bold text-white mt-0.5">Prof. Ananya Sen</h1>
              <p className="text-xs text-blue-100/80">
                Department of Computer Science & Artificial Intelligence · DBITIC
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowNewMentorReqModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="size-3.5" /> Submit Mentor Request
            </button>
          </div>
        </div>

        {/* Volunteer KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {[
            { label: "Assigned Teams", val: metrics.assignedTeams, sub: "Student Projects", icon: FolderGit2, color: "bg-brand/10 text-brand" },
            { label: "Open Inquiries", val: metrics.openInquiries, sub: "Student Questions", icon: MessageSquare, color: "bg-amber-50 text-amber-700" },
            { label: "Mentor Nominations", val: metrics.pendingMentorReviews, sub: "Under Review", icon: Sparkles, color: "bg-emerald-50 text-emerald-700" },
            { label: "Pending Tasks", val: metrics.pendingTasks, sub: "Checklist Items", icon: CheckSquare, color: "bg-indigo-50 text-indigo-700" },
            { label: "Upcoming Reviews", val: metrics.upcomingMeets, sub: "With Students", icon: CalendarDays, color: "bg-slate-50 text-slate-700" },
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-line overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "teams", label: "My Supervised Teams", icon: FolderGit2, count: metrics.assignedTeams },
            { id: "guidance", label: "Student Inquiries & Guidance", icon: MessageSquare, count: metrics.openInquiries },
            { id: "mentors", label: "Mentor Recommendations", icon: Sparkles, count: mentorRequests.length },
            { id: "tasks", label: "Tasks Checklist", icon: CheckSquare, count: metrics.pendingTasks },
            { id: "meetings", label: "Review Meetings", icon: CalendarDays, count: meetings.length },
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

        {/* TAB 1: ASSIGNED STUDENT TEAMS */}
        {activeTab === "teams" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-line">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-ink" />
                <input
                  type="text"
                  placeholder="Filter team, lead student, or domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 w-64 bg-canvas/30"
                />
              </div>
              <span className="text-xs font-semibold text-muted-ink">
                Direct Volunteer Guidance Scope
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects
                .filter((p) => {
                  const q = searchQuery.toLowerCase();
                  return p.title.toLowerCase().includes(q) || p.leadStudent.toLowerCase().includes(q) || p.domain.toLowerCase().includes(q);
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
                          <span>Next Milestone:</span>
                          <strong className="text-ink">{proj.nextMilestone}</strong>
                        </div>
                        <div className="flex justify-between text-muted-ink">
                          <span>Milestone Due Date:</span>
                          <strong className="text-amber-800">{proj.nextMilestoneDate}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                      <div className="w-2/3">
                        <ProgressBar value={proj.progress} label={`${proj.progress}% Progress`} />
                      </div>
                      <span className="text-xs font-bold text-brand flex items-center gap-1">
                        View Team <ChevronRight className="size-3.5" />
                      </span>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* TAB 2: STUDENT INQUIRIES & GUIDANCE */}
        {activeTab === "guidance" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">Student Support & Inquiry Desk</h3>
                <p className="text-xs text-muted-ink">Questions submitted by assigned student innovators requiring faculty advisory</p>
              </div>
            </div>

            <div className="space-y-3">
              {supportRequests.map((req) => (
                <Card key={req.id} className="p-4 border border-line text-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === "Open" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {req.status}
                        </span>
                        <span className="font-bold text-ink">{req.projectTitle}</span>
                        <span className="text-muted-ink">({req.studentName})</span>
                      </div>
                      <p className="text-[11px] font-semibold text-brand mt-1">Topic: {req.category}</p>
                    </div>
                    <span className="text-[11px] text-muted-ink">{req.submittedAt}</span>
                  </div>

                  <p className="text-ink bg-canvas/50 p-3 rounded-lg border border-line leading-relaxed">
                    "{req.question}"
                  </p>

                  {req.volunteerResponse ? (
                    <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-emerald-900">
                      <p className="font-bold text-[11px] text-emerald-800">Recorded Advisor Guidance:</p>
                      <p className="mt-0.5 text-xs">{req.volunteerResponse}</p>
                    </div>
                  ) : (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setShowGuidanceModal(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors shadow-2xs"
                      >
                        <MessageSquare className="size-3.5" /> Record Advisory Guidance
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MENTOR NOMINATIONS (VOLUNTEER SCOPE) */}
        {activeTab === "mentors" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-ink">Mentor Nominations & Status Tracking</h3>
                <p className="text-xs text-muted-ink">
                  Nominate mentors for student teams. Official approval rests with the Faculty Coordinator.
                </p>
              </div>
              <button
                onClick={() => setShowNewMentorReqModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors"
              >
                <Plus className="size-3.5" /> Nominate Mentor
              </button>
            </div>

            <div className="space-y-3">
              {mentorRequests.map((req) => (
                <Card key={req.id} className="p-4 border border-line text-xs">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
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
                        <span className="font-bold text-ink">{req.projectTitle}</span>
                        <span className="text-muted-ink">Lead: {req.studentName}</span>
                      </div>
                      <p className="text-muted-ink leading-relaxed mb-2">{req.justification}</p>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {req.requestedExpertise.map((exp) => (
                          <span key={exp} className="px-2 py-0.5 rounded text-[10px] font-bold bg-canvas border border-line text-ink">
                            {exp}
                          </span>
                        ))}
                      </div>

                      {req.recommendedMentorName && (
                        <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-emerald-950 mt-1">
                          <p className="font-bold flex items-center gap-1.5">
                            <Sparkles className="size-3.5 text-emerald-600" />
                            Nominated Mentor: {req.recommendedMentorName}
                          </p>
                          <p className="text-[11px] text-emerald-800">
                            Nominated by Volunteer: {req.recommendedByVolunteerName || "Volunteer Advisor"}
                          </p>
                        </div>
                      )}

                      {req.coordinatorComment && (
                        <p className="text-[11px] text-muted-ink mt-2 bg-canvas p-2 rounded border border-line">
                          <strong>Coordinator Remarks:</strong> {req.coordinatorComment}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      {req.status === "approved" || req.status === "allocated" ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          Authorized by Coordinator
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                          Awaiting Coordinator Authorization
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TASKS CHECKLIST */}
        {activeTab === "tasks" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-ink">Volunteer Action Checklist</h3>
            <div className="space-y-2.5">
              {tasks.map((t) => (
                <Card key={t.id} className="p-4 border border-line flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.priority === "High" ? "bg-red-50 text-danger border border-red-200" : "bg-slate-100 text-slate-700"}`}>
                        {t.priority} Priority
                      </span>
                      <span className="font-bold text-ink">{t.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-line font-bold text-muted-ink">{t.status}</span>
                    </div>
                    <p className="text-muted-ink">{t.description}</p>
                    <p className="text-[11px] text-muted-ink mt-1">Due: {t.dueDate} · Project: {t.projectTitle}</p>
                  </div>
                  {t.status !== "Completed" && (
                    <button
                      onClick={() => handleCompleteTask(t.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shrink-0"
                    >
                      Done
                    </button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MEETINGS */}
        {activeTab === "meetings" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-ink">Review Sessions & Agendas</h3>
            <div className="space-y-3">
              {meetings.map((m) => (
                <Card key={m.id} className="p-4 border border-line text-xs">
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <h4 className="font-bold text-sm text-ink">{m.title}</h4>
                      <p className="text-muted-ink">{m.projectTitle}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand/10 text-brand">{m.meetingType}</span>
                  </div>
                  <p className="text-ink mt-2 bg-canvas/40 p-2.5 rounded-lg border border-line">
                    <strong>Agenda:</strong> {m.agenda}
                  </p>
                  <div className="flex items-center justify-between mt-3 text-muted-ink text-[11px]">
                    <span className="flex items-center gap-1"><Calendar className="size-3 text-brand" /> {m.date} at {m.startTime}</span>
                    <span>{m.meetingProvider}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: NEW MENTOR REQUEST & NOMINATION */}
        {showNewMentorReqModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowNewMentorReqModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Sparkles className="size-4 text-brand" /> Submit Mentor Allocation Request
                </h3>
                <button onClick={() => setShowNewMentorReqModal(false)}><X className="size-4 text-muted-ink" /></button>
              </div>

              <form onSubmit={handleCreateMentorNomination} className="p-6 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-ink mb-1">Select Student Project *</label>
                  <select value={newReqProjectId} onChange={(e) => setNewReqProjectId(e.target.value)} className="w-full px-3 py-2 border border-line rounded-lg bg-white">
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} ({p.leadStudent})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Requested Technical Expertise *</label>
                  <input type="text" required value={newReqExpertise} onChange={(e) => setNewReqExpertise(e.target.value)} placeholder="e.g. Agritech Sensors, Cloud Scalability" className="w-full px-3 py-2 border border-line rounded-lg bg-white" />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Nominated Mentor Name (Optional)</label>
                  <input type="text" value={newReqNominatedMentor} onChange={(e) => setNewReqNominatedMentor(e.target.value)} placeholder="e.g. Dr. Sunita Kapoor (Biopack Ltd)" className="w-full px-3 py-2 border border-line rounded-lg bg-white" />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Technical Problem Description / Justification *</label>
                  <textarea rows={3} required value={newReqJustification} onChange={(e) => setNewReqJustification(e.target.value)} placeholder="Explain the exact bottleneck or scale-up hurdle..." className="w-full px-3 py-2 border border-line rounded-lg resize-none bg-white" />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button type="button" onClick={() => setShowNewMentorReqModal(false)} className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 font-bold bg-brand text-white rounded-lg hover:bg-brand-hover">Submit for Coordinator Review</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: LOG ADVISORY GUIDANCE */}
        {showGuidanceModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowGuidanceModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <MessageSquare className="size-4 text-brand" /> Record Advisory Guidance
                </h3>
                <button onClick={() => setShowGuidanceModal(null)}><X className="size-4 text-muted-ink" /></button>
              </div>

              <form onSubmit={handleSaveGuidance} className="p-6 space-y-4 text-xs">
                <div>
                  <p className="text-muted-ink">Student Inquiry ({showGuidanceModal.studentName}):</p>
                  <p className="font-semibold text-ink bg-canvas p-2.5 rounded-lg border border-line mt-1">"{showGuidanceModal.question}"</p>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1.5">Advisor Guidance / Recommended Steps *</label>
                  <textarea rows={4} required value={guidanceResponse} onChange={(e) => setGuidanceResponse(e.target.value)} placeholder="Enter technical advice, documentation links, or action items..." className="w-full px-3 py-2 border border-line rounded-lg resize-none bg-white" />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button type="button" onClick={() => setShowGuidanceModal(null)} className="px-4 py-2 font-semibold text-muted-ink border border-line rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 font-bold bg-brand text-white rounded-lg hover:bg-brand-hover">Save & Dispatch to Team</button>
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
