/**
 * Faculty Management Data Service
 * Isolated data layer providing strongly-typed state, validation rules,
 * role-aware permission policies, and mock data for DBITIC Incubation Center.
 */

export type FacultySubRole = "coordinator" | "volunteer";

export type MentorAllocationStatus =
  | "requested"
  | "under_review"
  | "recommended"
  | "approved"
  | "rejected"
  | "allocated";

export interface StudentTeamMember {
  name: string;
  rollNumber: string;
  department: string;
  email: string;
  role: string;
}

export interface IncubationProject {
  id: string;
  title: string;
  domain: string;
  stage: "Ideation" | "Research" | "Prototype" | "Validation" | "Incubated";
  leadStudent: string;
  rollNumber: string;
  department: string;
  teamMembers: StudentTeamMember[];
  assignedCoordinatorId: string;
  assignedCoordinatorName: string;
  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
  allocatedMentorId?: string;
  allocatedMentorName?: string;
  trl: number;
  progress: number;
  health: "On Track" | "Needs Attention" | "At Risk";
  overdueMilestonesCount: number;
  nextMilestone: string;
  nextMilestoneDate: string;
  description: string;
  lastUpdated: string;
}

export interface MentorAllocationRequest {
  id: string;
  projectId: string;
  projectTitle: string;
  studentName: string;
  studentRollNo: string;
  domain: string;
  requestedExpertise: string[];
  justification: string;
  recommendedMentorName?: string;
  recommendedMentorOrg?: string;
  recommendedByVolunteerName?: string;
  status: MentorAllocationStatus;
  coordinatorComment?: string;
  allocatedMentorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacultyMeeting {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  participants: string[];
  date: string;
  startTime: string;
  durationMinutes: number;
  timeZone: string;
  meetingType: "Milestone Review" | "Technical Mentorship" | "Progress Check-in" | "Grant Advisory";
  agenda: string;
  meetingProvider: "Google Meet" | "Microsoft Teams" | "In-Person (DBITIC Lab 402)";
  meetingLinkOrLocation: string;
  invitationStatus: "Sent" | "Confirmed" | "Completed" | "Pending";
  notes?: string;
  attendanceLogged?: boolean;
}

export interface FacultyTask {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  assignedTo: string;
  assignedRole: FacultySubRole | "student";
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed" | "Overdue";
  description: string;
}

export interface ProgressReport {
  id: string;
  projectId: string;
  projectTitle: string;
  studentName: string;
  submissionDate: string;
  milestoneName: string;
  summary: string;
  keyBlockers: string;
  trlClaimed: number;
  status: "Submitted" | "Reviewed" | "Revision Requested";
  facultyFeedback?: string;
}

export interface StudentSupportRequest {
  id: string;
  projectId: string;
  projectTitle: string;
  studentName: string;
  category: "Technical Hardware" | "Cloud Architecture" | "IP Filing" | "Mentor Guidance";
  question: string;
  submittedAt: string;
  status: "Open" | "Resolved";
  volunteerResponse?: string;
}

export interface FacultyNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: "assignment" | "mentor" | "meeting" | "support" | "deadline";
  read: boolean;
  priority: "normal" | "urgent";
}

export interface AuditHistoryItem {
  id: string;
  actor: string;
  role: FacultySubRole;
  action: string;
  target: string;
  timestamp: string;
  details: string;
}

// ---------------------------------------------------------------------------
// Role Permission Validator Policies
// ---------------------------------------------------------------------------

export const FacultyPermissions = {
  canApproveMentorAllocation: (role: FacultySubRole) => role === "coordinator",
  canRejectMentorAllocation: (role: FacultySubRole) => role === "coordinator",
  canAssignFacultyVolunteers: (role: FacultySubRole) => role === "coordinator",
  canPublishAnnouncements: (role: FacultySubRole) => role === "coordinator",
  canScheduleOfficialReview: (role: FacultySubRole) => role === "coordinator",

  canRecommendMentor: (_role: FacultySubRole) => true, // both can recommend
  canLogStudentGuidance: (_role: FacultySubRole) => true,
  canRequestMeetings: (_role: FacultySubRole) => true,
  canUpdateTaskProgress: (_role: FacultySubRole) => true,
  canReviewMilestoneSubmissions: (_role: FacultySubRole) => true,
};

// ---------------------------------------------------------------------------
// Initial Seed Data (DBITIC Incubation Context)
// ---------------------------------------------------------------------------

// Sample data used to live here. Every list is now read from the backend and scoped to the signed-in user.

// ---------------------------------------------------------------------------
// Backend API Integration Layer
// Connects frontend to Express backend and MongoDB database
// ---------------------------------------------------------------------------
// Same-origin authenticated proxy (src/app/api/backend): the backend sees the real signed-in user.
const API_BASE = "/api/backend";

