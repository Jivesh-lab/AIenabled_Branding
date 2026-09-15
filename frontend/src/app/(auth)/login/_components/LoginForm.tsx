"use client";

/**
 * LoginForm
 * Right-panel form for the login page.
 *
 * Handles:
 * - Email field with validation
 * - Password field with show/hide toggle
 * - Forgot password link
 * - Sign In submit button with loading state
 * - Social auth buttons row (Google, GitHub, Facebook)
 * - Sign up navigation link
 *
 * TODO: Wire onSubmit to a real auth mutation during backend integration.
 */

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
// Mobile-only logo mark shown when the brand panel is hidden
// ---------------------------------------------------------------------------
function MobileLogoMark() {
  return (
    <div className="flex lg:hidden items-center gap-2.5 mb-10">
      <div className="flex size-8 items-center justify-center rounded-md bg-brand-deep">
        <svg
          viewBox="0 0 20 20"
          className="size-4 text-brand-cyan"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 2L17 6V14L10 18L3 14V6L10 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10 7L13 9V13L10 15L7 13V9L10 7Z"
            fill="currentColor"
            opacity="0.5"
          />
        </svg>
      </div>
      <span className="text-sm font-semibold text-slate-800">AAI–DBITIC</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner used inside the submit button while isSubmitting
// ---------------------------------------------------------------------------
function ButtonSpinner() {
  return (
    <svg
      className="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// LoginForm
// ---------------------------------------------------------------------------
export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  // TODO: Replace with real auth mutation during backend integration phase.
  function onSubmit(values: LoginFormValues) {
    console.info(
      "[AAI-DBITIC] Login submit (frontend-only — not yet wired to backend):",
      { email: values.email }
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12 sm:px-10 lg:px-14">
      {/* Mobile logo — hidden on desktop (brand panel covers it) */}
      <MobileLogoMark />

      <div className="w-full max-w-[380px]">
        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to your AAI–DBITIC account
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5"
        >
          {/* Email field */}
          <div className="space-y-1.5">
            <Label
              htmlFor="login-email"
              className="text-sm font-medium text-slate-700"
            >
              Work email
            </Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              className={cn(
                "h-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
                "focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:border-blue-600",
                errors.email &&
                  "border-red-400 focus-visible:ring-red-400/30 focus-visible:border-red-400"
              )}
              {...register("email")}
            />
            {errors.email && (
              <p
                id="login-email-error"
                role="alert"
                className="text-xs text-red-500"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="login-password"
                className="text-sm font-medium text-slate-700"
              >
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
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "login-password-error" : undefined
                }
                className={cn(
                  "h-10 pr-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
                  "focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:border-blue-600",
                  errors.password &&
                    "border-red-400 focus-visible:ring-red-400/30 focus-visible:border-red-400"
                )}
                {...register("password")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
                className={cn(
                  "absolute inset-y-0 right-0 flex items-center px-3",
                  "text-slate-400 hover:text-slate-600 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-blue-600/40 rounded-r-md"
                )}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>

            {errors.password && (
              <p
                id="login-password-error"
                role="alert"
                className="text-xs text-red-500"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "h-10 rounded-md px-4 text-sm font-semibold text-white",
              "bg-brand hover:bg-brand-hover active:bg-brand-active",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
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
                Sign In
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">
            or continue with
          </span>
          <Separator className="flex-1 bg-slate-200" />
        </div>

        {/* Social auth buttons */}
        <div className="flex gap-2.5">
          <SocialAuthButton provider="google" />
          <SocialAuthButton provider="github" />
          <SocialAuthButton provider="facebook" />
        </div>

        {/* Sign up link */}
        <p className="mt-8 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
