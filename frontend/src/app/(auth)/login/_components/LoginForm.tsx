"use client";

/**
 * LoginForm
 * Glassmorphism card form for the new full-bleed photo login page.
 * Logic unchanged; only the container and field styling updated to
 * match the AAI-DBITIC template (white frosted glass card on photo bg).
 */

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Mail, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
// Small sparkle icon next to heading (from template)
// ---------------------------------------------------------------------------
function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 text-blue-500" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main LoginForm
// ---------------------------------------------------------------------------
export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
        ...(require2FA && twoFactorCode ? { totpCode: twoFactorCode } : {}),
      });

      if (!result) {
        toast.error("Sign-in failed. Please try again.");
        return;
      }

      if (result.error === "2FA_REQUIRED") {
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

      router.replace("/");
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocialAuth(provider: string) {
    await signIn(provider, { callbackUrl: "/" });
  }

  // Shared input classes for glass card inputs
  const inputCls = (hasError?: boolean) =>
    cn(
      "h-10 pl-9 border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 rounded-lg",
      "focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500",
      "backdrop-blur-sm transition-all",
      hasError && "border-red-400 focus-visible:ring-red-400/30 focus-visible:border-red-400"
    );

  return (
    /* -- Glass card ---------------------------------------------------- */
    <div
      className={cn(
        "w-full rounded-2xl p-8",
        "bg-white/85 backdrop-blur-xl",
        "border border-white/60",
        "shadow-[0_8px_48px_rgba(0,0,0,0.12)]",
      )}
    >
      {/* Heading */}
      <div className="mb-7 flex items-start gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Welcome back <SparkleIcon />
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your AAI-DBITIC account
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">
            Work email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" aria-hidden="true" />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              className={inputCls(!!errors.email)}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p id="login-email-error" role="alert" className="text-xs text-red-500">
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
            <Link
              href="/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" aria-hidden="true" />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              className={cn(inputCls(!!errors.password), "pr-10")}
              {...register("password")}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
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
            <p id="login-password-error" role="alert" className="text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* 2FA */}
        {require2FA && (
          <div className="space-y-1.5 p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 mb-1 text-amber-900 font-semibold text-xs uppercase tracking-wider">
              <ShieldAlert className="size-4 text-amber-600" aria-hidden="true" />
              Two-Factor Security Code Required
            </div>
            <Label htmlFor="login-2fa" className="text-xs text-slate-700 font-medium">
              Authenticator 6-Digit Code
            </Label>
            <Input
              id="login-2fa"
              type="text"
              maxLength={6}
              placeholder="123456"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
              className="h-10 text-center text-lg tracking-widest font-mono border-amber-300 bg-white focus-visible:ring-amber-500"
              autoFocus
            />
            <p className="text-[11px] text-slate-500">
              Open your authenticator app and enter the 6-digit passcode.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full flex items-center justify-center gap-2 mt-2",
            "h-11 rounded-xl px-4 text-sm font-semibold text-white",
            "bg-blue-700 hover:bg-blue-800 active:bg-blue-900",
            "transition-colors duration-150 shadow-md shadow-blue-700/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <ButtonSpinner />
              Signing in.....
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">or continue with</span>
        <Separator className="flex-1 bg-slate-200" />
      </div>

      {/* Social auth */}
      <div className="flex gap-2.5">
        <SocialAuthButton provider="google" onClick={handleSocialAuth} />
        <SocialAuthButton provider="github" onClick={handleSocialAuth} />
        <SocialAuthButton provider="facebook" onClick={handleSocialAuth} />
      </div>

      {/* Sign up link */}
      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Contact Admin
        </Link>
      </p>
    </div>
  );
}
