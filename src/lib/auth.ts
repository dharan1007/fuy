import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST!,
        port: Number(process.env.EMAIL_SERVER_PORT || 1025),
        auth: { user: "", pass: "" }
      },
      from: process.env.EMAIL_FROM
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;
      // ensure user exists (adapter will usually do this)
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: { email: user.email }
      });
      return true;
    },
    async session({ session }) {
      if (session?.user?.email) {
        const u = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (u) (session as any).userId = u.id;
      }
      return session;
    }
  },
  pages: {
    signIn: "/api/auth/signin"
  }
};
