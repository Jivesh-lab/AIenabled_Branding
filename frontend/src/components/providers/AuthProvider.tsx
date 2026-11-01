"use client";

import { SessionProvider } from "next-auth/react";
import AppStartupLoader from "@/components/shared/AppStartupLoader";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AppStartupLoader />
      {children}
    </SessionProvider>
  );
}
