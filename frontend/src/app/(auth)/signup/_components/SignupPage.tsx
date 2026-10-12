"use client";

/**
 * SignupPage
 * Product-led, contained registration experience matching the AAI-DBITIC design reference.
 * Restrained palette: soft slate-50 backdrop, crisp white card, balanced split between
 * campus innovation photograph and focused multi-step registration flow.
 */

import { Suspense } from "react";
import Link from "next/link";
import SignupBrandPanel from "./SignupBrandPanel";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-[100svh] w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f4f7fb]">
      {/* ── Contained Auth Card ────────────────────────────────────── */}
      <div className="w-full max-w-[960px] bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_24px_rgba(15,23,42,0.05)] p-6 sm:p-8 lg:p-10">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50/80 border border-blue-100/80 text-blue-600 shadow-sm">
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 leading-tight">AAI-DBITIC</p>
            <p className="text-xs text-slate-500 leading-none mt-0.5">Innovation Centre</p>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Campus Photo + Message */}
          <div className="lg:col-span-5">
            <SignupBrandPanel />
          </div>

          {/* Right Column: Multi-Step Registration Form */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-[460px]">
              <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-slate-100" />}>
                <SignupForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Return to home */}
      <div className="mt-5 text-center">
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1.5"
        >
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}
