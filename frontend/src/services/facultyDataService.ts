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

export const INITIAL_PROJECTS: IncubationProject[] = [
  {
    id: "proj-1",
    title: "AI-Driven Crop Disease Detection using CNNs",
    domain: "AgriTech / ML",
    stage: "Prototype",
    leadStudent: "Priya Sharma",
    rollNumber: "CSE21B042",
    department: "Computer Science",
    teamMembers: [
      { name: "Priya Sharma", rollNumber: "CSE21B042", department: "CSE", email: "priya@student.dbit.ac.in", role: "Team Lead" },
      { name: "Siddharth Rao", rollNumber: "CSE21B049", department: "CSE", email: "siddharth@student.dbit.ac.in", role: "ML Engineer" },
    ],
    assignedCoordinatorId: "fac-coord-1",
    assignedCoordinatorName: "Dr. K. R. Raman (Coordinator)",
    assignedVolunteerId: "fac-vol-1",
    assignedVolunteerName: "Prof. Ananya Sen (Volunteer)",
    allocatedMentorId: "men-101",
    allocatedMentorName: "Dr. Vikram Malhotra (AgriTech Advisor)",
    trl: 5,
    progress: 74,
    health: "On Track",
    overdueMilestonesCount: 0,
    nextMilestone: "Field Pilot Validation in Nashik Orchards",
    nextMilestoneDate: "15 Nov 2026",
    description: "Deep convolutional network for real-time mobile crop disease diagnostics with 94.2% field accuracy.",
    lastUpdated: "2 days ago",
  },
  {
    id: "proj-2",
    title: "Sugarcane Bagasse Biodegradable Packaging Formulation",
    domain: "GreenTech / Materials",
    stage: "Research",
    leadStudent: "Arjun Mehta",
    rollNumber: "CHEM22A018",
    department: "Chemical Tech",
    teamMembers: [
      { name: "Arjun Mehta", rollNumber: "CHEM22A018", department: "CHEM", email: "arjun@student.dbit.ac.in", role: "Material Lead" },
      { name: "Divya Deshmukh", rollNumber: "CHEM22A022", department: "CHEM", email: "divya@student.dbit.ac.in", role: "Testing Analyst" },
    ],
    assignedCoordinatorId: "fac-coord-1",
    assignedCoordinatorName: "Dr. K. R. Raman (Coordinator)",
    assignedVolunteerId: "fac-vol-1",
    assignedVolunteerName: "Prof. Ananya Sen (Volunteer)",
    trl: 3,
    progress: 38,
    health: "Needs Attention",
    overdueMilestonesCount: 1,
    nextMilestone: "Biodegradation ASTM Tensile Testing",
    nextMilestoneDate: "28 Oct 2026",
    description: "Composite polymer matrix utilizing sugarcane bagasse fiber and cross-linked natural plasticizers.",
    lastUpdated: "4 days ago",
  },
  {
    id: "proj-3",
    title: "Smart IoT Water Quality Monitor with Edge Sensing",
    domain: "IoT / Environment",
    stage: "Validation",
    leadStudent: "Kavita Nair",
    rollNumber: "ECE21C077",
    department: "Electronics",
    teamMembers: [
      { name: "Kavita Nair", rollNumber: "ECE21C077", department: "ECE", email: "kavita@student.dbit.ac.in", role: "Hardware Lead" },
      { name: "Nikhil Joshi", rollNumber: "IT21D015", department: "IT", email: "nikhil@student.dbit.ac.in", role: "Firmware Dev" },
    ],
    assignedCoordinatorId: "fac-coord-1",
    assignedCoordinatorName: "Dr. K. R. Raman (Coordinator)",
    assignedVolunteerId: "fac-vol-2",
    assignedVolunteerName: "Prof. Rajiv Menon (Volunteer)",
    allocatedMentorId: "men-102",
    allocatedMentorName: "Sanjay Singhal (CleanTech VP)",
    trl: 6,
    progress: 88,
    health: "On Track",
    overdueMilestonesCount: 0,
    nextMilestone: "Municipal Water Board Commercial Trial",
    nextMilestoneDate: "10 Dec 2026",
    description: "Self-calibrating electrochemical multi-sensor node for real-time drinking water safety surveillance.",
    lastUpdated: "Yesterday",
  },
  {
    id: "proj-4",
    title: "Decentralized Electronic Health Records on Hyperledger",
    domain: "HealthTech / Blockchain",
    stage: "Ideation",
    leadStudent: "Rohan Das",
    rollNumber: "IT22D031",
    department: "Information Technology",
    teamMembers: [
      { name: "Rohan Das", rollNumber: "IT22D031", department: "IT", email: "rohan@student.dbit.ac.in", role: "Lead Architect" },
    ],
    assignedCoordinatorId: "fac-coord-1",
    assignedCoordinatorName: "Dr. K. R. Raman (Coordinator)",
    assignedVolunteerId: "fac-vol-1",
    assignedVolunteerName: "Prof. Ananya Sen (Volunteer)",
    trl: 2,
    progress: 20,
    health: "At Risk",
    overdueMilestonesCount: 2,
    nextMilestone: "Smart Contract POC Specification",
    nextMilestoneDate: "20 Oct 2026",
    description: "Zero-knowledge proof rollup framework ensuring HIPAA-compliant patient-sovereign medical records.",
    lastUpdated: "1 week ago",
  },
];

