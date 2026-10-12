import { SignJWT } from "jose";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET must be configured in production environment.");
    }
    return "change_this_to_a_long_random_secret_in_production";
  }
  if (process.env.NODE_ENV === "production" && secret === "change_this_to_a_long_random_secret_in_production") {
    throw new Error("FATAL: Insecure default JWT_SECRET cannot be used in production.");
  }
  return secret;
}

export async function createBackendToken(userId: string, role: string): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret());
  return new SignJWT({ sub: userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);
}

