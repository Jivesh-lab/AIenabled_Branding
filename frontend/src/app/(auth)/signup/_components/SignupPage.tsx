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

function BrandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

export default function SignupPage() {
  return (
    <div className="flex flex-col h-[100svh] w-full overflow-hidden bg-white">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-3 px-10 sm:px-14 border-b border-slate-100" style={{ height: "72px" }}>
        <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
          <BrandIcon className="size-4" />
        </div>
        <div className="flex flex-col">
          <p className="text-[14px] font-bold text-slate-900 leading-tight tracking-tight">DBIT</p>
          <p className="text-[11px] font-medium text-slate-500 leading-none mt-0.5">Incubation Centre</p>
        </div>
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

          {/* Body copy */}
          <p className="text-[13.5px] text-slate-500 leading-relaxed mt-3 max-w-[340px]">
            Connect with mentors, develop prototypes, and build your startup within the campus innovation ecosystem.
          </p>

          {/* Audience */}
          <div className="flex items-center gap-2 mt-5 text-[12px] font-medium text-slate-400">
            <Users className="size-3.5 text-blue-500 shrink-0" aria-hidden="true" />
            <span>Students · Faculty · Mentors · Investors</span>
          </div>
        </div>

        {/* ── Vertical separator (desktop only) ──────────────────────────── */}
        <div className="hidden lg:block w-px bg-slate-100 self-stretch shrink-0" />

        {/* ── Right: Form panel (flex-1 = 58%) ───────────────────────────── */}
        {/*
         * overflow-y-auto: later signup steps (role-specific, password) are taller.
         * This panel scrolls internally rather than causing a page-level scrollbar.
         */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-14 xl:px-20 py-10">
            <div className="w-full max-w-[480px]">
              <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-100" />}>
                <SignupForm />
              </Suspense>
            </div>
          </div>

          {/* Back to homepage — inside the panel, not a separate footer strip */}
          <div className="shrink-0 px-8 pb-5 text-center">
            <Link
              href="/"
              className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1"
            >
              ← Back to homepage
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
