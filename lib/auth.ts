import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { isRateLimited } from "@/lib/rate-limit";
import { hasRequiredRole } from "@/lib/rbac";
import { loginSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error("LOGIN_FAILED");
        }

        const username = parsed.data.username.trim().toLowerCase();
        const password = parsed.data.password;
        const ip = req.headers?.["x-forwarded-for"] ?? "unknown";
        const key = `${username}:${ip}`;

        if (isRateLimited(key)) {
          throw new Error("RATE_LIMITED");
        }

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          throw new Error("INVALID_USERNAME");
        }

        if (!user.active) {
          throw new Error("ACCOUNT_INACTIVE");
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          throw new Error("INVALID_PASSWORD");
        }

        const forcePasswordChange = user.lastLoginAt === null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await createAuditLog({
          actorId: user.id,
          actorRole: user.role,
          action: "LOGIN_SUCCESS",
          targetType: "User",
          targetId: user.id,
          message: `Login erfolgreich für ${user.username}.`,
        });

        return {
          id: user.id,
          name: user.displayName,
          username: user.username,
          role: user.role,
          active: user.active,
          forcePasswordChange,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.active = user.active;
        token.forcePasswordChange = Boolean(user.forcePasswordChange);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.username = token.username as string;
        session.user.active = Boolean(token.active);
        session.user.forcePasswordChange = Boolean(token.forcePasswordChange);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user || !session.user.active) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireAuth();
  if (!hasRequiredRole(session.user.role, roles)) {
    redirect("/forbidden");
  }
  return session;
}
