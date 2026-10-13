"use client";

/**
 * LoginForm
 * Clean, focused form for the split-screen login page.
 * All auth logic (NextAuth, 2FA, role-based redirect) is preserved exactly.
 * Visual redesign only: no glass card container (page handles the white bg),
 * clean inputs, consistent spacing, no decorative noise.
 */

import Link from "next/link";
import { useState } from "react";
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
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: searchParams?.get("email") || "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
        ...(require2FA && twoFactorCode ? { twoFactorCode } : {}),
      });

      if (!result) {
        toast.error("Sign-in failed. Please try again.");
        return;
      }

      if (result.error === "REQUIRE_2FA") {
        setRequire2FA(true);
        toast.info("Two-factor authentication required.");
        return;
      }

      if (result.error) {
        toast.error(
          result.error === "CredentialsSignin"
            ? "Invalid email or password."
            : result.error
        );
        return;
      }

      // Check callbackUrl if it points to a valid specific workspace route
      const callbackUrl = searchParams.get("callbackUrl");

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
      const userEmail = ((session?.user as Record<string, unknown>)?.email as string || values.email || "").toLowerCase();

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

      let destination = roleWorkspaces[userRole] || "/";

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
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocialAuth(provider: string) {
    await signIn(provider, { callbackUrl: "/login" });
  }

  // Input base styles
  const inputCls = (hasError?: boolean) =>
    cn(
      "h-11 border border-slate-200 bg-white text-slate-900 rounded-xl text-sm",
      "placeholder:text-slate-400 transition-all duration-150",
      "focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600",
      hasError && "border-red-400 bg-red-50/20 focus-visible:ring-red-400/20 focus-visible:border-red-400"
    );

  return (
    <div className="w-full">
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
          <div className="space-y-2 p-4 rounded-xl border border-amber-200 bg-amber-50">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold uppercase tracking-wide">
              <ShieldAlert className="size-4 text-amber-600" aria-hidden="true" />
              Two-factor code required
            </div>
            <Label htmlFor="login-2fa" className="text-xs text-slate-700 font-medium">
              6-digit authenticator code
            </Label>
            <Input
              id="login-2fa"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123 456"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
              className="h-11 text-center text-xl tracking-[0.3em] font-mono border-amber-300 bg-white focus-visible:ring-amber-400/30 focus-visible:border-amber-400"
              autoFocus
            />
            <p className="text-[11px] text-slate-500">
              Open your authenticator app and enter the current 6-digit code.
            </p>
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