export const INITIAL_MENTOR_REQUESTS: MentorAllocationRequest[] = [
  {
    id: "mr-1",
    projectId: "proj-2",
    projectTitle: "Sugarcane Bagasse Biodegradable Packaging",
    studentName: "Arjun Mehta",
    studentRollNo: "CHEM22A018",
    domain: "GreenTech / Materials",
    requestedExpertise: ["Biopolymer Scale-up", "Industrial Extrusion Tooling", "Regulatory Food Packaging"],
    justification: "Team needs industry guidance on transitioning from 50g bench-scale samples to 5kg pilot extrusion runs.",
    recommendedMentorName: "Dr. Sunita Kapoor",
    recommendedMentorOrg: "Biopack Innovations Ltd.",
    recommendedByVolunteerName: "Prof. Ananya Sen",
    status: "recommended",
    coordinatorComment: "Reviewing company NDA before issuing official letter of mentorship.",
    createdAt: "08 Oct 2026",
    updatedAt: "11 Oct 2026",
  },
  {
    id: "mr-2",
    projectId: "proj-4",
    projectTitle: "Decentralized Electronic Health Records",
    studentName: "Rohan Das",
    studentRollNo: "IT22D031",
    domain: "HealthTech / Web3",
    requestedExpertise: ["Health Data Compliance (DISHA/HIPAA)", "Private Permissioned Blockchain Architecture"],
    justification: "Student is struggling to structure cryptographic keys across hospital and patient nodes.",
    status: "under_review",
    createdAt: "09 Oct 2026",
    updatedAt: "10 Oct 2026",
  },
  {
    id: "mr-3",
    projectId: "proj-1",
    projectTitle: "AI-Driven Crop Disease Detection using CNNs",
    studentName: "Priya Sharma",
    studentRollNo: "CSE21B042",
    domain: "AgriTech / ML",
    requestedExpertise: ["Farm Advisory Deployment", "Agri-Credit Integration"],
    justification: "To connect farmer pilots with local rural cooperative banks.",
    recommendedMentorName: "Dr. Vikram Malhotra",
    recommendedMentorOrg: "AgriTech Alliance",
    recommendedByVolunteerName: "Prof. Ananya Sen",
    status: "allocated",
    allocatedMentorName: "Dr. Vikram Malhotra",
    coordinatorComment: "Allocated and onboarding brief sent to student and mentor.",
    createdAt: "15 Sep 2026",
    updatedAt: "22 Sep 2026",
  },
];

export const INITIAL_MEETINGS: FacultyMeeting[] = [
  {
    id: "meet-1",
    title: "Stage-3 Milestone Review: AgriTech Edge Accuracy",
    projectId: "proj-1",
    projectTitle: "AI-Driven Crop Disease Detection",
    participants: ["Dr. K. R. Raman", "Prof. Ananya Sen", "Priya Sharma", "Siddharth Rao"],
    date: "18 Oct 2026",
    startTime: "14:00",
    durationMinutes: 45,
    timeZone: "IST (UTC+5:30)",
    meetingType: "Milestone Review",
    agenda: "Review benchmark confusion matrix across 10,000 leaf images and drone shutter speed latency.",
    meetingProvider: "In-Person (DBITIC Lab 402)",
    meetingLinkOrLocation: "DBIT Incubation Centre, Lab 402, Don Bosco Institute of Technology",
    invitationStatus: "Confirmed",
    notes: "Prior lab report accepted. Drone mount hardware verified.",
    attendanceLogged: true,
  },
  {
    id: "meet-2",
    title: "Mentor Onboarding & Project Scope Alignment",
    projectId: "proj-2",
    projectTitle: "Sugarcane Bagasse Biodegradable Packaging",
    participants: ["Prof. Ananya Sen", "Arjun Mehta", "Dr. Sunita Kapoor (Mentor)"],
    date: "22 Oct 2026",
    startTime: "16:00",
    durationMinutes: 30,
    timeZone: "IST (UTC+5:30)",
    meetingType: "Technical Mentorship",
    agenda: "Establish sample testing protocols for biodegradability testing under compost conditions.",
    meetingProvider: "Google Meet",
    meetingLinkOrLocation: "Authorized provider link will generate upon coordinator sign-off",
    invitationStatus: "Pending",
  },
];

