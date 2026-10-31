import { SignJWT } from "jose";

export const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:8000";

const DEV_ONLY_SECRET = "test_internal_secret_key_123";

/** Secret shared with agent-service. Only a missing secret in dev falls back to the test value. */
function getInternalJwtSecret(): string {
  const secret = process.env.INTERNAL_JWT_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  if (!secret) {
    if (isProd) throw new Error("FATAL: INTERNAL_JWT_SECRET must be configured in production.");
    return DEV_ONLY_SECRET;
  }
  if (isProd && secret === DEV_ONLY_SECRET) {
    throw new Error("FATAL: Insecure test INTERNAL_JWT_SECRET cannot be used in production.");
  }
  return secret;
}

export type InternalPermission = "submit_application" | "view_applications" | "review_applications";

/** Short-lived (60s) server-to-server JWT accepted by agent-service's get_internal_service. */
export async function createInternalToken(
  user: { id: string; role: string },
  permissions: InternalPermission[],
): Promise<string> {
  return new SignJWT({ sub: user.id, role: user.role, permissions })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("next-server")
    .setAudience("fastapi-internal")
    .setExpirationTime("1m")
    .sign(new TextEncoder().encode(getInternalJwtSecret()));
}
