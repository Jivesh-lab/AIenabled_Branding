"use client";

import { useSession } from "next-auth/react";

/**
 * Page heading. The "New Idea" action already lives in the top header, so it is not repeated here.
 * The greeting uses the signed-in student's real first name and is simply omitted until the session is known.
 */
export default function DashboardHeader() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0];

  return (
    <header className="min-w-0">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[28px]">Student Dashboard</h1>
      <p className="mt-1.5 text-[14px] text-muted-ink">
        {firstName ? `Welcome back, ${firstName}. ` : "Welcome back. "}
        Track your startup projects, incubation progress and upcoming activities.
      </p>
    </header>
  );
}
