"use client";

/**
 * SignupPage
 * Full-bleed background photo layout matching the AAI-DBITIC template.
 * Same structure as LoginPage â€“ edge-to-edge photo, top nav, left copy,
 * right glass card.
 */

import type { Variants } from "motion/react";
import { motion, useReducedMotion } from "motion/react";
import SignupBrandPanel from "./SignupBrandPanel";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  const shouldReduceMotion = useReducedMotion();

  const leftVariants: Variants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -24 },
    visible: { opacity: 1, x: 0 },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* -- Background photo --------------------------------------- */}
      <div className="absolute inset-0 z-0">
        <img
          src="/auth-bg.jpg"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/30" />
      </div>

      {/* -- Decorative blue blobs ---------------------------------- */}
      <div
        className="absolute bottom-0 left-0 w-64 h-64 z-10 pointer-events-none"
        aria-hidden="true"
        style={{
          background: "radial-gradient(circle at 0% 100%, #1D4ED8 0%, #1D4ED8 55%, transparent 55%)",
          borderRadius: "0 80px 0 0",
          opacity: 0.92,
        }}
      />
      <div
        className="absolute top-0 right-0 w-52 h-52 z-10 pointer-events-none"
        aria-hidden="true"
        style={{
          background: "radial-gradient(circle at 100% 0%, #1D4ED8 0%, #1D4ED8 55%, transparent 55%)",
          borderRadius: "0 0 0 80px",
          opacity: 0.88,
        }}
      />

      {/* -- Top navigation bar ------------------------------------- */}
      <nav
        className="relative z-30 flex items-center justify-between px-8 py-4 lg:px-12"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg border border-blue-700/40 bg-white/20 backdrop-blur-sm">
            <svg viewBox="0 0 20 20" className="size-5 text-blue-800" fill="none" aria-hidden="true">
              <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 7L13 9V13L10 15L7 13V9L10 7Z" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">AAI-DBITIC</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">Innovation Centre</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["IDEAS", "PEOPLE", "INCUBATE", "RESOURCES"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-xs font-semibold tracking-widest text-slate-700 hover:text-blue-700 transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="hidden lg:block text-right">
          <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Student Ideas</p>
          <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Real Solutions</p>
        </div>
      </nav>

      {/* -- Main two-column body ----------------------------------- */}
      <div className="relative z-20 flex flex-1 items-center px-8 pb-8 lg:px-12 gap-8 lg:gap-16">
        {/* Left panel */}
        <motion.div
          className="hidden lg:flex flex-col flex-1 justify-center"
          variants={leftVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <SignupBrandPanel />
        </motion.div>

        {/* Right â€“ glass card */}
        <motion.div
          className="w-full lg:w-auto lg:min-w-[440px] lg:max-w-[480px] ml-auto"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <SignupForm />
        </motion.div>
      </div>

      {/* -- Bottom-left corner labels ------------------------------ */}
      <div className="absolute bottom-6 left-8 z-30 pointer-events-none hidden lg:block">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/90">Same Campus</p>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/90">Bigger Possibilities</p>
      </div>

      {/* -- Bottom center labels ----------------------------------- */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none hidden lg:flex gap-4">
        {["INNOVATION", "COLLABORATION", "IMPACT"].map((t, i) => (
          <span key={t} className="flex items-center gap-4 text-[10px] font-semibold tracking-widest text-slate-600">
            {i > 0 && <span className="text-slate-400">|</span>}
            {t}
          </span>
        ))}
      </div>

      {/* -- Bottom-right vertical labels -------------------------- */}
      <div className="absolute bottom-8 right-8 z-30 pointer-events-none hidden lg:flex flex-col gap-1 items-end">
        {["- IDEAS", "- PEOPLE", "- TECHNOLOGY", "- IMPACT"].map((t) => (
          <p key={t} className="text-[10px] font-semibold tracking-widest text-white/80 uppercase">{t}</p>
        ))}
      </div>
    </div>
  );
}
