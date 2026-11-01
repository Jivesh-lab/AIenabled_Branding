"use client";

import { useSession } from "next-auth/react";
import { firstNameOf } from "@/lib/displayName";

/**
 * Page heading, the same size and weight as every other portal page. The greeting uses the signed-in mentor's real
 * first name and is simply left out until the session is known - never a placeholder name.
 */
export default function DashboardHeader() {
  const { data: session } = useSession();
  const firstName = firstNameOf(session?.user?.name);
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-[18px] font-semibold leading-tight tracking-tight text-ink sm:text-[20px]">Mentor Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-muted-ink">
          {firstName ? `Welcome back, ${firstName}. ` : "Welcome back. "}
          Here is what is happening with your mentees today.
        </p>
      </div>
      <p className="shrink-0 text-[13px] text-muted-ink" suppressHydrationWarning>
        {today}
      </p>
    </header>
  );
}
