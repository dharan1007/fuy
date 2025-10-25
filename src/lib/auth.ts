// src/lib/auth.ts
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { baseUrl } from "@/lib/base-url";
import { sendMail } from "@/lib/mailer";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const secret = process.env.NEXTAUTH_SECRET!;
const enc = new TextEncoder();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret,
  pages: {
    signIn: "/join",
  },
  providers: [
    EmailProvider({
  from: process.env.EMAIL_FROM,
  async sendVerificationRequest({ identifier, url, expires }) {
    const host = new URL(baseUrl()).host;
    const subject = `Sign in to ${host}`;
    const text = `Hi!

Click the link below to sign in:

${url}

This link expires at ${expires.toLocaleString()}.

If you didn’t request this, you can ignore this email.`;
    await sendMail({ to: identifier, subject, text });
  },
}),

    // Email/Password credentials
    Credentials({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: creds.email.toLowerCase() },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(creds.password, user.password);
        if (!isValid) return null;

        return user;
      },
    }),
    // Passkey credentials
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: {
        loginToken: { label: "loginToken", type: "text" },
      },
      async authorize(creds) {
        const loginToken = creds?.loginToken as string | undefined;
        if (!loginToken) return null;

        try {
          const { payload } = await jwtVerify(loginToken, enc.encode(secret), {
            issuer: "fuy",
            audience: "fuy",
          });
          const uid = payload?.uid as string | undefined;
          if (!uid) return null;

          const user = await prisma.user.findUnique({ where: { id: uid } });
          return user ?? null;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        if (user.name) token.name = user.name;
        if (user.email) token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Ensure profile exists
      try {
        await prisma.profile.create({
          data: { userId: user.id, displayName: user.name ?? null },
        });
      } catch { /* ignore if exists */ }
    },
  },
};
