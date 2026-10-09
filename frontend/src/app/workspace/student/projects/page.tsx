import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import ProjectPortfolio from "./_components/ProjectPortfolio";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SignJWT } from "jose";

export const metadata: Metadata = {
  title: "My Projects | AAI–DBITIC",
};

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:8000";
const INTERNAL_JWT_SECRET = process.env.INTERNAL_JWT_SECRET;

async function getProjects() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !INTERNAL_JWT_SECRET) return [];

  try {
    const secret = new TextEncoder().encode(INTERNAL_JWT_SECRET);
    const token = await new SignJWT({
      sub: session.user.id,
      role: session.user.role,
      permissions: ["view_applications"]
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
      cache: "no-store"
    });

    if (!backendRes.ok) return [];
    
    const data = await backendRes.json();
    return data.projects || [];
  } catch (error) {
    console.error("[Projects Page] Error fetching projects:", error);
    return [];
  }
}

export default async function MyProjectsPage() {
  const projects = await getProjects();

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My Projects"
          description="Manage your ideas, projects and incubation journey."
          action={{ label: "Submit New Idea", href: "/workspace/student/submit" }}
        />
        <ProjectPortfolio projects={projects} />
      </div>
    </PageContainer>
  );
}
