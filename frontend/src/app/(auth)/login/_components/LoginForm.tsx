"use client";

/**
 * LoginForm
 * Clean, focused form for the split-screen login page.
 * All auth logic (NextAuth, 2FA, role-based redirect) is preserved exactly.
 * Visual redesign only: no glass card container (page handles the white bg),
 * clean inputs, consistent spacing, no decorative noise.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, ArrowRight, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import SocialAuthButton from "./SocialAuthButton";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
function ButtonSpinner() {
  return (
    <svg
      className="animate-spin size-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// LoginForm
// ---------------------------------------------------------------------------
export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [require2FA, setRequire2FA]   = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: searchParams?.get("email") || "",
      password: "",
    },
  });

  /** Reads the authoritative role from the new session and sends the person to their own portal. */
  async function redirectToPortal(emailHint: string) {
    // Check callbackUrl if it points to a valid specific workspace route
    const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("returnTo");

    // Retrieve authenticated session to determine authoritative role
    let session = await getSession();
    // If session isn't loaded immediately, fetch /api/auth/session
    if (!session?.user) {
      try {
        const sRes = await fetch("/api/auth/session");
        if (sRes.ok) session = await sRes.json();
      } catch {
        // ignore
      }
    }

    const userRole = (session?.user as Record<string, unknown>)?.role as string;
    const facultyRole = (session?.user as Record<string, unknown>)?.facultyRole as string | undefined;
    const userEmail = ((session?.user as Record<string, unknown>)?.email as string || emailHint || "").toLowerCase();

    let facultyDestination = "/workspace/faculty/coordinator";
    if (facultyRole === "volunteer" || userEmail.includes("volunteer")) {
      facultyDestination = "/workspace/faculty/volunteer";
    }

    const roleWorkspaces: Record<string, string> = {
      student: "/workspace/student/dashboard",
      faculty: facultyDestination,
      mentor: "/workspace/mentor/dashboard",
      investor: "/workspace/investor/dashboard",
      admin: "/workspace/admin/dashboard",
      super_admin: "/workspace/super-admin/dashboard",
    };

    let destination = roleWorkspaces[userRole];

    // Robust fallback if session userRole is not yet hydrated
    if (!destination) {
      if (userEmail.includes("superadmin") || userEmail.includes("super_admin")) {
        destination = "/workspace/super-admin/dashboard";
      } else if (userEmail.includes("admin")) {
        destination = "/workspace/admin/dashboard";
      } else if (userEmail.includes("mentor")) {
        destination = "/workspace/mentor/dashboard";
      } else if (userEmail.includes("investor")) {
        destination = "/workspace/investor/dashboard";
      } else if (userEmail.includes("coordinator") || userEmail.includes("faculty")) {
        destination = facultyDestination;
      } else {
        destination = "/workspace/student/dashboard";
      }
    }

    // If callbackUrl matches the user's role workspace, honor it (e.g. deep link)
    if (
      callbackUrl &&
      callbackUrl.startsWith("/workspace/") &&
      callbackUrl !== "/workspace" &&
      !callbackUrl.startsWith("/workspace/admin") &&
      !callbackUrl.startsWith("/workspace/super-admin")
    ) {
      destination = callbackUrl;
    }

    // Use window.location.replace to ensure full session cookie sync and clean page reload
    window.location.replace(destination);
  }

  async function onSubmit(values: LoginFormValues) {
    if (require2FA && !twoFactorCode.trim()) {
      toast.error("Please enter the 6-digit authenticator code (use 123456 for test).");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
        ...(require2FA ? { twoFactorCode: twoFactorCode.trim() || "123456" } : {}),
      });

      if (!result) {
        toast.error("Sign-in failed. Please try again.");
        return;
      }

      if (result.error === "REQUIRE_2FA") {
        setRequire2FA(true);
        setTwoFactorCode("123456"); // Pre-fill development code for immediate ease
        toast.info("Two-factor authentication required. Dev code 123456 entered.");
        return;
      }

      if (result.error) {
        try {
          const healthRes = await fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(1500) });
          if (!healthRes.ok) {
            toast.error("Cannot connect to backend server. Please verify the Express backend is running on port 5000.");
            return;
          }
        } catch {
          toast.error("Cannot connect to backend server. Please verify the Express backend is running on port 5000.");
          return;
        }

        toast.error(
          result.error === "CredentialsSignin"
            ? "Invalid credentials or 2FA code. (Use 123456 for Super Admin)"
            : result.error
        );
        return;
      }

      await redirectToPortal(values.email);
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocialAuth(provider: string) {
    if (provider === "google") {
      // The backend verifies the Google identity and issues our own session; the browser only navigates.
      const returnTo = searchParams.get("callbackUrl");
      const query = returnTo && returnTo.startsWith("/workspace/") ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/google/start?mode=login${query}`;
      return;
    }
    await signIn(provider, { callbackUrl: "/login" });
  }

  // ---------------------------------------------------------------------
  // Google: where the browser lands after the backend has verified the Google identity
  // ---------------------------------------------------------------------
  const googleHandled = useRef(false);
  const [linkRequest, setLinkRequest] = useState<{ ticket: string; email: string } | null>(null);
  const [linkPassword, setLinkPassword] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [linkNeeds2FA, setLinkNeeds2FA] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const GOOGLE_MESSAGES: Record<string, string> = {
    not_configured: "Google sign-in is not set up on this server yet. Please sign in with your e-mail and password.",
    cancelled: "Google sign-in was cancelled. You can try again whenever you like.",
    expired: "That Google sign-in link has expired. Please try again.",
    failed: "Google sign-in could not be completed. Please try again.",
    email_unverified: "Google says that e-mail address is not verified, so it cannot be used to sign in.",
    pending_approval: "Your account is waiting for administrator approval. You will be able to sign in with Google once it is approved.",
    account_disabled: "This account has been deactivated. Please contact the incubation office.",
    account_unavailable: "This account is not available. Please contact the incubation office.",
  };

  async function signInWithTicket(ticket: string) {
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", { redirect: false, googleTicket: ticket });
      if (!result || result.error) {
        toast.error(result?.error && result.error !== "CredentialsSignin" ? result.error : "Google sign-in could not be completed. Please try again.");
        return;
      }
      await redirectToPortal("");
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (googleHandled.current) return;
    const ticket = searchParams.get("googleTicket");
    const reason = searchParams.get("google");
    const linkTicket = searchParams.get("linkTicket");
    if (!ticket && !reason) return;
    googleHandled.current = true;
    // Remove the one-time values from the address bar straight away.
    const clean = new URLSearchParams(searchParams.toString());
    ["googleTicket", "google", "linkTicket", "email"].forEach((k) => clean.delete(k));
    window.history.replaceState(null, "", `${window.location.pathname}${clean.toString() ? `?${clean.toString()}` : ""}`);
    if (ticket) {
      void signInWithTicket(ticket);
    } else if (reason === "link" && linkTicket) {
      setLinkRequest({ ticket: linkTicket, email: searchParams.get("email") || "your e-mail address" });
    } else if (reason) {
      toast.error(GOOGLE_MESSAGES[reason] || GOOGLE_MESSAGES.failed, { duration: 8000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkRequest || !linkPassword) return;
    setIsLinking(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/google/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: linkRequest.ticket, password: linkPassword, ...(linkCode ? { twoFactorCode: linkCode } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.code === "TWO_FACTOR_REQUIRED") {
        setLinkNeeds2FA(true);
        toast.info("Enter the code from your authenticator app to finish linking.");
        return;
      }
      if (!res.ok) {
        toast.error(data.message || "Google could not be linked. Please try again.");
        if (res.status === 410 || res.status === 429) setLinkRequest(null);
        return;
      }
      setLinkRequest(null);
      if (data.status === "active" && data.ticket) {
        toast.success("Google is now linked to your account.");
        await signInWithTicket(data.ticket);
      } else {
        toast.info(data.message || "Google is linked.");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsLinking(false);
      setLinkPassword("");
    }
  }


  // Input base styles
  const inputCls = (hasError?: boolean) =>
    cn(
      "h-11 border border-slate-200 bg-white text-slate-900 rounded-xl text-sm",
      "placeholder:text-slate-400 transition-all duration-150",
      "focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600",
      hasError && "border-red-400 bg-red-50/20 focus-visible:ring-red-400/20 focus-visible:border-red-400"
    );

  const linkPanel = linkRequest ? (
    <form onSubmit={submitLink} className="mb-5 space-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4" aria-label="Link Google to your existing account">
      <p className="text-sm font-semibold text-slate-900">Link Google to your existing account</p>
      <p className="text-xs leading-relaxed text-slate-600">
        An account already exists for <strong>{linkRequest.email}</strong>. To make sure it is you, enter that account&apos;s password once. Your profile, role and data stay exactly as they are.
      </p>
      <Input type="password" autoComplete="current-password" value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)} placeholder="Your account password" aria-label="Account password" className="h-11 rounded-xl border-slate-200 bg-white text-sm" />
      {linkNeeds2FA && <Input inputMode="numeric" autoComplete="one-time-code" value={linkCode} onChange={(e) => setLinkCode(e.target.value)} placeholder="Authenticator code" aria-label="Authenticator code" className="h-11 rounded-xl border-slate-200 bg-white text-sm" />}
      <div className="flex gap-2">
        <button type="submit" disabled={isLinking || !linkPassword} className="h-10 flex-1 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{isLinking ? "Linking..." : "Link Google and sign in"}</button>
        <button type="button" onClick={() => setLinkRequest(null)} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
      </div>
    </form>
  ) : null;

  return (
    <div className="w-full">
      {linkPanel}
      {/* ── Heading ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to continue to your workspace.
        </p>
      </div>

      {/* ── Form ────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">
            Email address
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            className={inputCls(!!errors.email)}
            {...register("email")}
          />
          {errors.email && (
            <p id="login-email-error" role="alert" className="text-xs text-red-500 mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">
              Password
            </Label>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              className={cn(inputCls(!!errors.password), "pr-11")}
              {...register("password")}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((p) => !p)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" role="alert" className="text-xs text-red-500 mt-1">
              {errors.password.message}
            </p>
          )}
          {/* Forgot password */}
          <div className="flex justify-end pt-0.5">
            <Link
              href="/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* 2FA block */}
        {require2FA && (
          <div className="space-y-2.5 p-4 rounded-xl border border-amber-200 bg-amber-50">
            <div className="flex items-center justify-between text-amber-800 text-xs font-semibold uppercase tracking-wide">
              <span className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-amber-600" aria-hidden="true" />
                Super Admin 2FA Code Required
              </span>
              <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10px] text-amber-900 font-bold lowercase">
                dev code: 123456
              </span>
            </div>
            <Label htmlFor="login-2fa" className="text-xs text-slate-700 font-medium">
              6-digit authenticator or test code
            </Label>
            <Input
              id="login-2fa"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
              className="h-11 text-center text-xl tracking-[0.3em] font-mono border-amber-300 bg-white focus-visible:ring-amber-400/30 focus-visible:border-amber-400"
              autoFocus
            />
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>Enter authenticator code or test code <strong>123456</strong>.</span>
              <button
                type="button"
                onClick={() => setTwoFactorCode("123456")}
                className="font-semibold text-blue-600 hover:text-blue-800 underline ml-2"
              >
                Use 123456
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full h-11 flex items-center justify-center gap-2",
            "rounded-xl px-4 text-sm font-medium text-white",
            "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <ButtonSpinner />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {/* ── Divider + Social ─────────────────────────────────────── */}
      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium px-1">or continue with</span>
        <Separator className="flex-1 bg-slate-200" />
      </div>

      <div className="flex gap-2.5">
        <SocialAuthButton provider="google"   onClick={handleSocialAuth} />
        <SocialAuthButton provider="github"   onClick={handleSocialAuth} />
        <SocialAuthButton provider="facebook" onClick={handleSocialAuth} />
      </div>

      {/* ── Sign up link ─────────────────────────────────────────── */}
      <p className="mt-6 text-center text-xs text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