export const INITIAL_TASKS: FacultyTask[] = [
  {
    id: "task-1",
    title: "Verify ASTM Biodegradation Lab Certificate",
    projectId: "proj-2",
    projectTitle: "Sugarcane Bagasse Biodegradable Packaging",
    assignedTo: "Prof. Ananya Sen",
    assignedRole: "volunteer",
    dueDate: "20 Oct 2026",
    priority: "High",
    status: "In Progress",
    description: "Check if third-party testing facility complies with ISO 17025 accreditation.",
  },
  {
    id: "task-2",
    title: "Sign and Authorize Dr. Sunita Kapoor Mentor Allocation",
    projectId: "proj-2",
    projectTitle: "Sugarcane Bagasse Biodegradable Packaging",
    assignedTo: "Dr. K. R. Raman",
    assignedRole: "coordinator",
    dueDate: "16 Oct 2026",
    priority: "High",
    status: "Pending",
    description: "Execute official institutional mentor appointment letter.",
  },
  {
    id: "task-3",
    title: "Submit Ethics & Clinical Data Sovereignty Declaration",
    projectId: "proj-4",
    projectTitle: "Decentralized Electronic Health Records",
    assignedTo: "Rohan Das",
    assignedRole: "student",
    dueDate: "19 Oct 2026",
    priority: "Medium",
    status: "Overdue",
    description: "Submit institutional review board compliance form before EHR test datasets are ingested.",
  },
];

export const INITIAL_SUPPORT_REQUESTS: StudentSupportRequest[] = [
  {
    id: "sr-1",
    projectId: "proj-4",
    projectTitle: "Decentralized Electronic Health Records",
    studentName: "Rohan Das",
    category: "Cloud Architecture",
    question: "We need access to the college server rack to deploy our 3-node Hyperledger test network. Who can grant port access?",
    submittedAt: "Yesterday at 11:20 AM",
    status: "Open",
  },
  {
    id: "sr-2",
    projectId: "proj-2",
    projectTitle: "Sugarcane Bagasse Biodegradable Packaging",
    studentName: "Arjun Mehta",
    category: "IP Filing",
    question: "Should we file the provisional patent specification before or after testing with external industry vendors?",
    submittedAt: "3 days ago",
    status: "Resolved",
    volunteerResponse: "Always file the provisional specification FIRST before sending any raw samples under NDA.",
  },
];

export const INITIAL_NOTIFICATIONS: FacultyNotification[] = [
  {
    id: "notif-1",
    title: "New Mentor Allocation Recommendation",
    message: "Prof. Ananya Sen recommended Dr. Sunita Kapoor for Project 'Sugarcane Bagasse Packaging'. Coordinator review needed.",
    timestamp: "2 hours ago",
    category: "mentor",
    read: false,
    priority: "urgent",
  },
  {
    id: "notif-2",
    title: "Overdue Milestone Alert",
    message: "Project 'Decentralized EHR' has passed its Stage-1 deadline by 4 days.",
    timestamp: "Yesterday",
    category: "deadline",
    read: false,
    priority: "urgent",
  },
  {
    id: "notif-3",
    title: "Upcoming Milestone Review Meeting",
    message: "Confirmed: Stage-3 Milestone Review for 'Crop Disease Detection' scheduled on 18 Oct 2026 at 2:00 PM.",
    timestamp: "2 days ago",
    category: "meeting",
    read: true,
    priority: "normal",
  },
];

export const INITIAL_AUDIT_LOGS: AuditHistoryItem[] = [
  {
    id: "aud-1",
    actor: "Prof. Ananya Sen",
    role: "volunteer",
    action: "RECOMMEND_MENTOR",
    target: "Project #proj-2",
    timestamp: "11 Oct 2026, 15:30 IST",
    details: "Recommended Dr. Sunita Kapoor (Biopack Innovations Ltd.) for packaging scale-up.",
  },
  {
    id: "aud-2",
    actor: "Dr. K. R. Raman",
    role: "coordinator",
    action: "ALLOCATE_MENTOR",
    target: "Project #proj-1",
    timestamp: "22 Sep 2026, 11:15 IST",
    details: "Formally approved and allocated Dr. Vikram Malhotra as Agritech Advisor.",
  },
  {
    id: "aud-3",
    actor: "Dr. K. R. Raman",
    role: "coordinator",
    action: "ASSIGN_VOLUNTEER",
    target: "Project #proj-3",
    timestamp: "05 Sep 2026, 10:00 IST",
    details: "Assigned Prof. Rajiv Menon as Faculty Volunteer guide.",
  },
];

