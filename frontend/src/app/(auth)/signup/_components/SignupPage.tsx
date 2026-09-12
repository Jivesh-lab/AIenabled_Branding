"use client";

/**
 * SignupPage
 * Assembles the split-screen signup layout:
 *   Left  → SignupBrandPanel (55% on desktop)
 *   Right → SignupForm       (flex-1)
 *
 * Owns entrance animations via Motion.
 * Respects prefers-reduced-motion.
 */

import type { Variants } from "motion/react";
import { motion, useReducedMotion } from "motion/react";
import SignupBrandPanel from "./SignupBrandPanel";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  const shouldReduceMotion = useReducedMotion();

  const panelVariants: Variants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -16 },
    visible: { opacity: 1, x: 0 },
  };

  const formVariants: Variants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 16 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left — brand panel (desktop only) */}
      <motion.div
        className="contents"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <SignupBrandPanel />
      </motion.div>

      {/* Right — signup form */}
      <motion.div
        className="contents"
        variants={formVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
      >
        <SignupForm />
      </motion.div>
    </div>
  );
}
