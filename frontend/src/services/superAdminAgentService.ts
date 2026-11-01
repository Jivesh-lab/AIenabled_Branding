/**
 * frontend/src/services/superAdminAgentService.ts
 * ==============================================================================
 * Super Admin Technical Agent Governance & Telemetry Service
 * Communicates with backend /api/super-admin/agents endpoints.
 * Enforces super_admin authorization and returns raw telemetry & traces.
 * ==============================================================================
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface SuperAdminMentorMatchingGovernance {
  agentHealth: string;
  pingLatencyMs: number;
  serviceStatus: {
    status: string;
    latencyMs: number;
    data?: any;
    error?: string;
  };
  orchestratorStatus: string;
  metrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    avgDurationMs: number;
    retryCount: number;
    toolFailuresCount: number;
    lastSuccessfulExecution: string | null;
  };
  configuration: {
    node: string;
    framework: string;
    provider: string;
    embeddingModel: string;
    scoringWeights: Record<string, number>;
    endpoint: string;
    idempotencyEnabled: boolean;
  };
  executionTraces: Array<{
    traceId: string;
    runId: string;
    projectId: string;
    projectTitle: string;
    domain: string;
    status: string;
    latencyMs: number;
    tokensUsed: number;
    fallbackUsed: boolean;
    recommendationsCount: number;
    recommendationScores: Array<{
      mentorId: string;
      mentorName: string;
      overallScore: number;
      breakdown: any;
      availability: any;
      conflict: string | null;
    }>;
    createdAt: string;
  }>;
}

export interface SuperAdminWorkflowGovernance {
  agentHealth: string;
  scheduler: {
    status: string;
    pollingIntervalMs: number;
    batchSize: number;
    lockDurationSeconds: number;
  };
  worker: {
    pid: number;
    uptimeSeconds: number;
    nodeVersion: string;
    memoryUsageMb: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
  };
  queue: {
    totalEvents: number;
    pendingEvents: number;
    processingEvents: number;
    completedEvents: number;
    failedEvents: number;
    deadLetterCount: number;
  };
  serviceConnectivity: {
    expressApi: { status: string; port: number };
    agentService: { status: string; port: number; latencyMs: number };
    mongodb: { status: string };
    sqliteFallback: { status: string };
  };
  deadLetterQueue: Array<{
    eventId: string;
    eventType: string;
    aggregateType: string;
    attempts: number;
    maxAttempts: number;
    lastError: string;
    createdAt: string;
    updatedAt: string;
  }>;
  executionLogs: Array<{
    id: string;
    actionType: string;
    projectId: string;
    projectTitle: string;
    targetRole: string;
    targetName: string;
    status: string;
    retryCount: number;
    maxRetries: number;
    error: string | null;
    createdAt: string;
    deliveredAt: string | null;
  }>;
}

export interface SuperAdminMonitoringGovernance {
  agentHealth: string;
  schedulerStatus: {
    cronSchedule: string;
    active: boolean;
    lastSweep: string | null;
    nextScheduledSweep: string;
  };
  metrics: {
    totalEvaluations: number;
    failedEvaluations: number;
    avgDurationMs: number;
    schedulerErrors: string[];
  };
  databaseConnectivity: {
    mongo: string;
    latencyMs: number;
  };
  executionTraces: Array<{
    traceId: string;
    reportId: string;
    projectId: string;
    projectTitle: string;
    healthStatus: string;
    healthScore: number;
    riskFlagsCount: number;
    interventionsCount: number;
    latencyMs: number;
    tokensUsed: number;
    fallbackUsed: boolean;
    evaluatedAt: string;
  }>;
}

export async function fetchSuperAdminMentorMatchingGovernance(): Promise<SuperAdminMentorMatchingGovernance> {
  const res = await fetch(`${API_BASE}/api/super-admin/agents/mentor-matching/governance`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch Super Admin mentor-matching governance`);
  const data = await res.json();
  return data.data;
}

export async function fetchSuperAdminWorkflowGovernance(): Promise<SuperAdminWorkflowGovernance> {
  const res = await fetch(`${API_BASE}/api/super-admin/agents/workflow/governance`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch Super Admin workflow governance`);
  const data = await res.json();
  return data.data;
}

export async function reprocessSuperAdminDeadLetterEvent(eventId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/super-admin/agents/workflow/reprocess-dlq/${encodeURIComponent(eventId)}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to reprocess dead-letter event`);
  return await res.json();
}

export async function fetchSuperAdminMonitoringGovernance(): Promise<SuperAdminMonitoringGovernance> {
  const res = await fetch(`${API_BASE}/api/super-admin/agents/monitoring/governance`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch Super Admin monitoring governance`);
  const data = await res.json();
  return data.data;
}

export async function pingAgentServiceDiagnostic(): Promise<{ status: string; latencyMs: number }> {
  const res = await fetch(`${API_BASE}/api/super-admin/agents/ping`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed diagnostic ping`);
  const data = await res.json();
  return data.ping;
}

