"use client";

/**
 * SignupForm — Multi-step registration flow
 * Minimal, product-led authentication matching the DBIT Incubation Centre design reference.
 *
 * Step 0: Choose account type (vertical stack cards)
 * Step 1: Basic information (name + email)
 * Step 2: Role-specific details
 * Step 3: Password + confirm
 * Step 4: Account created / status
 */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Role definitions — matches the reference mockup exactly
// ---------------------------------------------------------------------------
const ROLES = [
  {
    value: "student",
    label: "Student",
    description: "Develop an idea or startup",
  },
  {
    value: "faculty",
    label: "Faculty",
    description: "Guide student innovation",
  },
  {
    value: "mentor",
    label: "Mentor",
    description: "Support startup founders",
  },
  {
    value: "investor",
    label: "Investor",
    description: "Discover new ventures",
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
  investor: z.object({
    firmName: z.string().min(2, "Firm / fund name is required"),
    investmentFocus: z.string().min(2, "Investment focus area is required"),
    linkedIn: z.string().url("Enter a valid LinkedIn URL").optional().or(z.literal("")),
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
// Shared UI Atoms
// ---------------------------------------------------------------------------
function ButtonSpinner() {
  return (
    <svg className="size-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    "h-11 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm",
    "focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-colors",
    hasError && "border-red-400 focus-visible:ring-red-400/20 focus-visible:border-red-400"
  );

const labelCls = "text-sm font-medium text-slate-700";

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
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

  const colors = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-emerald-500"];
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
      {strength > 0 && <p className="text-[11px] text-slate-400">{labels[strength]}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 0 — Role selector (Matches Reference Screenshot)
// ---------------------------------------------------------------------------
function StepRoleSelect({
  selectedRole,
  onSelect,
}: {
  selectedRole: RoleValue | null;
  onSelect: (role: RoleValue) => void;
}) {
  const [selected, setSelected] = useState<RoleValue | null>(selectedRole ?? "student");

  function handleContinue() {
    if (selected) {
      onSelect(selected);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Heading */}
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        Create your account
      </h2>
      <p className="mt-1 text-sm text-slate-500 mb-5">
        Choose how you want to participate in the innovation ecosystem.
      </p>

      {/* Vertical Stack Options */}
      <div className="space-y-2.5">
        {ROLES.map((role) => {
          const isSelected = selected === role.value;
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => setSelected(role.value)}
              className={cn(
                "w-full text-left rounded-xl p-3.5 transition-all cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30",
                isSelected
                  ? "border-2 border-blue-600 bg-blue-50/25 ring-1 ring-blue-600/10 shadow-xs"
                  : "border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              )}
            >
              <p className={cn("text-sm font-semibold leading-tight", isSelected ? "text-blue-700" : "text-slate-900")}>
                {role.label}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                {role.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        disabled={!selected}
        onClick={handleContinue}
        className={cn(
          "w-full h-11 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-xl",
          "transition-colors mt-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        Continue
      </button>

      {/* Switch to login */}
      <div className="mt-4 text-center">
        <Link
          href="/login"
          className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          Already registered?{" "}
          <span className="text-blue-600 hover:underline font-medium">Sign in</span>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Basic information
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicValues>({
    resolver: zodResolver(basicSchema),
    mode: "onTouched",
    defaultValues,
  });

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Basic information</h2>
      <p className="mt-1 text-sm text-slate-500 mb-4">Tell us your name and institutional email</p>

      <StepIndicator current={1} total={4} />

      <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="s-fullname" className={labelCls}>
            Full name
          </Label>
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
          <Label htmlFor="s-email" className={labelCls}>
            Institutional / work email
          </Label>
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

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "flex items-center gap-1.5 h-11 rounded-xl px-4 text-sm font-medium",
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
              "flex-1 flex items-center justify-center h-11 rounded-xl px-4 text-sm font-medium text-white",
              "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2"
            )}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Role-specific fields
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
      { id: "institution", label: "Institution / University", placeholder: "e.g. DBIT / Mumbai University" },
      { id: "department", label: "Department / Programme", placeholder: "e.g. Computer Engineering" },
      { id: "yearOfStudy", label: "Year of Study", placeholder: "e.g. 3rd Year / 4th Year" },
    ],
    faculty: [
      { id: "institution", label: "Institution / University", placeholder: "e.g. DBIT" },
      { id: "department", label: "Department", placeholder: "e.g. Information Technology" },
      { id: "designation", label: "Designation", placeholder: "e.g. Assistant Professor" },
    ],
    mentor: [
      { id: "organisation", label: "Organisation", placeholder: "e.g. TechCorp Labs" },
      { id: "expertise", label: "Area of Expertise", placeholder: "e.g. Product Strategy, AI/ML" },
      { id: "linkedIn", label: "LinkedIn Profile (optional)", placeholder: "https://linkedin.com/in/..." },
    ],
    investor: [
      { id: "firmName", label: "Firm / Fund Name", placeholder: "e.g. Seed Ventures" },
      { id: "investmentFocus", label: "Investment Focus", placeholder: "e.g. Deep Tech, SaaS, Web3" },
      { id: "linkedIn", label: "LinkedIn Profile (optional)", placeholder: "https://linkedin.com/in/..." },
    ],
  };

  const fields = fieldSets[role];
  const roleLabel = ROLES.find((r) => r.value === role)?.label ?? role;

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{roleLabel} details</h2>
      <p className="mt-1 text-sm text-slate-500 mb-4">A few more details to set up your profile</p>

      <StepIndicator current={2} total={4} />

      <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-4">
        {fields.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <Label htmlFor={`rs-${f.id}`} className={labelCls}>
              {f.label}
            </Label>
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

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "flex items-center gap-1.5 h-11 rounded-xl px-4 text-sm font-medium",
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
              "flex-1 flex items-center justify-center h-11 rounded-xl px-4 text-sm font-medium text-white",
              "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2"
            )}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Password
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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onTouched",
  });

  const pwValue = useWatch({ control, name: "password", defaultValue: "" });

  const toggleBtnCls = cn(
    "absolute inset-y-0 right-0 flex items-center px-3",
    "text-slate-400 hover:text-slate-600 transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded-r-xl"
  );

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Set your password</h2>
      <p className="mt-1 text-sm text-slate-500 mb-4">Choose a secure password for your account</p>

      <StepIndicator current={3} total={4} />

      <form onSubmit={handleSubmit(onFinalSubmit)} noValidate className="space-y-4">
        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="s-pw" className={labelCls}>
            Password
          </Label>
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
            <button
              type="button"
              aria-label={showPw ? "Hide password" : "Show password"}
              onClick={() => setShowPw((p) => !p)}
              className={toggleBtnCls}
            >
              {showPw ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <PasswordStrengthBar password={pwValue} />
          <FieldError id="s-pw-err" message={errors.password?.message} />
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <Label htmlFor="s-confirm-pw" className={labelCls}>
            Confirm password
          </Label>
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
            <button
              type="button"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setShowConfirm((p) => !p)}
              className={toggleBtnCls}
            >
              {showConfirm ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <FieldError id="s-confirm-pw-err" message={errors.confirmPassword?.message} />
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className={cn(
              "flex items-center gap-1.5 h-11 rounded-xl px-4 text-sm font-medium",
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
              "flex-1 flex items-center justify-center h-11 rounded-xl px-4 text-sm font-medium text-white",
              "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <ButtonSpinner /> Creating account…
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Account created / status
// ---------------------------------------------------------------------------
function StepAccountStatus({
  email,
  role,
}: {
  email: string;
  role: RoleValue | null;
}) {
  return (
    <div className="text-center py-4">
      <div className="flex justify-center mb-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
          <CheckCircle className="size-6 text-emerald-600" aria-hidden="true" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Account created</h2>
      <p className="text-sm text-slate-500 max-w-xs mx-auto mb-1">
        We&apos;ve registered your incubation account for
      </p>
      <p className="text-sm font-semibold text-slate-900 mb-4">{email}</p>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
        Your account is ready. Sign in to access your {role ? `${role} workspace` : "workspace"} and get started.
      </p>
      <Link
        href={`/login?email=${encodeURIComponent(email)}`}
        className={cn(
          "inline-flex items-center justify-center h-11 rounded-xl px-6 text-sm font-medium text-white",
          "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2"
        )}
      >
        Sign in to your account
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
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    role: "student",
    basic: null,
    roleSpecific: null,
  });

  async function handleFinalSubmit(passwordValues: PasswordValues) {
    if (!formState.role || !formState.basic) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formState.basic.fullName,
        email: formState.basic.email,
        password: passwordValues.password,
        role: formState.role,
        profile: formState.roleSpecific ?? {},
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Registration failed. Please try again.");
        return;
      }

      toast.success("Account created successfully!");

      // Attempt automatic sign-in so user transitions directly to workspace
      const signInResult = await signIn("credentials", {
        redirect: false,
        email: formState.basic.email,
        password: passwordValues.password,
      });

      if (signInResult?.ok) {
        const dest = `/workspace/${formState.role}/dashboard`;
        router.replace(dest);
        return;
      }

      // If auto sign-in doesn't immediately complete, show step 4 confirmation screen
      setStep(4);
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      {step === 0 && (
        <StepRoleSelect
          selectedRole={formState.role}
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
          onSubmit={(values) => handleFinalSubmit(values)}
          isSubmitting={isSubmitting}
        />
      )}

      {step === 4 && (
        <StepAccountStatus
          email={formState.basic?.email ?? ""}
          role={formState.role}
        />
      )}
    </div>
  );
}
