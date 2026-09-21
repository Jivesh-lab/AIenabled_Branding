import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Role → workspace base path mapping
// ---------------------------------------------------------------------------
const ROLE_WORKSPACE: Record<string, string> = {
  student: "/workspace/student/dashboard",
  faculty: "/workspace/faculty/dashboard",
  mentor: "/workspace/mentor/dashboard",
  industry: "/workspace/industry-partner/dashboard",
  investor: "/workspace/investor/dashboard",
  startup: "/workspace/startup/dashboard",
  "super_admin": "/workspace/super-admin/dashboard",
};

// URL segment → role value mapping
const WORKSPACE_ROLE_SEGMENT: Record<string, string> = {
  student: "student",
  faculty: "faculty",
  mentor: "mentor",
  "industry-partner": "industry",
  investor: "investor",
  startup: "startup",
  "super-admin": "super_admin",
};

// ---------------------------------------------------------------------------
// Proxy function (Next.js 16 — replaces "middleware" export)
// ---------------------------------------------------------------------------
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev_only",
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

    // Super Admin has universal access to inspect any workspace segment
    if (userRole === "super_admin") {
      return NextResponse.next();
    }

    // Extract workspace segment: /workspace/[segment]/...
    const segments = pathname.split("/"); // ['', 'workspace', 'student', ...]
    const workspaceSegment = segments[2];

    const allowedRole = WORKSPACE_ROLE_SEGMENT[workspaceSegment];

    if (allowedRole && userRole !== allowedRole) {
      const ownWorkspace = ROLE_WORKSPACE[userRole];
      if (ownWorkspace) {
        return NextResponse.redirect(new URL(ownWorkspace, req.url));
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  // --- Guard: auth pages → redirect if already logged in --------------------
  if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    const userRole = token.role as string;
    const workspace = ROLE_WORKSPACE[userRole];
    if (workspace) {
      return NextResponse.redirect(new URL(workspace, req.url));
    }
  }

  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Matcher — only run on workspace and auth routes
// ---------------------------------------------------------------------------
export const config = {
  matcher: ["/workspace/:path*", "/login", "/signup"],
};