export async function fetchFacultyOverview(): Promise<{
  metrics?: Record<string, unknown>;
  projects?: IncubationProject[];
  mentorRequests?: MentorAllocationRequest[];
  meetings?: FacultyMeeting[];
  tasks?: FacultyTask[];
}> {
  const res = await fetch(`${API_BASE}/faculty/overview`, {
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok || !data.success || !data.data) {
    throw new Error(data.message || `Faculty overview request failed (${res.status})`);
  }
  return data.data;
}

export async function fetchFacultyProjects(): Promise<IncubationProject[]> {
  const res = await fetch(`${API_BASE}/faculty/projects`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || `Faculty projects request failed (${res.status})`);
  }
  return json.data;
}

export async function fetchMentorAllocations(): Promise<MentorAllocationRequest[]> {
  const res = await fetch(`${API_BASE}/faculty/mentor-allocations`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || `Mentor allocations request failed (${res.status})`);
  }
  return json.data;
}

export async function submitMentorAllocationRequest(payload: {
  projectId: string;
  justification: string;
  requestedExpertise?: string[];
  recommendedMentorName?: string;
  recommendedMentorOrg?: string;
  recommendedByVolunteerName?: string;
}): Promise<MentorAllocationRequest | null> {
  try {
    const res = await fetch(`${API_BASE}/faculty/mentor-allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.error("[FacultyAPI] submitMentorAllocationRequest error:", err);
  }
  return null;
}

export async function decideMentorAllocation(
  id: string,
  decision: "approved" | "rejected",
  comment: string,
  allocatedMentorName?: string
): Promise<MentorAllocationRequest | null> {
  try {
    const res = await fetch(`${API_BASE}/faculty/mentor-allocations/${id}/decide`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ decision, comment, allocatedMentorName }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.error("[FacultyAPI] decideMentorAllocation error:", err);
  }
  return null;
}

export async function fetchFacultyMeetings(): Promise<FacultyMeeting[]> {
  const res = await fetch(`${API_BASE}/faculty/meetings`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || `Faculty meetings request failed (${res.status})`);
  }
  return json.data;
}

export async function createFacultyMeeting(payload: Partial<FacultyMeeting>): Promise<FacultyMeeting | null> {
  try {
    const res = await fetch(`${API_BASE}/faculty/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.error("[FacultyAPI] createFacultyMeeting error:", err);
  }
  return null;
}

export async function fetchFacultyTasks(): Promise<FacultyTask[]> {
  const res = await fetch(`${API_BASE}/faculty/tasks`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || `Faculty tasks request failed (${res.status})`);
  }
  return json.data;
}

export async function createFacultyTask(payload: Partial<FacultyTask>): Promise<FacultyTask | null> {
  try {
    const res = await fetch(`${API_BASE}/faculty/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.error("[FacultyAPI] createFacultyTask error:", err);
  }
  return null;
}

export async function updateFacultyTaskStatus(id: string, status: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/faculty/tasks/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch (err) {
    console.error("[FacultyAPI] updateFacultyTaskStatus error:", err);
    return false;
  }
}

export async function fetchSupportRequests(): Promise<StudentSupportRequest[]> {
  const res = await fetch(`${API_BASE}/faculty/support-requests`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || `Support requests failed (${res.status})`);
  }
  return json.data;
}

export async function respondSupportRequest(id: string, response: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/faculty/support-requests/${id}/respond`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ response }),
    });
    return res.ok;
  } catch (err) {
    console.error("[FacultyAPI] respondSupportRequest error:", err);
    return false;
  }
}

export async function broadcastFacultyAnnouncement(title: string, body: string, targetRole: string = "all"): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/faculty/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, body, targetRole }),
    });
    return res.ok;
  } catch (err) {
    console.error("[FacultyAPI] broadcastFacultyAnnouncement error:", err);
    return false;
  }
}

export async function updateMeetingNotes(id: string, notes: string, attendanceLogged: boolean = true): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/faculty/meetings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ notes, attendanceLogged, invitationStatus: "Confirmed" }),
    });
    return res.ok;
  } catch (err) {
    console.error("[FacultyAPI] updateMeetingNotes error:", err);
    return false;
  }
}

export async function decideProjectReview(
  id: string,
  decision: "approved" | "rejected",
  allocatedMentorName?: string
): Promise<IncubationProject | null> {
  try {
    const res = await fetch(`${API_BASE}/api/faculty/projects/${id}/decision`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ decision, allocatedMentorName }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.error("[FacultyAPI] decideProjectReview error:", err);
  }
  return null;
}

