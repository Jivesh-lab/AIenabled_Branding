import { DefaultSession, DefaultJWT } from "next-auth";

type UserRole = "student" | "faculty" | "mentor" | "investor" | "admin" | "super_admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      facultyRole?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    facultyRole?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    facultyRole?: string | null;
  }
}
