import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { STUDENT_READ_ROLES, authorize, initialsOf } from "@/lib/apiPolicy";
import StudentShell from "./_components/StudentShell";

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  admin: "Admin (viewing)",
  super_admin: "Super Admin (viewing)",
};

/**
 * Server-side guard + identity for every /workspace/student/* page. The edge proxy already redirects
 * other roles; this re-checks on the server so the pages never render for the wrong person, and
 * passes the verified session user down instead of a hardcoded placeholder.
 */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (authorize(session?.user, STUDENT_READ_ROLES)) redirect("/login");

  const user = session!.user!;
  const name = user.name?.trim() || user.email?.split("@")[0] || "Student";

  return (
    <StudentShell user={{ name, role: ROLE_LABEL[user.role ?? ""] ?? "Student", initials: initialsOf(name) || "ST" }}>
      {children}
    </StudentShell>
  );
}
