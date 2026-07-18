import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeEmail } from "@/lib/account-action-tokens";

type AppToken = JWT & {
  id?: string;
  role?: string;
  isPremium?: boolean;
  subscriptionExpiry?: string | null;
  planId?: string | null;
  workspaceId?: string | null;
  workspaceStatus?: string | null;
  picture?: string | null;
};

type AppSessionUser = {
  id?: string;
  role?: string;
  isPremium?: boolean;
  subscriptionExpiry?: string | null;
  planId?: string | null;
  workspaceId?: string | null;
  workspaceStatus?: string | null;
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: normalizeEmail(credentials.email),
          },
        });

        if (!user || !user.password) {
          throw new Error("User not found or no password set");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (!user.email || verified !== true) return false;

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
      return true;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const appToken = token as AppToken;
        const sessionUser = session.user as typeof session.user & AppSessionUser;
        sessionUser.id = appToken.id || appToken.sub;
        sessionUser.role = appToken.role || "STUDENT";
        sessionUser.isPremium = appToken.isPremium;
        sessionUser.subscriptionExpiry = appToken.subscriptionExpiry;
        sessionUser.planId = appToken.planId;
        sessionUser.workspaceId = appToken.workspaceId;
        sessionUser.workspaceStatus = appToken.workspaceStatus;
        sessionUser.image = appToken.picture || undefined;
      }
      return session;
    },
    async jwt({ token, user }) {
      const appToken = token as AppToken;
      if (user) {
        appToken.id = user.id;
        appToken.role = (user as { role?: string }).role;
      }
      
      // Fallback to sub if id is missing (e.g., standard NextAuth behavior)
      if (!appToken.id && appToken.sub) {
        appToken.id = appToken.sub;
      }
      
      // Fetch latest user status on every JWT refresh
      if (appToken.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: appToken.id },
            select: {
              role: true,
              isPremium: true,
              subscriptionExpiry: true,
              planId: true,
              workspaceId: true,
              image: true,
              ownedWorkspace: { select: { id: true, status: true } },
            }
          });
          if (dbUser) {
            appToken.role = dbUser.role;
            appToken.isPremium = dbUser.isPremium;
            appToken.subscriptionExpiry = dbUser.subscriptionExpiry?.toISOString() || null;
            appToken.planId = dbUser.planId;
            appToken.picture = dbUser.image;
            
            // Workspace info for teachers
            if (dbUser.ownedWorkspace) {
              appToken.workspaceId = dbUser.ownedWorkspace.id;
              appToken.workspaceStatus = dbUser.ownedWorkspace.status;
            } else {
              appToken.workspaceId = dbUser.workspaceId;
              appToken.workspaceStatus = null;
            }
            
            // Auto-revoke if expired
            if (dbUser.isPremium && dbUser.subscriptionExpiry && new Date() > dbUser.subscriptionExpiry) {
              await prisma.user.update({
                where: { id: appToken.id },
                data: { isPremium: false }
              });
              appToken.isPremium = false;
            }
          }
        } catch (e) {
          console.error("Error fetching latest user status in JWT:", e);
        }
      }
      return appToken;
    },
  },
};
