

import IncubationPipeline from "./IncubationPipeline";

function BrandPanelBackground() {
  return (
    <>
      {/* Deep navy base */}
      <div className="absolute inset-0 bg-[#0B1E3D]" aria-hidden="true" />

      {/* Soft radial glow — one layer only */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 40%, #1E4080, transparent)",
        }}
        aria-hidden="true"
      />

      {/* Dot grid texture */}
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

export default function LoginBrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[55%] flex-col justify-between p-12 overflow-hidden">
      <BrandPanelBackground />

      <div className="relative z-10 flex flex-col h-full gap-12">
        {/* Logo */}
        <BrandLogoMark />

        {/* Main copy */}
        <div className="flex-1 flex flex-col justify-center max-w-md">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-blue-400 mb-5">
            AI-Powered Incubation
          </p>
          <h1 className="text-[2.6rem] font-bold leading-[1.15] tracking-tight text-white mb-5">
            Where Ideas
            <br />
            Become Ventures
          </h1>
          <p className="text-[0.95rem] leading-[1.75] text-slate-400 max-w-sm">
            A connected ecosystem that helps transform academic innovation into
            research, prototypes, startups and real-world impact.
          </p>
        </div>

        {/* Lifecycle pipeline */}
        <IncubationPipeline />
      </div>
    </div>
  );
}
