import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import JourneyView from "./_components/JourneyView";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL, createInternalToken } from "@/lib/internalToken";
import type { StudentProject } from "@/types/student-application";

export const metadata: Metadata = {
  title: "Journey Timeline | DBIT Incubation Centre",
};

async function getStudentProjects(): Promise<{ projects: StudentProject[]; error: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { projects: [], error: "Authentication is required to load your journey." };
  }

  try {
    const token = await createInternalToken(session.user, ["view_applications"]);

    const backendRes = await fetch(`${AGENT_SERVICE_URL}/api/applications/`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!backendRes.ok) return { projects: [], error: "Unable to load your journey." };

    const data = await backendRes.json();
    return { projects: (data.projects || []) as StudentProject[], error: null };
  } catch (error) {
    console.error("[Journey Page] Error fetching projects:", error);
    return { projects: [], error: "Unable to load your journey. Please try again." };
  }
}

export default async function JourneyPage() {
  const { projects, error } = await getStudentProjects();

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Journey Timeline"
          description="Track the progress of your projects through the DBIT Incubation Centre journey."
        />
        <JourneyView projects={projects} events={[]} error={error} />
      </div>
    </PageContainer>
  );
}
