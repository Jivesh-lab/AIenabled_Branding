import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import MeetingsWorkspace from "./_components/MeetingsWorkspace";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AGENT_SERVICE_URL, createInternalToken } from "@/lib/internalToken";
import type { Meeting } from "@/types/meeting";

export const metadata: Metadata = {
  title: "Meetings | DBIT Incubation Centre",
};

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

async function getMeetings(): Promise<Meeting[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/faculty/meetings`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data.map((m: any) => ({
          id: m.id || m._id,
          title: m.agenda || "Advisory Mentorship Review",
          projectId: m.projectId || "p1",
          projectName: m.projectTitle || "Incubation Project",
          type: "MENTOR_SESSION",
          date: m.date ? new Date(m.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          startTime: m.time || "10:00",
          endTime: "11:00",
          host: { name: m.facultyGuide || "Faculty Advisor", role: "Mentor" },
          participants: [{ name: m.studentLead || "Student", role: "Founder" }],
          agenda: [m.agenda || "Progress Review"],
          meetingLink: m.meetingLink,
          location: m.location || "Online",
          actionItems: [],
        }));
      }
    }
  } catch (err) {
    console.error("[Meetings Page] Error fetching meetings:", err);
  }
  return [];
}

async function getStudentProjects() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  try {
    const token = await createInternalToken(session.user, ["view_applications"]);

    const backendRes = await fetch(`${AGENT_SERVICE_URL}/api/applications/`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!backendRes.ok) return [];

    const data = await backendRes.json();
    return data.projects || [];
  } catch {
    return [];
  }
}

export default async function MeetingsPage() {
  const [meetings, projects] = await Promise.all([getMeetings(), getStudentProjects()]);

  return (
    <PageContainer>
      <MeetingsWorkspace meetings={meetings} projects={projects} />
    </PageContainer>
  );
}
