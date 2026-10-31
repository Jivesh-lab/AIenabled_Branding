import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import JourneyView from "./_components/JourneyView";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SignJWT } from "jose";

export const metadata: Metadata = {
  title: "Journey Timeline | DBIT Incubation Centre",
};

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:8000";
const INTERNAL_JWT_SECRET = process.env.INTERNAL_JWT_SECRET || "test_internal_secret_key_123";

async function getStudentProjects() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !INTERNAL_JWT_SECRET) return [];

  try {
    const secret = new TextEncoder().encode(INTERNAL_JWT_SECRET);
    const token = await new SignJWT({
      sub: session.user.id,
      role: session.user.role,
      permissions: ["view_applications"],
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("next-server")
      .setAudience("fastapi-internal")
      .setExpirationTime("1m")
      .sign(secret);

    const backendRes = await fetch(`${AGENT_SERVICE_URL}/api/applications/`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!backendRes.ok) return [];

    const data = await backendRes.json();
    return data.projects || [];
  } catch (error) {
    console.error("[Journey Page] Error fetching projects:", error);
    return [];
  }
}

export default async function JourneyPage() {
  const projects = await getStudentProjects();

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Journey Timeline"
          description="Track the progress of your projects through the DBIT Incubation Centre journey."
        />
        <JourneyView projects={projects} events={[]} />
      </div>
    </PageContainer>
  );
}
