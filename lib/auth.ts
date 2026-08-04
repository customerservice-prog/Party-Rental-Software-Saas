import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getCurrentOrganization } from "./tenant";

// NextAuth configuration for tenant-aware, role-based authentication.
// Every login is scoped to the Organization resolved for the current
// request host (subdomain / custom domain) - a username that exists for
// one tenant will not work on another tenant's storefront.
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
                  },
                  async authorize(credentials) {
                            if (!credentials?.username || !credentials?.password) {
                                        return null;
                            }

                    const organization = await getCurrentOrganization();

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
                    // No tenant resolved for this request (root/platform domain).
                    // Only the platform_admin account may authenticate here.
                    user = await prisma.user.findFirst({
                      where: {
                        username: credentials.username,
                        role: "platform_admin",
                      },
                    });
                  }

                    if (!user) {
                                return null;
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.password);
                            if (!isValid) {
                                        return null;
                            }

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
                  }
                  return token;
          },
          async session({ session, token }) {
                  if (session.user) {
                            (session.user as any).role = token.role;
                            (session.user as any).organizationId = token.organizationId;
                  }
                  return session;
          },
    },
};
