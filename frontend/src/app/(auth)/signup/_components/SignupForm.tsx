"use client";

/**
 * SignupForm — Multi-step registration flow
 *
 * Step 1: Choose account type (role selection as cards)
 * Step 2: Basic information (name + email)
 * Step 3: Role-specific information
 * Step 4: Password + confirm
 * Step 5: Account created / status
 *
 * TODO: Wire onSubmit to real registration API during backend integration.
 */

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialAuthButton from "@/app/(auth)/login/_components/SocialAuthButton";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------
const ROLES = [
  {
    value: "student",
    label: "Student",
    description: "Pursuing academic research or a degree program",
  },
  {
    value: "faculty",
    label: "Faculty",
    description: "Academic staff mentoring or supervising projects",
  },
  {
    value: "mentor",
    label: "Mentor",
    description: "Industry or academic expert guiding startups",
  },
  {
    value: "industry",
    label: "Industry Partner",
    description: "Company collaborating on innovation projects",
  },
  {
    value: "investor",
    label: "Investor",
    description: "Funding or evaluating incubated ventures",
  },
  {
    value: "startup",
    label: "Startup / Alumni",
    description: "Incubated or graduated startup team",
  },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];

// ---------------------------------------------------------------------------
// Validation schemas per step
// ---------------------------------------------------------------------------
const basicSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(80, "Full name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

// Role-specific extra fields
const roleSpecificSchema: Record<RoleValue, z.ZodObject<z.ZodRawShape>> = {
  student: z.object({
    institution: z.string().min(2, "Institution name is required"),
    department: z.string().min(2, "Department / Programme is required"),
    yearOfStudy: z.string().min(1, "Year of study is required"),
  }),
  faculty: z.object({
    institution: z.string().min(2, "Institution name is required"),
    department: z.string().min(2, "Department is required"),
    designation: z.string().min(2, "Designation is required"),
  }),
  mentor: z.object({
    organisation: z.string().min(2, "Organisation is required"),
    expertise: z.string().min(2, "Area of expertise is required"),
    linkedIn: z.string().url("Enter a valid LinkedIn URL").optional().or(z.literal("")),
  }),
  industry: z.object({
    companyName: z.string().min(2, "Company name is required"),
    sector: z.string().min(2, "Industry sector is required"),
    designation: z.string().min(2, "Your role/designation is required"),
  }),
  investor: z.object({
    firmName: z.string().min(2, "Firm / fund name is required"),
    investmentFocus: z.string().min(2, "Investment focus area is required"),
    linkedIn: z.string().url("Enter a valid LinkedIn URL").optional().or(z.literal("")),
  }),
  startup: z.object({
    startupName: z.string().min(2, "Startup / venture name is required"),
    sector: z.string().min(2, "Sector is required"),
    stage: z.string().min(1, "Stage is required"),
  }),
};

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must include at least one uppercase letter")
      .regex(/[0-9]/, "Must include at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type BasicValues = z.infer<typeof basicSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

// ---------------------------------------------------------------------------
// Shared atoms
// ---------------------------------------------------------------------------
function MobileLogoMark() {
  return (
    <div className="flex lg:hidden items-center gap-2.5 mb-8">
      <div className="flex size-8 items-center justify-center rounded-md bg-[#0B1F3A]">
        <svg viewBox="0 0 20 20" className="size-4 text-blue-300" fill="none" aria-hidden="true">
          <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M10 7L13 9V13L10 15L7 13V9L10 7Z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>
      <span className="text-sm font-semibold text-slate-800">AAI–DBITIC</span>
    </div>
  );
}

function ButtonSpinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="text-xs text-red-500 mt-1">{message}</p>;
}

const inputCls = (hasError?: boolean) =>
  cn(
    "h-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
    "focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:border-blue-600",
    hasError && "border-red-400 focus-visible:ring-red-400/30 focus-visible:border-red-400"
  );

const labelCls = "text-sm font-medium text-slate-700";

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            i < current
              ? "bg-blue-600 flex-1"
              : i === current
                ? "bg-blue-600 flex-[2]"
                : "bg-slate-200 flex-1"
          )}
        />
      ))}
    </div>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const colors = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-emerald-400"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors duration-300",
              i <= strength ? colors[strength] : "bg-slate-200"
            )}
          />
        ))}
      </div>
      {strength > 0 && <p className="text-[11px] text-slate-400">{labels[strength]}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Role selector
// ---------------------------------------------------------------------------
function StepRoleSelect({
  onSelect,
}: {
  onSelect: (role: RoleValue) => void;
}) {
  const [selected, setSelected] = useState<RoleValue | null>(null);
  const [error, setError] = useState(false);

  function handleContinue() {
    if (!selected) { setError(true); return; }
    onSelect(selected);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
        <p className="mt-1.5 text-sm text-slate-500">Choose the account type that best describes you</p>
      </div>

      <StepIndicator current={0} total={4} />

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {ROLES.map((role) => (
          <button
            key={role.value}
            type="button"
            onClick={() => { setSelected(role.value); setError(false); }}
            className={cn(
              "text-left rounded-md border p-3.5 transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
              selected === role.value
                ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600/30"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <p className={cn("text-sm font-semibold leading-none mb-1",
              selected === role.value ? "text-blue-700" : "text-slate-800"
            )}>
              {role.label}
            </p>
            <p className="text-[11px] leading-[1.5] text-slate-500">{role.description}</p>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-500 mb-3">Please select your account type to continue.</p>
      )}

      <button
        type="button"
        onClick={handleContinue}
        className={cn(
          "w-full flex items-center justify-center gap-2",
          "h-10 rounded-md px-4 text-sm font-semibold text-white",
          "bg-[#2563EB] hover:bg-[#1d4ed8] active:bg-[#1e40af]",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"
        )}
      >
        Continue
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Basic information
// ---------------------------------------------------------------------------
function StepBasicInfo({
  onBack,
  onNext,
  defaultValues,
}: {
  onBack: () => void;
  onNext: (values: BasicValues) => void;
  defaultValues?: Partial<BasicValues>;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<BasicValues>({
    resolver: zodResolver(basicSchema),
    mode: "onTouched",
    defaultValues,
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Basic information</h2>
        <p className="mt-1.5 text-sm text-slate-500">Tell us your name and institutional email</p>
      </div>

      <StepIndicator current={1} total={4} />

      <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="s-fullname" className={labelCls}>Full name</Label>
          <Input
            id="s-fullname"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "s-fullname-err" : undefined}
            className={inputCls(!!errors.fullName)}
            {...register("fullName")}
          />
          <FieldError id="s-fullname-err" message={errors.fullName?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="s-email" className={labelCls}>Institutional / work email</Label>
          <Input
            id="s-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "s-email-err" : undefined}
            className={inputCls(!!errors.email)}
            {...register("email")}
          />
          <FieldError id="s-email-err" message={errors.email?.message} />
        </div>

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "flex items-center gap-1.5 h-10 rounded-md px-4 text-sm font-medium",
              "border border-slate-200 bg-white text-slate-700",
              "hover:bg-slate-50 transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>
          <button
            type="submit"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 h-10 rounded-md px-4 text-sm font-semibold text-white",
              "bg-[#2563EB] hover:bg-[#1d4ed8] active:bg-[#1e40af]",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"
            )}
          >
            Continue
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Role-specific fields
// ---------------------------------------------------------------------------
type RoleSpecificValues = Record<string, string>;

function StepRoleSpecific({
  role,
  onBack,
  onNext,
  defaultValues,
}: {
  role: RoleValue;
  onBack: () => void;
  onNext: (values: RoleSpecificValues) => void;
  defaultValues?: RoleSpecificValues;
}) {
  const schema = roleSpecificSchema[role];
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleSpecificValues>({
    mode: "onTouched",
    defaultValues,
    resolver: async (values) => {
      const result = await schema.safeParseAsync(values);
      if (result.success) return { values: result.data as RoleSpecificValues, errors: {} };
      const fieldErrors: Record<string, { type: string; message: string }> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString() ?? "_";
        if (!fieldErrors[key]) fieldErrors[key] = { type: "validation", message: issue.message };
      }
      return { values: {}, errors: fieldErrors };
    },
  });


  const fieldSets: Record<RoleValue, { id: string; label: string; placeholder: string; autoComplete?: string }[]> = {
    student: [
      { id: "institution", label: "Institution / University", placeholder: "e.g. Anna University" },
      { id: "department", label: "Department / Programme", placeholder: "e.g. Computer Science" },
      { id: "yearOfStudy", label: "Year of Study", placeholder: "e.g. 3rd Year / PhD Year 1" },
    ],
    faculty: [
      { id: "institution", label: "Institution / University", placeholder: "e.g. Anna University" },
      { id: "department", label: "Department", placeholder: "e.g. Electronics Engineering" },
      { id: "designation", label: "Designation", placeholder: "e.g. Associate Professor" },
    ],
    mentor: [
      { id: "organisation", label: "Organisation", placeholder: "e.g. TechCorp India" },
      { id: "expertise", label: "Area of Expertise", placeholder: "e.g. Product Strategy, FinTech" },
      { id: "linkedIn", label: "LinkedIn Profile (optional)", placeholder: "https://linkedin.com/in/..." },
    ],
    industry: [
      { id: "companyName", label: "Company Name", placeholder: "e.g. Infosys Ltd." },
      { id: "sector", label: "Industry Sector", placeholder: "e.g. Healthcare Technology" },
      { id: "designation", label: "Your Designation", placeholder: "e.g. Head of Innovation" },
    ],
    investor: [
      { id: "firmName", label: "Firm / Fund Name", placeholder: "e.g. Elevation Capital" },
      { id: "investmentFocus", label: "Investment Focus", placeholder: "e.g. Deep Tech, SaaS, B2B" },
      { id: "linkedIn", label: "LinkedIn Profile (optional)", placeholder: "https://linkedin.com/in/..." },
    ],
    startup: [
      { id: "startupName", label: "Startup / Venture Name", placeholder: "e.g. HealthFlow AI" },
      { id: "sector", label: "Sector", placeholder: "e.g. AgriTech, CleanEnergy" },
      { id: "stage", label: "Current Stage", placeholder: "e.g. Pre-seed, MVP, Series A" },
    ],
  };

  const fields = fieldSets[role];
  const roleLabel = ROLES.find((r) => r.value === role)?.label ?? role;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{roleLabel} details</h2>
        <p className="mt-1.5 text-sm text-slate-500">A few more details to complete your profile</p>
      </div>

      <StepIndicator current={2} total={4} />

      <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-4">
        {fields.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <Label htmlFor={`rs-${f.id}`} className={labelCls}>{f.label}</Label>
            <Input
              id={`rs-${f.id}`}
              type="text"
              autoComplete={f.autoComplete}
              placeholder={f.placeholder}
              aria-invalid={!!errors[f.id]}
              aria-describedby={errors[f.id] ? `rs-${f.id}-err` : undefined}
              className={inputCls(!!errors[f.id])}
              {...register(f.id)}
            />
            <FieldError id={`rs-${f.id}-err`} message={errors[f.id]?.message as string | undefined} />
          </div>
        ))}

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "flex items-center gap-1.5 h-10 rounded-md px-4 text-sm font-medium",
              "border border-slate-200 bg-white text-slate-700",
              "hover:bg-slate-50 transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>
          <button
            type="submit"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 h-10 rounded-md px-4 text-sm font-semibold text-white",
              "bg-[#2563EB] hover:bg-[#1d4ed8] active:bg-[#1e40af]",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"
            )}
          >
            Continue
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Password
// ---------------------------------------------------------------------------
function StepPassword({
  onBack,
  onSubmit: onFinalSubmit,
  isSubmitting,
}: {
  onBack: () => void;
  onSubmit: (values: PasswordValues) => void;
  isSubmitting: boolean;
}) {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onTouched",
  });

  // useWatch is React Compiler-safe (avoids stale-UI warning from watch())
  const pwValue = useWatch({ control, name: "password", defaultValue: "" });

  const toggleBtnCls = cn(
    "absolute inset-y-0 right-0 flex items-center px-3",
    "text-slate-400 hover:text-slate-600 transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded-r-md"
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Set your password</h2>
        <p className="mt-1.5 text-sm text-slate-500">Choose a strong password to secure your account</p>
      </div>

      <StepIndicator current={3} total={4} />

      <form onSubmit={handleSubmit(onFinalSubmit)} noValidate className="space-y-4">
        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="s-pw" className={labelCls}>Password</Label>
          <div className="relative">
            <Input
              id="s-pw"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "s-pw-err" : undefined}
              className={cn(inputCls(!!errors.password), "pr-10")}
              {...register("password")}
            />
            <button type="button" aria-label={showPw ? "Hide" : "Show"} onClick={() => setShowPw((p) => !p)} className={toggleBtnCls}>
              {showPw ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <PasswordStrengthBar password={pwValue} />
          <FieldError id="s-pw-err" message={errors.password?.message} />
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <Label htmlFor="s-confirm-pw" className={labelCls}>Confirm password</Label>
          <div className="relative">
            <Input
              id="s-confirm-pw"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "s-confirm-pw-err" : undefined}
              className={cn(inputCls(!!errors.confirmPassword), "pr-10")}
              {...register("confirmPassword")}
            />
            <button type="button" aria-label={showConfirm ? "Hide" : "Show confirm"} onClick={() => setShowConfirm((p) => !p)} className={toggleBtnCls}>
              {showConfirm ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <FieldError id="s-confirm-pw-err" message={errors.confirmPassword?.message} />
        </div>

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className={cn(
              "flex items-center gap-1.5 h-10 rounded-md px-4 text-sm font-medium",
              "border border-slate-200 bg-white text-slate-700",
              "hover:bg-slate-50 transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 h-10 rounded-md px-4 text-sm font-semibold text-white",
              "bg-[#2563EB] hover:bg-[#1d4ed8] active:bg-[#1e40af]",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? <><ButtonSpinner /> Creating account…</> : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Account created / status
// ---------------------------------------------------------------------------
function StepAccountStatus({ email }: { email: string }) {
  return (
    <div className="text-center py-4">
      <div className="flex justify-center mb-5">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
          <CheckCircle className="size-7 text-emerald-600" aria-hidden="true" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Account created</h2>
      <p className="text-sm text-slate-500 max-w-xs mx-auto mb-1">
        We&apos;ve sent a verification email to
      </p>
      <p className="text-sm font-medium text-slate-800 mb-6">{email}</p>
      <p className="text-xs text-slate-400 max-w-xs mx-auto mb-8">
        Your account is pending verification. Please check your inbox and verify your email to activate your AAI–DBITIC account.
      </p>
      <Link
        href="/login"
        className={cn(
          "inline-flex items-center justify-center gap-2 h-10 rounded-md px-6 text-sm font-semibold text-white",
          "bg-[#2563EB] hover:bg-[#1d4ed8] transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"
        )}
      >
        Go to Sign In
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orchestrator: SignupForm
// ---------------------------------------------------------------------------

type FormState = {
  role: RoleValue | null;
  basic: BasicValues | null;
  roleSpecific: RoleSpecificValues | null;
};

export default function SignupForm() {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    role: null,
    basic: null,
    roleSpecific: null,
  });

  // TODO: Replace with real registration API call during backend integration.
  async function handleFinalSubmit() {
    setIsSubmitting(true);
    console.info("[AAI-DBITIC] Signup payload (frontend-only — not yet wired):", {
      role: formState.role,
      email: formState.basic?.email,
      roleSpecific: formState.roleSpecific,
    });
    // Simulate a brief network delay for UX
    await new Promise((r) => setTimeout(r, 800));
    setIsSubmitting(false);
    setStep(4);
  }

  const showSocialBlock = step === 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#F8FAFC] px-6 py-10 sm:px-10 lg:px-14">
      <MobileLogoMark />

      <div className="w-full max-w-[440px]">
        {step === 0 && (
          <StepRoleSelect
            onSelect={(role) => {
              setFormState((s) => ({ ...s, role }));
              setStep(1);
            }}
          />
        )}

        {step === 1 && (
          <StepBasicInfo
            onBack={() => setStep(0)}
            onNext={(basic) => {
              setFormState((s) => ({ ...s, basic }));
              setStep(2);
            }}
            defaultValues={formState.basic ?? undefined}
          />
        )}

        {step === 2 && formState.role && (
          <StepRoleSpecific
            role={formState.role}
            onBack={() => setStep(1)}
            onNext={(roleSpecific) => {
              setFormState((s) => ({ ...s, roleSpecific }));
              setStep(3);
            }}
            defaultValues={formState.roleSpecific ?? undefined}
          />
        )}

        {step === 3 && (
          <StepPassword
            onBack={() => setStep(2)}
            onSubmit={handleFinalSubmit}
            isSubmitting={isSubmitting}
          />
        )}

        {step === 4 && <StepAccountStatus email={formState.basic?.email ?? ""} />}

        {/* Social auth — shown only on Step 1 */}
        {showSocialBlock && (
          <>
            <div className="my-5 flex items-center gap-3">
              <Separator className="flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or sign up with</span>
              <Separator className="flex-1 bg-slate-200" />
            </div>
            <div className="flex gap-2.5">
              <SocialAuthButton provider="google" />
              <SocialAuthButton provider="github" />
              <SocialAuthButton provider="facebook" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
