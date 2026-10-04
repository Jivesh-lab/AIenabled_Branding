import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AAI–DBITIC | Innovation Centre",
  description:
    "AAI–DBITIC is an AI-powered academic incubation platform connecting students, faculty, mentors, industry and investors.",
  keywords: ["AAI–DBITIC", "DBIT entrepreneurship", "student innovation", "startup incubation", "Idiot's Room"],
  openGraph: {
    title: "AAI–DBITIC | Innovation Centre",
    description: "Turn student ideas into research, prototypes, startups, and real-world impact.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={4000}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
