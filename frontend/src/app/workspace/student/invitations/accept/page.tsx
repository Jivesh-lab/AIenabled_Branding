"use client";

/**
 * /workspace/student/invitations/accept
 *
 * Handles the full invitation acceptance flow:
 *  1. Reads the ?token= query param.
 *  2. Calls /api/team/invitations/peek to show project info (no auth needed).
 *  3. If the user is not logged in, shows a sign-in prompt.
 *  4. If logged in, shows an Accept / Decline panel.
 *  5. Calls POST /api/team/invitations/accept.
 *  6. Handles every error case with a clear message.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Users } from "lucide-react";

interface InvitationPreview {
  projectId: string;
  projectTitle: string;
  inviterName: string;
  invitedEmail: string;
  memberName: string;
  expiresAt: string;
  status: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function StatusIcon({ kind }: { kind: "success" | "error" | "warning" | "loading" }) {
  if (kind === "success") return <CheckCircle className="size-10 text-emerald-500" />;
  if (kind === "error") return <XCircle className="size-10 text-red-500" />;
  if (kind === "warning") return <AlertTriangle className="size-10 text-amber-500" />;
  return <Loader2 className="size-10 text-blue-500 animate-spin" />;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function AcceptPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = searchParams.get("token") || "";

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [result, setResult] = useState<{ kind: "accepted" | "declined" | "error"; message: string } | null>(null);

  const didFetch = useRef(false);

  useEffect(() => {
    if (!token || didFetch.current) return;
    didFetch.current = true;

    async function loadPreview() {
      try {
        const res = await fetch(`/api/team/invitations/peek?token=${encodeURIComponent(token)}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPreviewError(body.message || "This invitation link is invalid, expired, or has already been used.");
        } else {
          setPreview(body.data);
        }
      } catch {
        setPreviewError("Could not load invitation details. Please check your connection and try again.");
      } finally {
        setLoadingPreview(false);
      }
    }
    void loadPreview();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch(`/api/team/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && body.emailMismatch) {
          setResult({ kind: "error", message: body.message });
          return;
        }
        setResult({ kind: "error", message: body.message || "Could not accept the invitation. Please try again." });
        return;
      }
      setResult({ kind: "accepted", message: body.message || `You have joined "${preview?.projectTitle}".` });
      // Redirect to dashboard after 2s
      setTimeout(() => router.replace("/workspace/student/dashboard"), 2000);
    } catch {
      setResult({ kind: "error", message: "Network error. Please check your connection and try again." });
    } finally {
      setAccepting(false);
    }
  }

  async function handleDecline() {
    setDeclining(true);
    try {
      const res = await fetch(`/api/team/invitations/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ kind: "error", message: body.message || "Could not decline the invitation." });
        return;
      }
      setResult({ kind: "declined", message: "You have declined the invitation." });
    } catch {
      setResult({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setDeclining(false);
    }
  }

  // --- Token missing ---
  if (!token) {
    return (
      <Card>
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <StatusIcon kind="error" />
          <h1 className="text-xl font-bold text-slate-900">Invalid Link</h1>
          <p className="text-sm text-slate-500">No invitation token was found in this link. Please use the link from your email exactly as received.</p>
          <Link href="/login" className="mt-2 text-sm font-semibold text-blue-600 hover:underline">Back to sign in</Link>
        </div>
      </Card>
    );
  }

  // --- Loading preview ---
  if (loadingPreview) {
    return (
      <Card>
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <StatusIcon kind="loading" />
          <p className="text-sm text-slate-500">Loading invitation details…</p>
        </div>
      </Card>
    );
  }

  // --- Preview load error ---
  if (previewError) {
    return (
      <Card>
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <StatusIcon kind="error" />
          <h1 className="text-xl font-bold text-slate-900">Invitation Not Found</h1>
          <p className="text-sm text-slate-500">{previewError}</p>
          <p className="text-sm text-slate-400">If you believe this is an error, please contact the project founder or the incubation office.</p>
          <Link href="/workspace/student/dashboard" className="mt-2 text-sm font-semibold text-blue-600 hover:underline">Go to dashboard</Link>
        </div>
      </Card>
    );
  }

  // --- Accepted/declined/error result state ---
  if (result) {
    return (
      <Card>
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <StatusIcon kind={result.kind === "accepted" ? "success" : result.kind === "declined" ? "warning" : "error"} />
          <h1 className="text-xl font-bold text-slate-900">
            {result.kind === "accepted" ? "Invitation Accepted!" : result.kind === "declined" ? "Invitation Declined" : "Could Not Process Invitation"}
          </h1>
          <p className="text-sm text-slate-600">{result.message}</p>
          {result.kind === "accepted" && (
            <p className="text-xs text-slate-400">Redirecting to your dashboard…</p>
          )}
          {result.kind !== "accepted" && (
            <Link href="/workspace/student/dashboard" className="mt-2 text-sm font-semibold text-blue-600 hover:underline">Go to dashboard</Link>
          )}
        </div>
      </Card>
    );
  }

  // --- Not signed in ---
  if (sessionStatus === "unauthenticated") {
    return (
      <Card>
        <div className="bg-blue-600 px-6 py-5">
          <p className="text-xs text-blue-200 font-medium uppercase tracking-wide">Invitation to join</p>
          <h1 className="text-xl font-bold text-white mt-1">{preview?.projectTitle}</h1>
          <p className="text-sm text-blue-200 mt-1">Invited by <strong>{preview?.inviterName}</strong></p>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              You must sign in with the email address <strong className="font-semibold">{preview?.invitedEmail}</strong> to accept this invitation.
            </p>
          </div>
          <button
            onClick={() => signIn(undefined, { callbackUrl: window.location.href })}
            className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Sign in to accept
          </button>
          <p className="text-center text-xs text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href={`/signup?email=${encodeURIComponent(preview?.invitedEmail || "")}&returnTo=${encodeURIComponent(window.location.href)}`} className="text-blue-600 font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </Card>
    );
  }

  // --- Loading session ---
  if (sessionStatus === "loading") {
    return (
      <Card>
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <StatusIcon kind="loading" />
          <p className="text-sm text-slate-500">Checking your session…</p>
        </div>
      </Card>
    );
  }

  // --- Signed in: show accept/decline ---
  const userEmail = (session?.user as Record<string, string>)?.email || "";
  const emailMatch = userEmail.toLowerCase() === (preview?.invitedEmail || "").toLowerCase();

  return (
    <Card>
      <div className="bg-blue-600 px-6 py-5">
        <p className="text-xs text-blue-200 font-medium uppercase tracking-wide">Invitation to join</p>
        <h1 className="text-xl font-bold text-white mt-1">{preview?.projectTitle}</h1>
        <p className="text-sm text-blue-200 mt-1">Invited by <strong>{preview?.inviterName}</strong></p>
      </div>

      <div className="p-6 flex flex-col gap-4">
        {/* Invitation details */}
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <Users className="size-5 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{preview?.memberName}</p>
            <p className="text-xs text-slate-500">{preview?.invitedEmail}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Pending</span>
        </div>

        {/* What joining means */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">What joining gives you</p>
          <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
            <li>View the shared project in your dashboard</li>
            <li>Track milestones and updates</li>
            <li>Receive meeting invitations</li>
            <li>Collaborate on project resources</li>
          </ul>
        </div>

        {/* Email mismatch warning */}
        {!emailMatch && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <XCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Wrong account</p>
              <p className="text-sm text-red-700">
                You are signed in as <strong>{userEmail}</strong>, but this invitation was sent to <strong>{preview?.invitedEmail}</strong>.
                Please sign in with the correct account.
              </p>
              <button
                onClick={() => signIn()}
                className="mt-2 text-sm font-semibold text-red-700 underline hover:no-underline"
              >
                Switch account
              </button>
            </div>
          </div>
        )}

        {/* Expiry notice */}
        <p className="text-xs text-slate-400">
          Expires: {new Date(preview?.expiresAt || "").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        {/* Actions */}
        <div className="flex gap-3 mt-1">
          <button
            onClick={handleDecline}
            disabled={declining || accepting}
            className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {declining ? "Declining…" : "Decline"}
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting || declining || !emailMatch}
            className="h-10 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {accepting ? "Accepting…" : "Accept Invitation"}
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-8 text-blue-500 animate-spin" />
      </div>
    }>
      <AcceptPageInner />
    </Suspense>
  );
}
