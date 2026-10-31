const DEV_ONLY_SECRET = "fallback_secret_for_dev_only";

/**
 * NextAuth signing secret.
 *
 * - Set: used as is.
 * - Missing in production at RUNTIME: throws, so the server fails loudly instead of signing with a known value.
 * - Missing during `next build`: allowed, because the build only collects route metadata and never signs
 *   or verifies a token (the runtime check above still applies when the server starts).
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.NODE_ENV === "production" && !isBuild) {
    throw new Error("FATAL: NEXTAUTH_SECRET must be configured in production.");
  }
  return DEV_ONLY_SECRET;
}