// ---------------------------------------------------------------------------
// Backend API Integration Layer
// Connects frontend to Express backend and MongoDB database
// ---------------------------------------------------------------------------
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function fetchFacultyOverview(): Promise<{
  metrics?: Record<string, unknown>;
  projects?: IncubationProject[];
  mentorRequests?: MentorAllocationRequest[];
  meetings?: FacultyMeeting[];
  tasks?: FacultyTask[];
}> {
  const res = await fetch(`${API_BASE}/api/faculty/overview`, {
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok || !data.success || !data.data) {
    throw new Error(data.message || `Faculty overview request failed (${res.status})`);
  }
  return data.data;
}

export async function fetchFacultyProjects(): Promise<IncubationProject[]> {
  const res = await fetch(`${API_BASE}/api/faculty/projects`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || `Faculty projects request failed (${res.status})`);
  }
  return json.data;
}

export async function fetchMentorAllocations(): Promise<MentorAllocationRequest[]> {
  const res = await fetch(`${API_BASE}/api/faculty/mentor-allocations`, { credentials: "include" });
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
    const res = await fetch(`${API_BASE}/api/faculty/mentor-allocations`, {
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
    const res = await fetch(`${API_BASE}/api/faculty/mentor-allocations/${id}/decide`, {
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
  const res = await fetch(`${API_BASE}/api/faculty/meetings`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || `Faculty meetings request failed (${res.status})`);
  }
  return json.data;
}

export async function createFacultyMeeting(payload: Partial<FacultyMeeting>): Promise<FacultyMeeting | null> {
  try {
    const res = await fetch(`${API_BASE}/api/faculty/meetings`, {
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
  const res = await fetch(`${API_BASE}/api/faculty/tasks`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || `Faculty tasks request failed (${res.status})`);
  }
  return json.data;
}

export async function createFacultyTask(payload: Partial<FacultyTask>): Promise<FacultyTask | null> {
  try {
    const res = await fetch(`${API_BASE}/api/faculty/tasks`, {
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
    const res = await fetch(`${API_BASE}/api/faculty/tasks/${id}/status`, {
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
  const res = await fetch(`${API_BASE}/api/faculty/support-requests`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || `Support requests failed (${res.status})`);
  }
  return json.data;
}

export async function respondSupportRequest(id: string, response: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/faculty/support-requests/${id}/respond`, {
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
    const res = await fetch(`${API_BASE}/api/faculty/announcements`, {
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
  const res = await fetch(`${API_BASE}/api/faculty/mentor-matching/startups`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch startups");
  return json.data;
}

export async function runMentorMatching(projectId: string): Promise<MentorMatchingRun> {
  const res = await fetch(`${API_BASE}/api/faculty/mentor-matching/run`, {
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
  const res = await fetch(`${API_BASE}/api/faculty/mentor-matching/runs${q}`, { credentials: "include" });
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
  const res = await fetch(`${API_BASE}/api/faculty/mentor-matching/runs/${runId}/decide`, {
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

  const res = await fetch(`${API_BASE}/api/faculty/workflow/executions?${params.toString()}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch workflow executions");
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
  const res = await fetch(`${API_BASE}/api/faculty/workflow/coordinate`, {
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
  const res = await fetch(`${API_BASE}/api/faculty/workflow/executions/${executionId}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to retry workflow action");
  return json.data;
}

export async function cancelWorkflowExecution(executionId: string): Promise<WorkflowExecution> {
  const res = await fetch(`${API_BASE}/api/faculty/workflow/executions/${executionId}/cancel`, {
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
  const res = await fetch(`${API_BASE}/api/faculty/monitoring/overview`, { credentials: "include" });
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

  const res = await fetch(`${API_BASE}/api/faculty/monitoring/reports?${params.toString()}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch monitoring reports");
  return json.data;
}

export async function evaluateStartupMonitoring(projectId: string): Promise<MonitoringReport> {
  const res = await fetch(`${API_BASE}/api/faculty/monitoring/evaluate`, {
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
  const res = await fetch(`${API_BASE}/api/faculty/monitoring/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to run portfolio monitoring");
  return json.data;
}

export async function acknowledgeMonitoringAlert(reportId: string, notes?: string): Promise<MonitoringReport> {
  const res = await fetch(`${API_BASE}/api/faculty/monitoring/reports/${reportId}/acknowledge`, {
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
  const res = await fetch(`${API_BASE}/api/faculty/monitoring/reports/${reportId}/intervene`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ interventionId, assignedTo, customTitle }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Failed to assign intervention");
  return json.data;
}
