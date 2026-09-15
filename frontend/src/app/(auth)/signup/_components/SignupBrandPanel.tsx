/**
 * SignupBrandPanel
 * Left side of the split-screen signup layout.
 *
 * Same visual treatment as LoginBrandPanel (deep navy, dot grid, glow)
 * but with signup-specific copy.
 */

import IncubationPipeline from "@/app/(auth)/login/_components/IncubationPipeline";

function BrandPanelBackground() {
  return (
    <>
      <div className="absolute inset-0 bg-[#0B1F3A]" aria-hidden="true" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 40%, #1E4080, transparent)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />
    </>
  );
}

function BrandLogoMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-400/30">
        <svg
          viewBox="0 0 20 20"
          className="size-5 text-blue-300"
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
      <div>
        <p className="text-sm font-semibold text-white leading-none">
          AAI–DBITIC
        </p>
        <p className="text-[11px] text-slate-400 leading-none mt-0.5">
          Innovation Centre
        </p>
      </div>
    </div>
  );
}

export default function SignupBrandPanel() {
  return (
    <div className="relative flex w-full flex-col p-12 overflow-hidden bg-[#0B1F3A]">
      <BrandPanelBackground />

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo — top */}
        <BrandLogoMark />

        {/* Main copy — fixed offset from logo */}
        <div className="mt-14 max-w-md">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-blue-400 mb-4">
            AI-Powered Incubation
          </p>
          <h1 className="text-[2.25rem] font-bold leading-[1.2] tracking-tight text-white mb-4">
            Join the AAI–DBITIC
            <br />
            Ecosystem
          </h1>
          <p className="text-sm leading-[1.75] text-slate-400 max-w-sm">
            Connect with researchers, mentors, industry leaders and investors.
            Bring your ideas into an ecosystem built for real-world impact.
          </p>
        </div>

        {/* Lifecycle pipeline — pinned to bottom */}
        <div className="mt-auto">
          <IncubationPipeline />
        </div>
      </div>
    </div>
  );
}

