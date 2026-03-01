import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { isRateLimited } from "@/lib/rate-limit";
import { hasRequiredRole } from "@/lib/rbac";
import { loginSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

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
          return null;
        }

        const username = parsed.data.username.toLowerCase();
        const password = parsed.data.password;
        const ip = req.headers?.["x-forwarded-for"] ?? "unknown";
        const key = `${username}:${ip}`;

        if (isRateLimited(key)) {
          throw new Error("Zu viele Login-Versuche. Bitte warte kurz.");
        }

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.active) {
          return null;
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.displayName,
          username: user.username,
          role: user.role,
          active: user.active,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.username = token.username as string;
        session.user.active = Boolean(token.active);
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