export async function assignProjectVolunteer(id: string, volunteerName: string): Promise<IncubationProject | null> {
  try {
    const res = await fetch(`${API_BASE}/api/faculty/projects/${id}/assign-volunteer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ volunteerName }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.error("[FacultyAPI] assignProjectVolunteer error:", err);
  }
  return null;
}

// ===========================================================================
// AI AGENTS ENGINE TYPES & API CLIENTS
// ===========================================================================

export interface MentorRecommendation {
  mentor_id: string;
  name: string;
  domain: string;
  company: string;
  role: string;
  email: string;
  match_score: number;
  score_breakdown: {
    domain_match: number;
    skills_match: number;
    availability: number;
  };
  explanation: string;
  matched_skills: string[];
  duplicate_allocation_warning: boolean;
  capacity_conflict_warning: boolean;
  current_load: number;
  max_load: number;
}

export interface MentorMatchingRun {
  id: string;
  projectId: string;
  projectTitle: string;
  domain: string;
  stage: string;
  challenges: string;
  requestedExpertise: string[];
  executionStatus: "idle" | "queued" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string;
  evaluatedMentorsCount: number;
  recommendations: MentorRecommendation[];
  warnings: string[];
  coordinatorDecision: {
    status: "pending" | "approved" | "rejected";
    selectedMentorId?: string | null;
    selectedMentorName?: string | null;
    decidedBy?: string | null;
    decidedAt?: string | null;
    comments?: string;
  };
  linkedAllocationId?: string | null;
  linkedWorkflowExecutionId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface WorkflowExecution {
  id: string;
  actionType: "assign_task" | "schedule_meeting" | "send_reminder" | "request_progress_report";
  status: "pending" | "queued" | "running" | "completed" | "failed" | "cancelled";
  projectId: string;
  projectTitle: string;
  actorId: string;
  actorRole: string;
  actorName: string;
  targetId: string;
  targetName: string;
  targetRole: string;
  targetEmail: string;
  payload: Record<string, any>;
  idempotencyKey: string;
  deliveryStatus: "queued" | "delivered" | "failed" | "acknowledged";
  deliveryTimestamp: string;
  deliveryReceipt: string;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string | null;
  startedAt: string;
  completedAt: string;
  linkedRecord?: {
    modelName?: string | null;
    recordId?: string | null;
  };
  linkedMonitoringReportId?: string | null;
  linkedMentorMatchingRunId?: string | null;
  executionLogs: {
    timestamp: string;
    message: string;
    level: string;
  }[];
  createdAt: string;
}

export interface AgentDomainEvent {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  projectId?: string | null;
  applicationId?: string | null;
  actorId: string;
  correlationId: string;
  status: "pending" | "processing" | "completed" | "failed" | "dead_letter";
  attempts: number;
  payload: Record<string, any>;
  processedAt?: string | null;
  lastError?: string | null;
  createdAt: string;
}

export interface MonitoringReport {
  id: string;
  projectId: string;
  projectTitle: string;
  domain: string;
  stage: string;
  leadStudent: string;
  executionStatus: "idle" | "queued" | "running" | "completed" | "failed";
  executedAt: string;
  executedBy: string;
  nextScheduledMonitoring?: string | null;
  measuredFacts: {
    milestonesTotal: number;
    milestonesCompleted: number;
    milestonesOverdue: number;
    milestonesPending: number;
    milestoneCompletionRate: number;
    tasksTotal: number;
    tasksCompleted: number;
    tasksPending: number;
    tasksOverdue: number;
    daysSinceLastReport: number;
    activeMentorshipMeetings: number;
  };
  aiObservation: {
    healthStatus: "On Track" | "Needs Attention" | "At Risk" | "No Data";
    confidenceScore: number;
    summary: string;
    riskFactors: string[];
    strengths: string[];
    explanation: string;
  };
  recommendedInterventions: {
    id: string;
    title: string;
    type: "task" | "meeting" | "reminder" | "progress_report";
    priority: "High" | "Medium" | "Low";
    description: string;
    assigned: boolean;
    workflowExecutionId?: string | null;
    assignedAt?: string | null;
    assignedTo?: string | null;
  }[];
  alert: {
    active: boolean;
    severity: "low" | "medium" | "high" | "critical";
    acknowledged: boolean;
    acknowledgedBy?: string | null;
    acknowledgedAt?: string | null;
    notes?: string;
  };
  createdAt: string;
}

export interface MonitoringOverview {
  total: number;
  onTrack: number;
  needsAttention: number;
  atRisk: number;
  noData: number;
  overdueMilestones: number;
  incompleteTasks: number;
  activeAlerts: number;
  lastMonitoringDate: string | null;
  nextScheduledMonitoring: string | null;
}

// ---------------------------------------------------------------------------
// 1. AI MENTOR MATCHING CALLS
// ---------------------------------------------------------------------------

export async function fetchStartupsForMatching(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/faculty/mentor-matching/startups`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch startups");
  return json.data;
}

export async function runMentorMatching(projectId: string): Promise<MentorMatchingRun> {
  const res = await fetch(`${API_BASE}/faculty/mentor-matching/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ projectId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to run mentor matching");
  return json.data;
}

export async function fetchMentorMatchingRuns(projectId?: string): Promise<MentorMatchingRun[]> {
  const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  const res = await fetch(`${API_BASE}/faculty/mentor-matching/runs${q}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch runs");
  return json.data;
}

export async function decideMentorRecommendation(
  runId: string,
  decision: "approved" | "rejected",
  selectedMentorId?: string,
  selectedMentorName?: string,
  comments?: string
): Promise<MentorMatchingRun> {
  const res = await fetch(`${API_BASE}/faculty/mentor-matching/runs/${runId}/decide`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ decision, selectedMentorId, selectedMentorName, comments }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to record decision");
  return json.data;
}

// ---------------------------------------------------------------------------
// 2. AI WORKFLOW AUTOMATION CALLS
// ---------------------------------------------------------------------------

export async function fetchWorkflowExecutions(filter?: {
  projectId?: string;
  actionType?: string;
  status?: string;
}): Promise<WorkflowExecution[]> {
  const params = new URLSearchParams();
  if (filter?.projectId) params.set("projectId", filter.projectId);
  if (filter?.actionType) params.set("actionType", filter.actionType);
  if (filter?.status) params.set("status", filter.status);

  const res = await fetch(`${API_BASE}/faculty/workflow/executions?${params.toString()}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch workflow executions");
  return json.data;
}

export async function fetchAgentDomainEvents(filter?: { projectId?: string; status?: string }): Promise<AgentDomainEvent[]> {
  const params = new URLSearchParams();
  if (filter?.projectId) params.set("projectId", filter.projectId);
  if (filter?.status) params.set("status", filter.status);
  const res = await fetch(`${API_BASE}/faculty/agent-events?${params.toString()}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch agent events");
  return json.data;
}

export async function coordinateWorkflowAction(payload: {
  action_type: string;
  project_id?: string;
  project_title?: string;
  target_id: string;
  target_name?: string;
  target_role?: string;
  target_email?: string;
  payload?: Record<string, any>;
}): Promise<WorkflowExecution> {
  const res = await fetch(`${API_BASE}/faculty/workflow/coordinate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to coordinate workflow action");
  return json.data;
}

export async function retryWorkflowExecution(executionId: string): Promise<WorkflowExecution> {
  const res = await fetch(`${API_BASE}/faculty/workflow/executions/${executionId}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to retry workflow action");
  return json.data;
}

export async function cancelWorkflowExecution(executionId: string): Promise<WorkflowExecution> {
  const res = await fetch(`${API_BASE}/faculty/workflow/executions/${executionId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to cancel workflow action");
  return json.data;
}

// ---------------------------------------------------------------------------
// 3. AI STARTUP MONITORING CALLS
// ---------------------------------------------------------------------------

export async function fetchMonitoringOverview(): Promise<MonitoringOverview> {
  const res = await fetch(`${API_BASE}/faculty/monitoring/overview`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch monitoring overview");
  return json.data;
}

export async function fetchMonitoringReports(filter?: {
  projectId?: string;
  healthStatus?: string;
}): Promise<MonitoringReport[]> {
  const params = new URLSearchParams();
  if (filter?.projectId) params.set("projectId", filter.projectId);
  if (filter?.healthStatus) params.set("healthStatus", filter.healthStatus);

  const res = await fetch(`${API_BASE}/faculty/monitoring/reports?${params.toString()}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch monitoring reports");
  return json.data;
}

export async function evaluateStartupMonitoring(projectId: string): Promise<MonitoringReport> {
  const res = await fetch(`${API_BASE}/faculty/monitoring/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ projectId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to evaluate startup monitoring");
  return json.data;
}

export async function evaluatePortfolioMonitoring(): Promise<{
  overview: MonitoringOverview;
  reports: MonitoringReport[];
}> {
  const res = await fetch(`${API_BASE}/faculty/monitoring/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to run portfolio monitoring");
  return json.data;
}

export async function acknowledgeMonitoringAlert(reportId: string, notes?: string): Promise<MonitoringReport> {
  const res = await fetch(`${API_BASE}/faculty/monitoring/reports/${reportId}/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ notes }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to acknowledge alert");
  return json.data;
}

export async function assignMonitoringIntervention(
  reportId: string,
  interventionId: string,
  assignedTo?: string,
  customTitle?: string
): Promise<{ report: MonitoringReport; intervention: any; execution: WorkflowExecution }> {
  const res = await fetch(`${API_BASE}/faculty/monitoring/reports/${reportId}/intervene`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ interventionId, assignedTo, customTitle }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to assign intervention");
  return json.data;
}
