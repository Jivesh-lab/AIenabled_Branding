import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import { STUDENT_PROJECTS } from "@/mock/student-projects";
import ProjectPortfolio from "./_components/ProjectPortfolio";

export const metadata: Metadata = {
  title: "My Projects | AAI–DBITIC",
};

/**
 * My Projects — the student's portfolio and entry point into each project
 * workspace. Server component: it supplies the data; only the filterable list
 * below is a client component. Swap STUDENT_PROJECTS for an API call later.
 */
export default function MyProjectsPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My Projects"
          description="Manage your ideas, projects and incubation journey."
          action={{ label: "Submit New Idea", href: "/workspace/student/submit" }}
        />
        <ProjectPortfolio projects={STUDENT_PROJECTS} />
      </div>
    </PageContainer>
  );
}
