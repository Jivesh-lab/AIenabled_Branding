const DEV_ONLY_SECRET = "fallback_secret_for_dev_only";

/** NextAuth signing secret. Only a missing secret outside production falls back to the dev value. */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: NEXTAUTH_SECRET must be configured in production.");
  }
  return DEV_ONLY_SECRET;
}
