import Image from "next/image";
import { Users } from "lucide-react";

/**
 * LoginBrandPanel
 * Clean, product-led brand panel matching the reference design.
 * Features a real campus innovation-space photograph, concise headline,
 * ecosystem description, and clean audience indicator.
 */
export default function LoginBrandPanel() {
  return (
    <div className="flex flex-col">
      {/* Campus Innovation Space Photo */}
      <div className="relative w-full aspect-[16/11] sm:aspect-[4/3] rounded-xl overflow-hidden border border-slate-200/80 shadow-sm bg-slate-100">
        <Image
          src="/auth-bg.jpg"
          alt="DBIT Incubation Centre"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 420px"
          className="object-cover"
        />
      </div>

      {/* Concise Brand Headline */}
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-5">
        Turn your ideas into impact.
      </h2>

      {/* One-sentence Ecosystem Description */}
      <p className="text-sm text-slate-600 leading-relaxed mt-2.5">
        Connect with mentors, develop prototypes, and build your startup within the campus innovation ecosystem.
      </p>

      {/* Audience Indicator */}
      <div className="flex items-center gap-2 mt-4 text-xs font-medium text-slate-500">
        <Users className="size-4 text-blue-600 shrink-0" aria-hidden="true" />
        <span>Students · Faculty · Mentors · Investors</span>
      </div>
    </div>
  );
}
