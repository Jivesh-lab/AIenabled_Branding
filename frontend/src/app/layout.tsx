import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import { Toaster } from "sonner";
import AgentChatWidget from "@/components/AgentChatWidget";
import RouteProgress from "@/components/shared/RouteProgress";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-landing",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DBIT | Incubation Centre",
  description:
    "DBIT Incubation Centre is an AI-powered academic incubation platform connecting researchers, faculty, mentors, industry and investors.",
  keywords: ["DBIT", "DBIT Incubation Centre", "DBIT entrepreneurship", "researcher innovation", "startup incubation", "Idiot's Room"],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/logo-mark.svg",
  },
  openGraph: {
    title: "DBIT | Incubation Centre",
    description: "Turn researcher ideas into research, prototypes, startups, and real-world impact.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <RouteProgress />
        <AuthProvider>
          {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
            <AgentChatWidget />
          </AuthProvider>
      </body>
    </html>
  );
}
