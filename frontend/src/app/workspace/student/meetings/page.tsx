import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import { fetchAgent } from "@/lib/agentProxy";
import { fetchBackend } from "@/lib/backendProxy";
import { STUDENT_READ_ROLES } from "@/lib/apiPolicy";
import { istNow } from "@/lib/workflowState";
import type { ProjectsResponse } from "@/types/student-application";
import type { StudentMeeting } from "@/types/student-workflow";
import LoadError from "../_components/LoadError";
import MeetingsWorkspace from "./_components/MeetingsWorkspace";

export const metadata: Metadata = {
  title: "Meetings | DBIT Incubation Centre",
};

export default async function MeetingsPage() {
  const [meetings, projects] = await Promise.all([
    fetchBackend<StudentMeeting[]>({ path: "/api/student/meetings", roles: STUDENT_READ_ROLES, tag: "Meetings Page" }, []),
    fetchAgent<ProjectsResponse>({ path: "/api/applications/", permissions: ["view_applications"], roles: STUDENT_READ_ROLES, tag: "Meetings Page" }),
  ]);

  const failure = !meetings.ok ? meetings : !projects.ok ? projects : null;
  if (failure) {
    return (
      <PageContainer>
        <LoadError
          title="We couldn't load your meetings"
          message={failure.message}
          canRetry={failure.kind === "unavailable"}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <MeetingsWorkspace
        meetings={meetings.ok ? meetings.data : []}
        projects={projects.ok ? projects.data.projects : []}
        now={istNow()}
      />
    </PageContainer>
  );
}
