import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import ProjectPortfolio from "./_components/ProjectPortfolio";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL, createInternalToken } from "@/lib/internalToken";
import type { StudentProject } from "@/types/student-application";

export const metadata: Metadata = {
  title: "My Projects | DBIT Incubation Centre",
};

async function getProjects(): Promise<{ projects: StudentProject[]; error: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { projects: [], error: "Authentication is required to load your applications." };

  try {
    const token = await createInternalToken(session.user, ["view_applications"]);

    const backendRes = await fetch(`${AGENT_SERVICE_URL}/api/applications/`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });

    if (!backendRes.ok) return { projects: [], error: "Unable to load your applications." };
    
    const data = await backendRes.json();
    return { projects: (data.projects || []) as StudentProject[], error: null };
  } catch (error) {
    console.error("[Projects Page] Error fetching projects:", error);
    return { projects: [], error: "Unable to load your applications. Please try again." };
  }
}

export default async function MyProjectsPage() {
  const { projects, error } = await getProjects();

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My Projects"
          description="Manage your ideas, projects and incubation journey."
          action={{ label: "Submit New Idea", href: "/workspace/student/submit" }}
        />
        <ProjectPortfolio projects={projects} error={error} />
      </div>
    </PageContainer>
  );
}
