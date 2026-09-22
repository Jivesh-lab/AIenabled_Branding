/**
 * LoginBrandPanel
 * Left-side content overlay rendered directly on the background photo.
 * Shows the bold "Ideas / People / Progress" tagline, feature icons,
 * and a decorative italic card â€” matching the template design.
 */

import { Lightbulb, Users, Rocket } from "lucide-react";

const FEATURES = [
  { icon: Lightbulb, label: "Ideate", sub: "Freely" },
  { icon: Users,     label: "Find",   sub: "Mentors" },
  { icon: Rocket,    label: "Launch", sub: "Startups" },
];

const STACK_WORDS = ["BUILD", "INNOVATE", "COLLABORATE", "CREATE", "GROW"];

export default function LoginBrandPanel() {
  return (
    <div className="flex flex-col justify-center max-w-lg pr-8">
      {/* AI-Powered label */}
      <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-blue-700 mb-6">
        AI-Powered Incubation
      </p>

      {/* Main headline */}
      <h1 className="text-[3.4rem] font-extrabold leading-[1.1] tracking-tight text-slate-900 mb-6">
        <span className="block">Ideas</span>
        <span className="block text-blue-700">People</span>
        <span className="block">Progress</span>
      </h1>

      {/* Description */}
      <p className="text-[0.9rem] text-slate-600 leading-relaxed mb-10 max-w-sm">
        A connected ecosystem that helps transform academic innovation into research, prototypes,
        startups and real-world impact.
      </p>

      {/* Feature icons */}
      <div className="flex items-start gap-8 mb-12">
        {FEATURES.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div className="flex size-12 items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm border border-blue-100 shadow-sm">
              <Icon className="size-5 text-blue-700" aria-hidden="true" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-slate-800">{label}</p>
              <p className="text-xs text-slate-500">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="w-8 h-0.5 bg-blue-700 mb-6" />

      {/* Word stack â€“ centre of panel, shown inline */}
      <div className="flex gap-2 flex-wrap">
        {STACK_WORDS.map((w) => (
          <span
            key={w}
            className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase"
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}
