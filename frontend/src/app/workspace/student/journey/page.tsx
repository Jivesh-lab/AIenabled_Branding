import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import { STUDENT_PROJECTS } from "@/mock/student-projects";
import { JOURNEY_EVENTS } from "@/mock/student-journey";
import JourneyView from "./_components/JourneyView";

export const metadata: Metadata = {
  title: "Journey Timeline | DBIT Incubation Centre",
};

/**
 * Journey Timeline — where a project is in the DBIT Incubation Centre journey,
 * what has happened, and what comes next. Server component supplies the data;
 * the project selector and journey below are one client component.
 */
export default function JourneyPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Journey Timeline"
          description="Track the progress of your projects through the DBIT Incubation Centre journey."
        />
        <JourneyView projects={STUDENT_PROJECTS} events={JOURNEY_EVENTS} />
      </div>
    </PageContainer>
  );
}
