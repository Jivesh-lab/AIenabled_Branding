import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import FacebookProvider from "next-auth/providers/facebook";

const handler = NextAuth({
  providers: [
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
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Adding the provider or other custom data to the session could be done here
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev_only",
});

export { handler as GET, handler as POST };
