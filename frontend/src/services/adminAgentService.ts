/**
 * frontend/src/services/adminAgentService.ts
 * ==============================================================================
 * Admin Center-Wide AI Agent Management & Performance Oversight Service
 * Communicates with backend /api/admin/agents endpoints.
 * Enforces admin authorization and provides center-wide metrics.
 * ==============================================================================
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface AdminMentorMatchingOverview {
  totalEligible: number;
  allocatedCount: number;
  withoutMentors: number;
  awaitingMatching: number;
  pendingCoordinatorDecisionsCount: number;
  allocationCoverageRate: number;
  mentorCapacityDistribution: Array<{
    domain: string;
    totalStartups: number;
    withMentors: number;
    pending: number;
  }>;
  coordinatorActivity: Array<{
    coordinatorName: string;
    assignedStartups: number;
    allocatedMentors: number;
    pendingDecisions: number;
  }>;
  unresolvedConflicts: Array<{
    runId: string;
    projectId: string;
    projectTitle: string;
    conflicts: Array<{
      mentorName: string;
      warning: string;
    }>;
    decisionStatus: string;
    createdAt: string;
  }>;
  recentRuns: Array<any>;
}

export interface AdminWorkflowOverview {
  totalWorkflows: number;
  activeWorkflows: number;
  overdueCount: number;
  failedNotifications: number;
  pendingMeetings: number;
  unresolvedFollowups: number;
  performance: {
    completionRate: number;
    avgResponseTimeDays: number;
  };
  bottlenecks: Array<{
    projectTitle: string;
    overdueCount: number;
  }>;
  facultyActivity: Array<{
    coordinatorName: string;
    tasksCreated: number;
    meetingsScheduled: number;
  }>;
  recentExecutions: Array<any>;
}

export interface AdminMonitoringOverview {
  portfolioCounts: {
    total: number;
    onTrack: number;
    needsAttention: number;
    atRisk: number;
  };
  avgHealthScore: number;
  departmentBreakdown: Array<{
    department: string;
    total: number;
    onTrack: number;
    needsAttention: number;
    atRisk: number;
  }>;
  stageBreakdown: Array<{
    stage: string;
    count: number;
    avgProgress: number;
  }>;
  highRiskStartups: Array<{
    id: string;
    title: string;
    domain: string;
    health: string;
    overdueMilestonesCount: number;
    coordinator: string;
    nextMilestone: string;
    nextMilestoneDate: string;
  }>;
  facultyFollowUpStatus: Array<{
    coordinatorName: string;
    pendingInterventions: number;
    assignedProjects: string[];
  }>;
  riskTrends: {
    improving: number;
    stable: number;
    deteriorating: number;
  };
  recentReports: Array<any>;
}

export async function fetchAdminMentorMatchingOverview(): Promise<AdminMentorMatchingOverview> {
  const res = await fetch(`${API_BASE}/api/admin/agents/mentor-matching/overview`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch admin mentor-matching overview`);
  const data = await res.json();
  return data.data;
}

export async function triggerAdminMentorMatchingSweep(): Promise<{ triggeredCount: number }> {
  const res = await fetch(`${API_BASE}/api/admin/agents/mentor-matching/trigger-sweep`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to trigger matching sweep`);
  const data = await res.json();
  return data.data;
}

export async function sendCoordinatorReminder(runId: string, coordinatorName?: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/agents/mentor-matching/remind-coordinator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ runId, coordinatorName }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to send coordinator reminder`);
  return await res.json();
}

export async function fetchAdminWorkflowOverview(): Promise<AdminWorkflowOverview> {
  const res = await fetch(`${API_BASE}/api/admin/agents/workflow/overview`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch admin workflow overview`);
  const data = await res.json();
  return data.data;
}

export async function broadcastAdminWorkflowReminder(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/agents/workflow/broadcast-reminder`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to broadcast reminder`);
  return await res.json();
}

export async function retryAdminFailedWorkflows(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/agents/workflow/retry-failed`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to retry failed workflows`);
  return await res.json();
}

export async function fetchAdminMonitoringOverview(): Promise<AdminMonitoringOverview> {
  const res = await fetch(`${API_BASE}/api/admin/agents/monitoring/overview`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch admin monitoring overview`);
  const data = await res.json();
  return data.data;
}

export async function triggerAdminMonitoringSweep(): Promise<{ evaluatedCount: number }> {
  const res = await fetch(`${API_BASE}/api/admin/agents/monitoring/trigger-sweep`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to trigger portfolio monitoring sweep`);
  const data = await res.json();
  return data.data;
}

