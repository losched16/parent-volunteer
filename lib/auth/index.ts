// lib/auth/index.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findParentByEmail, updateParentLogin } from "@/lib/db/parents";
import { findAdminByEmail } from "@/lib/db/schools";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "parent-login",
      name: "Parent Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const parent = await findParentByEmail(credentials.email);
        if (!parent) return null;

        const isValid = await bcrypt.compare(credentials.password, parent.password_hash);
        if (!isValid) return null;

        await updateParentLogin(parent.id);

        return {
          id: parent.id,
          email: parent.email,
          name: `${parent.first_name} ${parent.last_name}`,
          role: "parent" as const,
          school_id: parent.school_id,
        };
      },
    }),
    CredentialsProvider({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const school = await findAdminByEmail(credentials.email);
        if (!school) return null;

        const isValid = await bcrypt.compare(credentials.password, school.admin_password_hash);
        if (!isValid) return null;

        return {
          id: school.id,
          email: school.admin_email,
          name: school.name,
          role: "admin" as const,
          school_id: school.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.school_id = user.school_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.school_id = token.school_id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Middleware helpers
export function requireAuth(session: any) {
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export function requireAdmin(session: any) {
  const user = requireAuth(session);
  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}

export function requireParent(session: any) {
  const user = requireAuth(session);
  if (user.role !== "parent") {
    throw new Error("Forbidden");
  }
  return user;
}
