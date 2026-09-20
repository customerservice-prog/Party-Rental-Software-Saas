import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getCurrentOrganization } from "./tenant";
import { decryptTotpSecret, verifyTotp } from "./totp";
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
        loginScope: { label: "Login scope", type: "text" },
        mfaCode: { label: "Authenticator code", type: "text" },
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

        const loginScope = credentials.loginScope === "platform" ? "platform" : "tenant";
        let organization = null as Awaited<ReturnType<typeof getCurrentOrganization>>;
        let user;

        if (loginScope === "platform") {
          // Platform login must NEVER inherit a remembered tenant/session.
          // This keeps /platform-login independent even if the same browser
          // is currently signed into a rental-company tenant account.
          user = await prisma.user.findFirst({
            where: {
              username: credentials.username,
              role: "platform_admin",
            },
          });
        } else {
          if (credentials.tenantSlug) {
            const bySlug = await prisma.organization.findUnique({
              where: { slug: credentials.tenantSlug.trim().toLowerCase() },
            });
            organization = bySlug && bySlug.status !== "suspended" ? bySlug : null;
          } else {
            organization = await getCurrentOrganization();
          }

          if (!organization) {
            await noteLoginFailure(ip);
            return null;
          }

          user = await prisma.user.findUnique({
            where: {
              organizationId_username: {
                organizationId: organization.id,
                username: credentials.username,
              },
            },
          });

          // A platform admin may never authenticate through the tenant login.
          if (user?.role === "platform_admin") {
            await noteLoginFailure(ip);
            return null;
          }
        }

        if (!user || user.isActive === false) {
          await noteLoginFailure(ip);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          await noteLoginFailure(ip);
          return null;
        }

        if (user.role === "platform_admin" && user.mfaEnabled) {
          if (!user.mfaSecret) {
            await noteLoginFailure(ip);
            return null;
          }
          let validMfa = false;
          try {
            validMfa = verifyTotp(decryptTotpSecret(user.mfaSecret), credentials.mfaCode || "");
          } catch {
            validMfa = false;
          }
          if (!validMfa) {
            await noteLoginFailure(ip);
            return null;
          }
        }

        await clearLoginFailures(ip);
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => null);

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
