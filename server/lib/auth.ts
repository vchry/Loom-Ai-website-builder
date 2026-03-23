import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") || [];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  trustedOrigins,
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  advanced: {
    crossSubdomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      secure: true,
      httpOnly: true,
      sameSite: "none",
      partitioned: true,
    },
    cookies: {
      session_token: {
        name: "auth_session",
        attributes: {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          partitioned: true,
          path: "/",
        },
      },
    },
  },
});
