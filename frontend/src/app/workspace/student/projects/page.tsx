import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import { fetchAgent } from "@/lib/agentProxy";
import { STUDENT_READ_ROLES } from "@/lib/apiPolicy";
import { getMentorInfoForProjects } from "@/lib/mentorAllocation";
import type { ProjectsResponse } from "@/types/student-application";
import LoadError from "../_components/LoadError";
import ProjectPortfolio from "./_components/ProjectPortfolio";

export const metadata: Metadata = {
  title: "My Projects | DBIT Incubation Centre",
};

export default async function MyProjectsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.slice(0, 100) ?? "";
  const result = await fetchAgent<ProjectsResponse>({
    path: "/api/applications/",
    permissions: ["view_applications"],
    roles: STUDENT_READ_ROLES,
    tag: "Projects Page",
  });

  const mentors = result.ok ? await getMentorInfoForProjects(result.data.projects) : {};

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My Projects"
          description="Manage your ideas, projects and incubation journey."
          action={{ label: "Submit New Idea", href: "/workspace/student/submit" }}
        />
        {result.ok ? (
          <ProjectPortfolio key={query} projects={result.data.projects} mentors={mentors} initialQuery={query} />
        ) : (
          <LoadError
            title="We couldn't load your projects"
            message={result.message}
            canRetry={result.kind === "unavailable"}
          />
        )}
      </div>
    </PageContainer>
  );
}
