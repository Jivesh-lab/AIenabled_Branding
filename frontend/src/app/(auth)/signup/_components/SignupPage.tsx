"use client";

/**
 * SignupPage — Full-height 42/58 split layout (mirrors LoginPage exactly)
 *
 * Structure:
 *   root div: h-svh flex-col          → fills exactly the viewport
 *     <header>: shrink-0, h-[72px]    → compact, consistent
 *     <main>: flex-1, flex-row        → fills remaining height exactly
 *       left panel: 42%               → branding, vertically centred
 *       <div 1px border>              → continuous separator
 *       right panel: flex-1 (58%)     → form, vertically centred, scrolls if needed
 */

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users } from "lucide-react";
import SignupForm from "./SignupForm";
import DbitLogo from "@/components/shared/DbitLogo";

export default function SignupPage() {
  return (
    <div className="flex flex-col h-[100svh] w-full overflow-hidden bg-white">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-3 px-10 sm:px-14 border-b border-slate-100" style={{ height: "72px" }}>
        <DbitLogo variant="full" size="md" theme="light" href="/" />
      </header>

      {/* ── Main two-panel area ─────────────────────────────────────────────── */}
      <main className="flex flex-1 min-h-0 flex-col lg:flex-row">

        {/* ── Left: Branding panel (42%) ──────────────────────────────────── */}
        <div
          className="hidden lg:flex flex-col justify-center px-12 xl:px-16 py-10"
          style={{ width: "42%" }}
        >
          {/* Campus image */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100" style={{ aspectRatio: "16/11" }}>
            <Image
              src="/auth-bg.jpg"
              alt="DBIT Incubation Centre campus"
              fill
              priority
              sizes="42vw"
              className="object-cover"
            />
          </div>

          {/* Headline */}
          <h1 className="text-[26px] xl:text-[28px] font-bold text-slate-900 tracking-tight mt-6 leading-[1.2]">
            Turn your ideas<br />into impact.
          </h1>
          <p className="text-[13px] text-slate-500 mt-2 max-w-sm leading-relaxed">
            Connect with mentors, track milestone deliverables, and access innovation grants through your unified researcher workspace.
          </p>

          {/* Mini trust row */}
          <div className="flex items-center gap-2 mt-5 text-[11px] text-slate-400">
            <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold text-[9px]">
              <Users className="size-3 text-slate-500" />
            </span>
            <span>Academic incubation platform · Don Bosco Institute of Technology</span>
          </div>
        </div>

        {/* ── 1px continuous vertical separator ────────────────────────────── */}
        <div className="hidden lg:block w-[1px] bg-slate-100 self-stretch" />

        {/* ── Right: Form area (58%) ───────────────────────────────────────── */}
        <div className="flex flex-1 flex-col justify-center px-8 sm:px-14 md:px-20 lg:px-14 xl:px-20 py-8 overflow-y-auto">
          <div className="w-full max-w-[400px] mx-auto flex flex-col">

            {/* Mobile-only brand banner */}
            <div className="lg:hidden mb-6 flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-100 text-blue-600">
                <DbitLogo variant="mark" size="sm" />
              </div>
              <span className="text-[14px] font-bold text-slate-900">DBIT Incubation Centre</span>
            </div>

            {/* Title */}
            <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">Create your account</h2>
            <p className="text-[13px] text-slate-500 mt-1">
              Select your role to get access to the DBIT Incubation Centre platform.
            </p>

            {/* Form wrapped in Suspense for useSearchParams */}
            <div className="mt-5">
              <Suspense fallback={
                <div className="h-64 flex items-center justify-center text-sm text-slate-400">
                  Loading registration form…
                </div>
              }>
                <SignupForm />
              </Suspense>
            </div>

            {/* Already registered? */}
            <p className="text-[12px] text-center text-slate-500 mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2">
                Sign in
              </Link>
            </p>

            {/* Back to home */}
            <div className="mt-3 text-center">
              <Link href="/" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                ← Back to homepage
              </Link>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
