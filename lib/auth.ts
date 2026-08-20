import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getCurrentOrganization } from "./tenant";
import {
  getClientIp,
  isLoginBurstLimited,
  isLoginLocked,
  noteLoginAttemptStart,
  noteLoginFailure,
  clearLoginFailures,
  LOGIN_LOCK_MESSAGE,
  LOGIN_BURST_MESSAGE,
} from "./loginSecurity";

// NextAuth configuration for tenant-aware, role-based authentication.
// A username is only unique within a single tenant, so every login must
// know which tenant (Organization) to check against. We prefer an
// explicit tenantSlug submitted from the login form, and fall back to
// whatever tenant context middleware resolved from the host/cookie for
// backward compatibility.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "Business subdomain", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Brute-force / abuse protection, checked before touching the DB
        // for user lookups. See lib/loginSecurity.ts.
        const ip = getClientIp(req);
        if (await isLoginBurstLimited(ip)) {
          throw new Error(LOGIN_BURST_MESSAGE);
        }
        await noteLoginAttemptStart(ip);
        if (await isLoginLocked(ip)) {
          throw new Error(LOGIN_LOCK_MESSAGE);
        }

        let organization = null as Awaited<ReturnType<typeof getCurrentOrganization>>;

        if (credentials.tenantSlug) {
          const bySlug = await prisma.organization.findUnique({
            where: { slug: credentials.tenantSlug.trim().toLowerCase() },
          });
          organization = bySlug && bySlug.status !== "suspended" ? bySlug : null;
        } else {
          organization = await getCurrentOrganization();
        }

        let user;
        if (organization) {
          user = await prisma.user.findUnique({
            where: {
              organizationId_username: {
                organizationId: organization.id,
                username: credentials.username,
              },
            },
          });
        } else {
          // No tenant identified for this login attempt (root/platform
          // domain, no slug submitted). Only the platform_admin account
          // may authenticate this way.
          user = await prisma.user.findFirst({
            where: {
              username: credentials.username,
              role: "platform_admin",
            },
          });
        }

        if (!user) {
          await noteLoginFailure(ip);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          await noteLoginFailure(ip);
          return null;
        }

        await clearLoginFailures(ip);

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.id = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};
