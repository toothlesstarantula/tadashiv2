import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "sqlite", "mysql", etc.
  }),
  plugins: [
    bearer(),
  ],
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:8100",
    "http://localhost:3000",
    "http://localhost:5174",
    "capacitor://localhost",
    "http://localhost",
    "http://localhost:4000",
    "http://10.0.2.2:3000",
    "http://192.168.100.22:3000",
    process.env.CLIENT_URL || ""
  ].filter(Boolean),
});
