import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSecret } from "@/lib/authSecret";

// ---------------------------------------------------------------------------
// Role → workspace base path mapping
// ---------------------------------------------------------------------------
const ROLE_WORKSPACE: Record<string, string> = {
  student: "/workspace/student/dashboard",
  faculty: "/workspace/faculty/dashboard",
  mentor: "/workspace/mentor/dashboard",
  investor: "/workspace/investor/dashboard",
  admin: "/workspace/admin/dashboard",
  "super_admin": "/workspace/super-admin/dashboard",
};

// URL segment → role value mapping
const WORKSPACE_ROLE_SEGMENT: Record<string, string> = {
  student: "student",
  faculty: "faculty",
  mentor: "mentor",
  investor: "investor",
  admin: "admin",
  "super-admin": "super_admin",
};

// ---------------------------------------------------------------------------
// Proxy function (Next.js 16 — replaces "middleware" export)
// ---------------------------------------------------------------------------
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: getAuthSecret(),
  });

  const isLoggedIn = !!token;

  // --- Guard: /workspace/* routes -------------------------------------------
  if (pathname.startsWith("/workspace/")) {
    if (!isLoggedIn) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = token.role as string;

    // Extract workspace segment: /workspace/[segment]/...
    const segments = pathname.split("/"); // ['', 'workspace', 'student', ...]
    const workspaceSegment = segments[2];

    const allowedRole = WORKSPACE_ROLE_SEGMENT[workspaceSegment];

    // super_admin has full system-wide access to inspect any workspace
    // admin can inspect other operational workspaces (student, faculty, mentor, investor)
    const canAccess =
      userRole === "super_admin" ||
      userRole === allowedRole ||
      (userRole === "admin" && allowedRole !== "super_admin");

    if (allowedRole && !canAccess) {
      const ownWorkspace = ROLE_WORKSPACE[userRole];
      if (ownWorkspace) {
        return NextResponse.redirect(new URL(ownWorkspace, req.url));
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  // --- Public auth pages: /login and /signup are freely accessible at all times
  // so users can register, sign in, switch accounts, or onboard new roles without being bounced.
  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Matcher — only run on workspace and auth routes
// ---------------------------------------------------------------------------
export const config = {
  matcher: ["/workspace/:path*", "/login", "/signup"],
};
