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

function normalizeTokens(text: string): Set<string> {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "by", "is", "are", "was", "were", "we", "our", "you", "your", "they", "this",
    "that", "from", "as", "it", "be", "have", "has", "do", "will", "all",
  ]);
  const words = text.toLowerCase().match(/\b[a-zA-Z0-9]{3,}\b/g) || [];
  return new Set(words.filter((w) => !stopWords.has(w)));
}

function calculateDeterministicMatch(
  investor: {
    preferredSectors: string[];
    preferredStages: string[];
    investmentThesis: string;
  },
  candidate: {
    id: string;
    name: string;
    sector: string;
    stage: string;
    tagline: string;
    problem: string;
    solution: string;
    readinessScore: number;
    tags: string[];
  }
) {
  const reasons: string[] = [];
  const missingCriteria: string[] = [];
  const breakdown = {
    sector: 0,
    stage: 0,
    thesis: 0,
    readiness: 0,
  };

  // 1. Sector Alignment (35 points)
  const prefSectors = (investor.preferredSectors || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const startupSector = (candidate.sector || "").trim().toLowerCase();
  const startupTags = (candidate.tags || []).map((t) => t.trim().toLowerCase());

  if (prefSectors.length === 0) {
    missingCriteria.push("Investor target sectors not specified (0/35 points).");
  } else {
    const isSectorMatch =
      prefSectors.includes(startupSector) ||
      prefSectors.some((ps) => startupSector.includes(ps)) ||
      startupTags.some((t) => prefSectors.includes(t));
    if (isSectorMatch) {
      breakdown.sector = 35;
      reasons.push(`Sector alignment: '${candidate.sector}' matches target sector preferences.`);
    } else {
      missingCriteria.push(`Sector mismatch: '${candidate.sector}' is outside preferred sectors.`);
    }
  }

  // 2. Stage Alignment (25 points)
  const prefStages = (investor.preferredStages || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const startupStage = (candidate.stage || "").trim().toLowerCase();

  if (prefStages.length === 0) {
    missingCriteria.push("Investor target stages not specified (0/25 points).");
  } else {
    const isStageMatch = prefStages.includes(startupStage) || prefStages.some((st) => startupStage.includes(st));
    if (isStageMatch) {
      breakdown.stage = 25;
      reasons.push(`Stage alignment: Venture stage '${candidate.stage.toUpperCase()}' matches investment criteria.`);
    } else {
      missingCriteria.push(`Stage mismatch: Venture stage '${candidate.stage.toUpperCase()}' differs from preferred criteria.`);
    }
  }

  // 3. Thesis Keyword Semantic Overlap (20 points)
  const thesisTokens = normalizeTokens(investor.investmentThesis || "");
  const candidateText = `${candidate.tagline || ""} ${candidate.problem || ""} ${candidate.solution || ""} ${(candidate.tags || []).join(" ")}`;
  const candidateTokens = normalizeTokens(candidateText);

  if (thesisTokens.size === 0) {
    missingCriteria.push("Investment thesis statement is blank (0/20 points).");
  } else {
    const overlap: string[] = [];
    thesisTokens.forEach((t) => {
      if (candidateTokens.has(t)) overlap.push(t);
    });

    if (overlap.length > 0) {
      const overlapScore = Math.min(20, 6 + overlap.length * 4);
      breakdown.thesis = overlapScore;
      reasons.push(`Thesis resonance: Shared domain focus detected (${overlap.slice(0, 4).join(", ")}).`);
    } else {
      missingCriteria.push("No keyword overlap with stated investment thesis.");
    }
  }

  // 4. Readiness & Execution Score (20 points)
  const clampedReadiness = Math.max(0, Math.min(100, Math.round(candidate.readinessScore || 0)));
  const readinessPoints = Math.round((clampedReadiness / 100.0) * 20);
  breakdown.readiness = readinessPoints;

  if (clampedReadiness >= 75) {
    reasons.push(`Strong venture maturity: High incubation readiness score (${clampedReadiness}/100).`);
  } else if (clampedReadiness >= 50) {
    reasons.push(`Moderate venture maturity: Incubation readiness score (${clampedReadiness}/100).`);
  } else {
    missingCriteria.push(`Early incubation progress: Readiness score is ${clampedReadiness}/100.`);
  }

  const matchScore = Math.max(0, Math.min(100, breakdown.sector + breakdown.stage + breakdown.thesis + breakdown.readiness));
  const matchTier: "strong" | "partial" | "insufficient_data" =
    matchScore >= 75 ? "strong" : matchScore >= 45 ? "partial" : "insufficient_data";

  if (reasons.length === 0) {
    reasons.push("Approved venture meeting general incubator baseline.");
  }

  return {
    startupId: candidate.id,
    startupName: candidate.name,
    sector: candidate.sector,
    stage: candidate.stage,
    tagline: candidate.tagline,
    problem: candidate.problem,
    solution: candidate.solution,
    readinessScore: clampedReadiness,
    tags: candidate.tags,
    matchScore,
    matchTier,
    reasons,
    missingCriteria,
    breakdown,
    scoreBreakdown: {
      sectorScore: breakdown.sector,
      stageScore: breakdown.stage,
      thesisScore: breakdown.thesis,
      readinessScore: breakdown.readiness,
    },
  };
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

    // Rate-limiting check: 1.5 seconds minimum between evaluations
    const now = Date.now();
    if (lastRequestByInvestor.size > 200) {
      for (const [invId, ts] of lastRequestByInvestor.entries()) {
        if (now - ts > 60000) lastRequestByInvestor.delete(invId);
      }
    }

    const lastReq = lastRequestByInvestor.get(session.user.id) || 0;
    if (now - lastReq < 1500) {
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

    const watchlistLookup = new Map(
      rawStartups.map((s) => [String(s.id), { isSaved: Boolean(s.isSaved), interestLevel: s.interestLevel }])
    );

    // 5. Invoke FastAPI Matchmaking Pipeline if available; seamlessly fallback to deterministic evaluator
    let rawMatches: any[] = [];
    let globalMissingCriteria: string[] = [];

    try {
      const agentRes = await fetch(`${AGENT_SERVICE_URL}/api/matchmaking/evaluate`, {
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
        signal: AbortSignal.timeout(3000), // Fast 3-second timeout before graceful fallback
      });

      if (agentRes.ok) {
        const evaluationResult = await agentRes.json();
        rawMatches = evaluationResult.recommendations || evaluationResult.matches || [];
        globalMissingCriteria = evaluationResult.missingCriteria || [];
      } else {
        throw new Error(`Agent service HTTP ${agentRes.status}`);
      }
    } catch {
      // Graceful fallback to identical deterministic engine
      rawMatches = candidates
        .map((cand) =>
          calculateDeterministicMatch(
            {
              preferredSectors: investorDetails.preferredSectors || [],
              preferredStages: investorDetails.preferredStages || [],
              investmentThesis: investorDetails.investmentThesis || "",
            },
            cand
          )
        )
        .sort((a, b) => b.matchScore - a.matchScore || b.readinessScore - a.readinessScore);
    }

    const enrichedRecommendations = rawMatches.map((rec: Record<string, unknown>) => ({
      ...rec,
      isSaved: watchlistLookup.get(String(rec.startupId))?.isSaved || false,
      interestLevel: watchlistLookup.get(String(rec.startupId))?.interestLevel || null,
    }));

    return NextResponse.json({
      success: true,
      investorCriteria: {
        firmName: investorDetails.firmName || "",
        preferredSectors: investorDetails.preferredSectors || [],
        preferredStages: investorDetails.preferredStages || [],
        investmentThesis: investorDetails.investmentThesis || "",
      },
      missingCriteria: globalMissingCriteria,
      totalCandidates: candidates.length,
      evaluatedCandidates: enrichedRecommendations.length,
      recommendations: enrichedRecommendations,
    });
  } catch (error) {
    console.error("[Matchmaking Proxy] Internal error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
