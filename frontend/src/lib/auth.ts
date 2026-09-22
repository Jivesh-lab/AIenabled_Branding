import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import FacebookProvider from "next-auth/providers/facebook";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export const authOptions: NextAuthOptions = {
  providers: [
    // -----------------------------------------------------------------------
    // Credentials — email + password (calls our Express backend)
    // -----------------------------------------------------------------------
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("[Auth] authorize() — missing email or password");
          return null;
        }

        console.log(`[Auth] authorize() — calling backend for: ${credentials.email}`);

        let res: Response;
        let data: Record<string, unknown>;

        try {
          res = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              twoFactorCode: (credentials as Record<string, string>).twoFactorCode || "",
            }),
          });
        } catch (networkErr: unknown) {
          // Backend is unreachable (not running, wrong port, etc.)
          const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
          console.error(`[Auth] authorize() — NETWORK ERROR reaching backend at ${BACKEND_URL}: ${msg}`);
          throw new Error("Cannot reach authentication service. Please try again.");
        }

        try {
          data = await res.json() as Record<string, unknown>;
        } catch {
          console.error(`[Auth] authorize() — backend returned non-JSON (status ${res.status})`);
          throw new Error("Unexpected response from authentication service.");
        }

        console.log(`[Auth] authorize() — backend status: ${res.status}, success: ${data.success}`);

        if (data.require2FA) {
          throw new Error("REQUIRE_2FA");
        }

        if (!res.ok || !data.success) {
          throw new Error((data.message as string) || "Invalid credentials");
        }

        const user = data.user as { id: string; name: string; email: string; role: string };
        console.log(`[Auth] authorize() — login OK for role: ${user.role}`);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as any,
        };
      },
    }),

    // -----------------------------------------------------------------------
    // OAuth providers — role assignment handled post-login via onboarding flow
    // -----------------------------------------------------------------------
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "dummy_google_id",
      clientSecret: process.env.GOOGLE_SECRET || "dummy_google_secret",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || "dummy_github_id",
      clientSecret: process.env.GITHUB_SECRET || "dummy_github_secret",
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID || "dummy_facebook_id",
      clientSecret: process.env.FACEBOOK_SECRET || "dummy_facebook_secret",
    }),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  callbacks: {
    // Embed role + id into the JWT on sign-in
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role as typeof token.role;
      }
      return token;
    },

    // Expose id + role on the session object (accessible via useSession / getServerSession)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev_only",
};
