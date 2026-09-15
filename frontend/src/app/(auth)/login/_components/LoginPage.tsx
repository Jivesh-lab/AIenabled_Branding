"use client";

/**
 * LoginPage
 * Assembles the split-screen login layout:
 *   Left  → LoginBrandPanel (55% on desktop, hidden on mobile)
 *   Right → LoginForm       (flex-1, always visible)
 *
 * Owns entrance animations. Respects prefers-reduced-motion.
 */

import type { Variants } from "motion/react";
import { motion, useReducedMotion } from "motion/react";
import LoginBrandPanel from "./LoginBrandPanel";
import LoginForm from "./LoginForm";

export default function LoginPage() {
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
    <div className="flex min-h-screen w-full overflow-hidden">
      {/* Left — brand panel, animates in from left */}
      <motion.div
        className="hidden lg:flex lg:w-[55%] shrink-0"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <LoginBrandPanel />
      </motion.div>

      {/* Right — form panel, animates in from right */}
      <motion.div
        className="flex flex-1 min-h-screen"
        variants={formVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
      >
        <LoginForm />
      </motion.div>
    </div>
  );
}
