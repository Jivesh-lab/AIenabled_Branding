import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { SignJWT } from "jose";
import { authOptions } from "@/lib/auth";
import { createBackendToken } from "@/lib/backendToken";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:8000";

function getInternalJwtSecret(): string {
  const secret = process.env.INTERNAL_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: INTERNAL_JWT_SECRET must be configured in production.");
    }
    return "test_internal_secret_key_123";
  }
  if (process.env.NODE_ENV === "production" && secret === "test_internal_secret_key_123") {
    throw new Error("FATAL: Insecure test INTERNAL_JWT_SECRET cannot be used in production.");
  }
  return secret;
}

// Simple in-memory timestamp tracker to debounce / rate-limit matchmaking requests
const lastRequestByInvestor = new Map<string, number>();

interface StartupCandidateRaw {
  id: string;
  name: string;
  tagline?: string;
  problem?: string;
  solution?: string;
  sector?: string;
  stage?: string;
  readinessScore?: number;
  tags?: string[];
  tractionSummary?: string | null;
  isSaved?: boolean;
  interestLevel?: string | null;
}

export async function POST() {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "investor" && session.user.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // Rate-limiting check: 2 seconds minimum between evaluations
    const now = Date.now();
    // Prune stale entries if map grows
    if (lastRequestByInvestor.size > 200) {
      for (const [invId, ts] of lastRequestByInvestor.entries()) {
        if (now - ts > 60000) lastRequestByInvestor.delete(invId);
      }
    }

    const lastReq = lastRequestByInvestor.get(session.user.id) || 0;
    if (now - lastReq < 2000) {
      return NextResponse.json(
        { success: false, message: "Please wait a moment before requesting another evaluation." },
        { status: 429 }
      );
    }
    lastRequestByInvestor.set(session.user.id, now);

    // 2. Fetch authenticated investor's profile from authoritative MongoDB backend
    const backendToken = await createBackendToken(session.user.id, session.user.role);
    const profileRes = await fetch(`${BACKEND_URL}/api/investors/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${backendToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (!profileRes.ok) {
      const errData = await profileRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, message: errData.message || "Failed to load investor profile" },
        { status: profileRes.status }
      );
    }

    const profileData = await profileRes.json();
    const investorDetails = profileData.profile?.details || {};

    // 3. Fetch approved, active startups from authoritative MongoDB backend
    const startupsRes = await fetch(`${BACKEND_URL}/api/investors/startups`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${backendToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (!startupsRes.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to retrieve approved startup candidates" },
        { status: startupsRes.status }
      );
    }

    const startupsData = await startupsRes.json();
    const rawStartups: StartupCandidateRaw[] = startupsData.startups || [];

    // Map into sanitized candidate payload strictly excluding private notes/docs
    // Cap at 150 candidates to respect agent service boundaries
    const cappedStartups = rawStartups.slice(0, 150);
    const candidates = cappedStartups.map((s) => ({
      id: String(s.id),
      name: s.name,
      tagline: s.tagline || "",
      problem: s.problem || "",
      solution: s.solution || "",
      sector: s.sector || "",
      stage: s.stage || "",
      readinessScore: typeof s.readinessScore === "number" ? Math.max(0, Math.min(100, s.readinessScore)) : 0,
      tags: Array.isArray(s.tags) ? s.tags : [],
      tractionSummary: s.tractionSummary || null,
      isApproved: true,
      status: "active",
    }));

    // 4. Generate internal token for FastAPI agent service
    const secret = new TextEncoder().encode(getInternalJwtSecret());
    const internalToken = await new SignJWT({
      sub: session.user.id,
      role: session.user.role,
      permissions: ["matchmake_investor"],
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("next-server")
      .setAudience("fastapi-internal")
      .setExpirationTime("2m")
      .sign(secret);

    // 5. Invoke FastAPI Matchmaking Pipeline with timeout protection
    let agentRes: Response;
    try {
      agentRes = await fetch(`${AGENT_SERVICE_URL}/api/matchmaking/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${internalToken}`,
        },
        body: JSON.stringify({
          investor: {
            investorId: session.user.id,
            isVerified: Boolean(profileData.profile?.isInvestorVerified),
            firmName: investorDetails.firmName || "",
            firmType: investorDetails.firmType || "angel",
            investmentThesis: investorDetails.investmentThesis || "",
            preferredSectors: investorDetails.preferredSectors || [],
            preferredStages: investorDetails.preferredStages || [],
            ticketSizeMin: investorDetails.ticketSizeMin || 0,
            ticketSizeMax: investorDetails.ticketSizeMax || 0,
          },
          candidates,
          limit: 50,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout protection
      });
    } catch (agentErr: unknown) {
      console.error("[Matchmaking Proxy] Agent service network/timeout error:", agentErr);
      const isTimeout =
        agentErr instanceof Error && (agentErr.name === "TimeoutError" || agentErr.name === "AbortError");
      return NextResponse.json(
        {
          success: false,
          message: isTimeout
            ? "Matchmaking Agent timed out while evaluating candidates. Please try again."
            : "Matchmaking Agent service is unreachable. Please verify the AI agent service is running.",
        },
        { status: 503 }
      );
    }

    if (!agentRes.ok) {
      const errJson = await agentRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          message: errJson.detail || "Agent service failed to evaluate matches",
        },
        { status: agentRes.status }
      );
    }

    const evaluationResult = await agentRes.json();

    // Map watchlist state back into recommendations
    const watchlistLookup = new Map(rawStartups.map((s) => [String(s.id), { isSaved: Boolean(s.isSaved), interestLevel: s.interestLevel }]));
    const rawMatches = evaluationResult.recommendations || evaluationResult.matches || [];
    const enrichedRecommendations = rawMatches.map((rec: Record<string, unknown>) => ({
      ...rec,
      isSaved: watchlistLookup.get(String(rec.startupId))?.isSaved || false,
      interestLevel: watchlistLookup.get(String(rec.startupId))?.interestLevel || null,
    }));

    return NextResponse.json({
      success: true,
      investorCriteria: evaluationResult.investorCriteria || {},
      missingCriteria: evaluationResult.missingCriteria || [],
      totalCandidates: evaluationResult.totalCandidates ?? evaluationResult.totalCandidatesEvaluated ?? candidates.length,
      evaluatedCandidates: evaluationResult.evaluatedCandidates ?? evaluationResult.matchedCount ?? enrichedRecommendations.length,
      recommendations: enrichedRecommendations,
    });
  } catch (error) {
    console.error("[Matchmaking Proxy] Internal error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
