import Link from "next/link";
import { Users } from "lucide-react";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { fetchBackend } from "@/lib/backendProxy";
import { STUDENT_READ_ROLES } from "@/lib/apiPolicy";
import LoadError from "../_components/LoadError";

interface TeamProject {
  projectId: string;
  projectTitle: string;
  role: "LEAD" | "MEMBER";
  acceptedAt: string | null;
  membershipId: string;
}

export default async function TeamPage() {
  const result = await fetchBackend<TeamProject[]>({ path: "/api/team/projects", roles: STUDENT_READ_ROLES, tag: "Team Page" }, []);

  if (!result.ok) {
    return (
      <PageContainer>
        <LoadError title="We couldn't load your teams" message={result.message} />
      </PageContainer>
    );
  }

  const projects = result.data;
  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-ink">My Teams</h1>
          <p className="text-sm text-muted-ink">Projects you belong to. Open an invitation email to join more.</p>
        </div>
        {projects.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-ink">
            <Users className="mx-auto mb-2 size-6 text-brand" />
            You haven&apos;t joined any project yet. When a founder invites you, use the link in the email to accept.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <Card key={p.membershipId} className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-[15px] font-bold text-ink">{p.projectTitle || "Untitled project"}</h2>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">{p.role === "LEAD" ? "Team Lead" : "Member"}</span>
                </div>
                {p.acceptedAt && <p className="text-[11px] text-muted-ink">Joined {new Date(p.acceptedAt).toLocaleDateString("en-IN")}</p>}
                <Link href={`/workspace/student/projects/${encodeURIComponent(p.projectId)}`} className="inline-block text-xs font-semibold text-brand hover:underline">
                  Open project →
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
