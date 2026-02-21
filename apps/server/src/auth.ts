import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "sqlite", "mysql", etc.
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Add other providers here (e.g., github, google)
});
