import { DefaultSession, DefaultJWT } from "next-auth";

type UserRole = "student" | "faculty" | "mentor" | "industry" | "investor" | "startup" | "admin" | "super_admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
  }
}
