"use client";

/**
 * SignupForm
 * Right-panel form for the signup page.
 *
 * Fields:
 * - Full name
 * - Work / institutional email
 * - Role (dropdown)
 * - Password
 * - Confirm password
 * - Terms agreement
 *
 * Navigation:
 * - Already have an account? → /login
 *
 * TODO: Wire onSubmit to a real registration mutation during backend integration.
 */

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import SocialAuthButton from "@/app/(auth)/login/_components/SocialAuthButton";

// ---------------------------------------------------------------------------
// Role options
// ---------------------------------------------------------------------------
const ROLES = [
  { value: "student", label: "Student" },
  { value: "faculty", label: "Faculty" },
  { value: "mentor", label: "Mentor" },
  { value: "industry", label: "Industry Partner" },
  { value: "investor", label: "Investor" },
  { value: "startup", label: "Startup / Alumni" },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(80, "Full name is too long"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    role: z.enum(
      ["student", "faculty", "mentor", "industry", "investor", "startup"] as const,
      { message: "Please select your role" }
    ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

// ---------------------------------------------------------------------------
// Mobile-only logo mark
// ---------------------------------------------------------------------------
function MobileLogoMark() {
  return (
    <div className="flex lg:hidden items-center gap-2.5 mb-10">
      <div className="flex size-8 items-center justify-center rounded-md bg-[#0B1E3D]">
        <svg
          viewBox="0 0 20 20"
          className="size-4 text-blue-300"
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
// Password strength indicator
// ---------------------------------------------------------------------------
function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strength = checks.filter(Boolean).length;
  const colors = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-emerald-400"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= strength ? colors[strength] : "bg-slate-200"
            )}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className="text-[11px] text-slate-400">{labels[strength]}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner for submit button loading state
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
// SignupForm
// ---------------------------------------------------------------------------
export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
  });

  const passwordValue = watch("password", "");

  // TODO: Replace with real registration mutation during backend integration phase.
  function onSubmit(values: SignupFormValues) {
    console.info(
      "[AAI-DBITIC] Signup submit (frontend-only — not yet wired to backend):",
      { email: values.email, role: values.role }
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12 sm:px-10 lg:px-14">
      <MobileLogoMark />

      <div className="w-full max-w-[420px]">
        {/* Heading */}
        <div className="mb-7">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Create your account
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Join the AAI–DBITIC innovation ecosystem
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          {/* Full name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="signup-fullname"
              className="text-sm font-medium text-slate-700"
            >
              Full name
            </Label>
            <Input
              id="signup-fullname"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              aria-invalid={!!errors.fullName}
              aria-describedby={
                errors.fullName ? "signup-fullname-error" : undefined
              }
              className={cn(
                "h-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
                "focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:border-blue-600",
                errors.fullName &&
                  "border-red-400 focus-visible:ring-red-400/30 focus-visible:border-red-400"
              )}
              {...register("fullName")}
            />
            {errors.fullName && (
              <p
                id="signup-fullname-error"
                role="alert"
                className="text-xs text-red-500"
              >
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label
              htmlFor="signup-email"
              className="text-sm font-medium text-slate-700"
            >
              Institutional / work email
            </Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={
                errors.email ? "signup-email-error" : undefined
              }
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
                id="signup-email-error"
                role="alert"
                className="text-xs text-red-500"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label
              htmlFor="signup-role"
              className="text-sm font-medium text-slate-700"
            >
              I am joining as
            </Label>
            <select
              id="signup-role"
              aria-invalid={!!errors.role}
              aria-describedby={errors.role ? "signup-role-error" : undefined}
              className={cn(
                "flex h-10 w-full rounded-md border px-3 py-2 text-sm",
                "border-slate-200 bg-white text-slate-900",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:border-blue-600",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.role &&
                  "border-red-400 focus-visible:ring-red-400/30 focus-visible:border-red-400"
              )}
              defaultValue=""
              {...register("role")}
            >
              <option value="" disabled>
                Select your role
              </option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p
                id="signup-role-error"
                role="alert"
                className="text-xs text-red-500"
              >
                {errors.role.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="signup-password"
              className="text-sm font-medium text-slate-700"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "signup-password-error" : undefined
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
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded-r-md"
                )}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <PasswordStrengthBar password={passwordValue} />
            {errors.password && (
              <p
                id="signup-password-error"
                role="alert"
                className="text-xs text-red-500"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="signup-confirm-password"
              className="text-sm font-medium text-slate-700"
            >
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="signup-confirm-password"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword
                    ? "signup-confirm-password-error"
                    : undefined
                }
                className={cn(
                  "h-10 pr-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
                  "focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:border-blue-600",
                  errors.confirmPassword &&
                    "border-red-400 focus-visible:ring-red-400/30 focus-visible:border-red-400"
                )}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                aria-label={
                  showConfirm ? "Hide password" : "Show confirm password"
                }
                onClick={() => setShowConfirm((prev) => !prev)}
                className={cn(
                  "absolute inset-y-0 right-0 flex items-center px-3",
                  "text-slate-400 hover:text-slate-600 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded-r-md"
                )}
              >
                {showConfirm ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                id="signup-confirm-password-error"
                role="alert"
                className="text-xs text-red-500"
              >
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full flex items-center justify-center gap-2 mt-1",
              "h-10 rounded-md px-4 text-sm font-semibold text-white",
              "bg-[#1A3A7C] hover:bg-[#152F68] active:bg-[#112860]",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3A7C]/50",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <ButtonSpinner />
                Creating account…
              </>
            ) : (
              <>
                Create Account
                <UserPlus className="size-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <Separator className="flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">
            or continue with
          </span>
          <Separator className="flex-1 bg-slate-200" />
        </div>

        {/* Social auth */}
        <div className="flex gap-2.5">
          <SocialAuthButton provider="google" />
          <SocialAuthButton provider="github" />
          <SocialAuthButton provider="facebook" />
        </div>

        {/* Login link */}
        <p className="mt-7 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
