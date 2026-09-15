import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import { MEETINGS } from "@/mock/student-meetings";
import { STUDENT_PROJECTS } from "@/mock/student-projects";
import MeetingsWorkspace from "./_components/MeetingsWorkspace";

export const metadata: Metadata = {
  title: "Meetings | AAI–DBITIC",
};

/**
 * Meetings — schedule, prepare for, attend and review project meetings.
 * Server component supplies the data; the workspace is the client island.
 */
export default function MeetingsPage() {
  return (
    <PageContainer>
      <MeetingsWorkspace meetings={MEETINGS} projects={STUDENT_PROJECTS} />
    </PageContainer>
  );
}
