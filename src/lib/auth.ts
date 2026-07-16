import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
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
            allowDangerousEmailAccountLinking: true,
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
            email: credentials.email,
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
    async session({ session, token }) {
      if (token) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).isPremium = token.isPremium as boolean;
        (session.user as any).subscriptionExpiry = token.subscriptionExpiry as string | null;
        (session.user as any).planId = token.planId as string | null;
        (session.user as any).workspaceId = token.workspaceId as string | null;
        (session.user as any).workspaceStatus = token.workspaceStatus as string | null;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      
      // Fetch latest user status on every JWT refresh
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              isPremium: true,
              subscriptionExpiry: true,
              planId: true,
              workspaceId: true,
              ownedWorkspace: { select: { id: true, status: true } },
            }
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.isPremium = dbUser.isPremium;
            token.subscriptionExpiry = dbUser.subscriptionExpiry?.toISOString() || null;
            token.planId = dbUser.planId;
            
            // Workspace info for teachers
            if (dbUser.ownedWorkspace) {
              token.workspaceId = dbUser.ownedWorkspace.id;
              token.workspaceStatus = dbUser.ownedWorkspace.status;
            } else {
              token.workspaceId = dbUser.workspaceId;
              token.workspaceStatus = null;
            }
            
            // Auto-revoke if expired
            if (dbUser.isPremium && dbUser.subscriptionExpiry && new Date() > dbUser.subscriptionExpiry) {
              await prisma.user.update({
                where: { id: token.id as string },
                data: { isPremium: false }
              });
              token.isPremium = false;
            }
          }
        } catch (e) {
          console.error("Error fetching latest user status in JWT:", e);
        }
      }
      return token;
    },
  },
};
