import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { registerApiRoute } from '@mastra/core/server';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as runtime from '@prisma/client/runtime/client';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

"use strict";
const config = {
  "previewFeatures": [
    "postgresqlExtensions"
  ],
  "clientVersion": "7.4.1",
  "engineVersion": "55ae170b1ced7fc6ed07a15f110549408c501bb3",
  "activeProvider": "postgresql",
  "inlineSchema": '// This is your Prisma schema file,\n// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\ngenerator client {\n  provider        = "prisma-client"\n  output          = "../generated/prisma"\n  previewFeatures = ["postgresqlExtensions"]\n}\n\ndatasource db {\n  provider   = "postgresql"\n  extensions = [vector]\n}\n\n// Better Auth Models\nmodel User {\n  id            String    @id @default(cuid())\n  name          String?\n  email         String    @unique\n  emailVerified Boolean   @default(false)\n  image         String?\n  createdAt     DateTime  @default(now())\n  updatedAt     DateTime  @updatedAt\n  sessions      Session[]\n  accounts      Account[]\n\n  @@map("user")\n}\n\nmodel Session {\n  id        String   @id @default(cuid())\n  expiresAt DateTime\n  token     String   @unique\n  ipAddress String?\n  userAgent String?\n  userId    String\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@map("session")\n}\n\nmodel Account {\n  id                    String    @id @default(cuid())\n  accountId             String\n  providerId            String\n  userId                String\n  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n  accessToken           String?\n  refreshToken          String?\n  idToken               String?\n  accessTokenExpiresAt  DateTime?\n  refreshTokenExpiresAt DateTime?\n  scope                 String?\n  password              String?\n  createdAt             DateTime  @default(now())\n  updatedAt             DateTime  @updatedAt\n\n  @@map("account")\n}\n\nmodel Verification {\n  id         String   @id @default(cuid())\n  identifier String\n  value      String\n  expiresAt  DateTime\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  @@map("verification")\n}\n\n// Domain Models\n\nmodel Transaction {\n  id          String   @id @default(cuid())\n  type        String // "expense" | "income"\n  amount      Float\n  currency    String   @default("USD")\n  category    String\n  description String?\n  occurredAt  DateTime @default(now())\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n  userId      String?\n\n  @@map("transactions")\n}\n\nmodel Meal {\n  id         String   @id @default(cuid())\n  name       String\n  calories   Int?\n  proteins   Float?\n  carbs      Float?\n  fats       Float?\n  consumedAt DateTime @default(now())\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n  userId     String?\n\n  @@map("meals")\n}\n\nmodel Workout {\n  id              String   @id @default(cuid())\n  type            String\n  durationMinutes Int?\n  distanceKm      Float?\n  calories        Int?\n  notes           String?\n  occurredAt      DateTime @default(now())\n  createdAt       DateTime @default(now())\n  updatedAt       DateTime @updatedAt\n  userId          String?\n\n  @@map("workouts")\n}\n\n// Research Models (Vector Store)\n\nmodel ResearchDocument {\n  id        String          @id @default(cuid())\n  url       String\n  title     String?\n  createdAt DateTime        @default(now())\n  chunks    ResearchChunk[]\n\n  @@map("research_documents")\n}\n\nmodel ResearchChunk {\n  id         String                 @id @default(cuid())\n  content    String\n  embedding  Unsupported("vector")?\n  documentId String\n  document   ResearchDocument       @relation(fields: [documentId], references: [id], onDelete: Cascade)\n\n  @@map("research_chunks")\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "parameterizationSchema": {
    "strings": [],
    "graph": ""
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"emailVerified","kind":"scalar","type":"Boolean"},{"name":"image","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"sessions","kind":"object","type":"Session","relationName":"SessionToUser"},{"name":"accounts","kind":"object","type":"Account","relationName":"AccountToUser"}],"dbName":"user"},"Session":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"token","kind":"scalar","type":"String"},{"name":"ipAddress","kind":"scalar","type":"String"},{"name":"userAgent","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"SessionToUser"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"session"},"Account":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"accountId","kind":"scalar","type":"String"},{"name":"providerId","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"AccountToUser"},{"name":"accessToken","kind":"scalar","type":"String"},{"name":"refreshToken","kind":"scalar","type":"String"},{"name":"idToken","kind":"scalar","type":"String"},{"name":"accessTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"refreshTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"scope","kind":"scalar","type":"String"},{"name":"password","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"account"},"Verification":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"identifier","kind":"scalar","type":"String"},{"name":"value","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"verification"},"Transaction":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"type","kind":"scalar","type":"String"},{"name":"amount","kind":"scalar","type":"Float"},{"name":"currency","kind":"scalar","type":"String"},{"name":"category","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"occurredAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"userId","kind":"scalar","type":"String"}],"dbName":"transactions"},"Meal":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"calories","kind":"scalar","type":"Int"},{"name":"proteins","kind":"scalar","type":"Float"},{"name":"carbs","kind":"scalar","type":"Float"},{"name":"fats","kind":"scalar","type":"Float"},{"name":"consumedAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"userId","kind":"scalar","type":"String"}],"dbName":"meals"},"Workout":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"type","kind":"scalar","type":"String"},{"name":"durationMinutes","kind":"scalar","type":"Int"},{"name":"distanceKm","kind":"scalar","type":"Float"},{"name":"calories","kind":"scalar","type":"Int"},{"name":"notes","kind":"scalar","type":"String"},{"name":"occurredAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"userId","kind":"scalar","type":"String"}],"dbName":"workouts"},"ResearchDocument":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"url","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"chunks","kind":"object","type":"ResearchChunk","relationName":"ResearchChunkToResearchDocument"}],"dbName":"research_documents"},"ResearchChunk":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"content","kind":"scalar","type":"String"},{"name":"documentId","kind":"scalar","type":"String"},{"name":"document","kind":"object","type":"ResearchDocument","relationName":"ResearchChunkToResearchDocument"}],"dbName":"research_chunks"}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","orderBy","cursor","user","sessions","accounts","_count","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_min","_max","User.groupBy","User.aggregate","Session.findUnique","Session.findUniqueOrThrow","Session.findFirst","Session.findFirstOrThrow","Session.findMany","Session.createOne","Session.createMany","Session.createManyAndReturn","Session.updateOne","Session.updateMany","Session.updateManyAndReturn","Session.upsertOne","Session.deleteOne","Session.deleteMany","Session.groupBy","Session.aggregate","Account.findUnique","Account.findUniqueOrThrow","Account.findFirst","Account.findFirstOrThrow","Account.findMany","Account.createOne","Account.createMany","Account.createManyAndReturn","Account.updateOne","Account.updateMany","Account.updateManyAndReturn","Account.upsertOne","Account.deleteOne","Account.deleteMany","Account.groupBy","Account.aggregate","Verification.findUnique","Verification.findUniqueOrThrow","Verification.findFirst","Verification.findFirstOrThrow","Verification.findMany","Verification.createOne","Verification.createMany","Verification.createManyAndReturn","Verification.updateOne","Verification.updateMany","Verification.updateManyAndReturn","Verification.upsertOne","Verification.deleteOne","Verification.deleteMany","Verification.groupBy","Verification.aggregate","Transaction.findUnique","Transaction.findUniqueOrThrow","Transaction.findFirst","Transaction.findFirstOrThrow","Transaction.findMany","Transaction.createOne","Transaction.createMany","Transaction.createManyAndReturn","Transaction.updateOne","Transaction.updateMany","Transaction.updateManyAndReturn","Transaction.upsertOne","Transaction.deleteOne","Transaction.deleteMany","_avg","_sum","Transaction.groupBy","Transaction.aggregate","Meal.findUnique","Meal.findUniqueOrThrow","Meal.findFirst","Meal.findFirstOrThrow","Meal.findMany","Meal.createOne","Meal.createMany","Meal.createManyAndReturn","Meal.updateOne","Meal.updateMany","Meal.updateManyAndReturn","Meal.upsertOne","Meal.deleteOne","Meal.deleteMany","Meal.groupBy","Meal.aggregate","Workout.findUnique","Workout.findUniqueOrThrow","Workout.findFirst","Workout.findFirstOrThrow","Workout.findMany","Workout.createOne","Workout.createMany","Workout.createManyAndReturn","Workout.updateOne","Workout.updateMany","Workout.updateManyAndReturn","Workout.upsertOne","Workout.deleteOne","Workout.deleteMany","Workout.groupBy","Workout.aggregate","document","chunks","ResearchDocument.findUnique","ResearchDocument.findUniqueOrThrow","ResearchDocument.findFirst","ResearchDocument.findFirstOrThrow","ResearchDocument.findMany","ResearchDocument.createOne","ResearchDocument.createMany","ResearchDocument.createManyAndReturn","ResearchDocument.updateOne","ResearchDocument.updateMany","ResearchDocument.updateManyAndReturn","ResearchDocument.upsertOne","ResearchDocument.deleteOne","ResearchDocument.deleteMany","ResearchDocument.groupBy","ResearchDocument.aggregate","ResearchChunk.findUnique","ResearchChunk.findUniqueOrThrow","ResearchChunk.findFirst","ResearchChunk.findFirstOrThrow","ResearchChunk.findMany","ResearchChunk.createOne","ResearchChunk.createMany","ResearchChunk.createManyAndReturn","ResearchChunk.updateOne","ResearchChunk.updateMany","ResearchChunk.updateManyAndReturn","ResearchChunk.upsertOne","ResearchChunk.deleteOne","ResearchChunk.deleteMany","ResearchChunk.groupBy","ResearchChunk.aggregate","AND","OR","NOT","id","content","documentId","equals","in","notIn","lt","lte","gt","gte","contains","startsWith","endsWith","not","url","title","createdAt","every","some","none","type","durationMinutes","distanceKm","calories","notes","occurredAt","updatedAt","userId","name","proteins","carbs","fats","consumedAt","amount","currency","category","description","identifier","value","expiresAt","accountId","providerId","accessToken","refreshToken","idToken","accessTokenExpiresAt","refreshTokenExpiresAt","scope","password","token","ipAddress","userAgent","email","emailVerified","image","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","increment","decrement","multiply","divide"]'),
  graph: "kANRkAEMBAAAmgIAIAUAAJsCACChAQAAmAIAMKIBAAAOABCjAQAAmAIAMKQBAQAAAAG0AUAA-AEAIb4BQAD4AQAhwAEBAPcBACHYAQEAAAAB2QEgAJkCACHaAQEA9wEAIQEAAAABACAMAwAAngIAIKEBAACfAgAwogEAAAMAEKMBAACfAgAwpAEBAPYBACG0AUAA-AEAIb4BQAD4AQAhvwEBAPYBACHLAUAA-AEAIdUBAQD2AQAh1gEBAPcBACHXAQEA9wEAIQMDAAD-AgAg1gEAAKYCACDXAQAApgIAIAwDAACeAgAgoQEAAJ8CADCiAQAAAwAQowEAAJ8CADCkAQEAAAABtAFAAPgBACG-AUAA-AEAIb8BAQD2AQAhywFAAPgBACHVAQEAAAAB1gEBAPcBACHXAQEA9wEAIQMAAAADACABAAAEADACAAAFACARAwAAngIAIKEBAACcAgAwogEAAAcAEKMBAACcAgAwpAEBAPYBACG0AUAA-AEAIb4BQAD4AQAhvwEBAPYBACHMAQEA9gEAIc0BAQD2AQAhzgEBAPcBACHPAQEA9wEAIdABAQD3AQAh0QFAAJ0CACHSAUAAnQIAIdMBAQD3AQAh1AEBAPcBACEIAwAA_gIAIM4BAACmAgAgzwEAAKYCACDQAQAApgIAINEBAACmAgAg0gEAAKYCACDTAQAApgIAINQBAACmAgAgEQMAAJ4CACChAQAAnAIAMKIBAAAHABCjAQAAnAIAMKQBAQAAAAG0AUAA-AEAIb4BQAD4AQAhvwEBAPYBACHMAQEA9gEAIc0BAQD2AQAhzgEBAPcBACHPAQEA9wEAIdABAQD3AQAh0QFAAJ0CACHSAUAAnQIAIdMBAQD3AQAh1AEBAPcBACEDAAAABwAgAQAACAAwAgAACQAgAQAAAAMAIAEAAAAHACABAAAAAQAgDAQAAJoCACAFAACbAgAgoQEAAJgCADCiAQAADgAQowEAAJgCADCkAQEA9gEAIbQBQAD4AQAhvgFAAPgBACHAAQEA9wEAIdgBAQD2AQAh2QEgAJkCACHaAQEA9wEAIQQEAAD8AgAgBQAA_QIAIMABAACmAgAg2gEAAKYCACADAAAADgAgAQAADwAwAgAAAQAgAwAAAA4AIAEAAA8AMAIAAAEAIAMAAAAOACABAAAPADACAAABACAJBAAA-gIAIAUAAPsCACCkAQEAAAABtAFAAAAAAb4BQAAAAAHAAQEAAAAB2AEBAAAAAdkBIAAAAAHaAQEAAAABAQwAABMAIAekAQEAAAABtAFAAAAAAb4BQAAAAAHAAQEAAAAB2AEBAAAAAdkBIAAAAAHaAQEAAAABAQwAABUAMAEMAAAVADAJBAAA4AIAIAUAAOECACCkAQEAowIAIbQBQACrAgAhvgFAAKsCACHAAQEAqgIAIdgBAQCjAgAh2QEgAN8CACHaAQEAqgIAIQIAAAABACAMAAAYACAHpAEBAKMCACG0AUAAqwIAIb4BQACrAgAhwAEBAKoCACHYAQEAowIAIdkBIADfAgAh2gEBAKoCACECAAAADgAgDAAAGgAgAgAAAA4AIAwAABoAIAMAAAABACATAAATACAUAAAYACABAAAAAQAgAQAAAA4AIAUGAADcAgAgGQAA3gIAIBoAAN0CACDAAQAApgIAINoBAACmAgAgCqEBAACUAgAwogEAACEAEKMBAACUAgAwpAEBAOkBACG0AUAA7wEAIb4BQADvAQAhwAEBAO4BACHYAQEA6QEAIdkBIACVAgAh2gEBAO4BACEDAAAADgAgAQAAIAAwGAAAIQAgAwAAAA4AIAEAAA8AMAIAAAEAIAEAAAAFACABAAAABQAgAwAAAAMAIAEAAAQAMAIAAAUAIAMAAAADACABAAAEADACAAAFACADAAAAAwAgAQAABAAwAgAABQAgCQMAANsCACCkAQEAAAABtAFAAAAAAb4BQAAAAAG_AQEAAAABywFAAAAAAdUBAQAAAAHWAQEAAAAB1wEBAAAAAQEMAAApACAIpAEBAAAAAbQBQAAAAAG-AUAAAAABvwEBAAAAAcsBQAAAAAHVAQEAAAAB1gEBAAAAAdcBAQAAAAEBDAAAKwAwAQwAACsAMAkDAADaAgAgpAEBAKMCACG0AUAAqwIAIb4BQACrAgAhvwEBAKMCACHLAUAAqwIAIdUBAQCjAgAh1gEBAKoCACHXAQEAqgIAIQIAAAAFACAMAAAuACAIpAEBAKMCACG0AUAAqwIAIb4BQACrAgAhvwEBAKMCACHLAUAAqwIAIdUBAQCjAgAh1gEBAKoCACHXAQEAqgIAIQIAAAADACAMAAAwACACAAAAAwAgDAAAMAAgAwAAAAUAIBMAACkAIBQAAC4AIAEAAAAFACABAAAAAwAgBQYAANcCACAZAADZAgAgGgAA2AIAINYBAACmAgAg1wEAAKYCACALoQEAAJMCADCiAQAANwAQowEAAJMCADCkAQEA6QEAIbQBQADvAQAhvgFAAO8BACG_AQEA6QEAIcsBQADvAQAh1QEBAOkBACHWAQEA7gEAIdcBAQDuAQAhAwAAAAMAIAEAADYAMBgAADcAIAMAAAADACABAAAEADACAAAFACABAAAACQAgAQAAAAkAIAMAAAAHACABAAAIADACAAAJACADAAAABwAgAQAACAAwAgAACQAgAwAAAAcAIAEAAAgAMAIAAAkAIA4DAADWAgAgpAEBAAAAAbQBQAAAAAG-AUAAAAABvwEBAAAAAcwBAQAAAAHNAQEAAAABzgEBAAAAAc8BAQAAAAHQAQEAAAAB0QFAAAAAAdIBQAAAAAHTAQEAAAAB1AEBAAAAAQEMAAA_ACANpAEBAAAAAbQBQAAAAAG-AUAAAAABvwEBAAAAAcwBAQAAAAHNAQEAAAABzgEBAAAAAc8BAQAAAAHQAQEAAAAB0QFAAAAAAdIBQAAAAAHTAQEAAAAB1AEBAAAAAQEMAABBADABDAAAQQAwDgMAANUCACCkAQEAowIAIbQBQACrAgAhvgFAAKsCACG_AQEAowIAIcwBAQCjAgAhzQEBAKMCACHOAQEAqgIAIc8BAQCqAgAh0AEBAKoCACHRAUAA1AIAIdIBQADUAgAh0wEBAKoCACHUAQEAqgIAIQIAAAAJACAMAABEACANpAEBAKMCACG0AUAAqwIAIb4BQACrAgAhvwEBAKMCACHMAQEAowIAIc0BAQCjAgAhzgEBAKoCACHPAQEAqgIAIdABAQCqAgAh0QFAANQCACHSAUAA1AIAIdMBAQCqAgAh1AEBAKoCACECAAAABwAgDAAARgAgAgAAAAcAIAwAAEYAIAMAAAAJACATAAA_ACAUAABEACABAAAACQAgAQAAAAcAIAoGAADRAgAgGQAA0wIAIBoAANICACDOAQAApgIAIM8BAACmAgAg0AEAAKYCACDRAQAApgIAINIBAACmAgAg0wEAAKYCACDUAQAApgIAIBChAQAAjwIAMKIBAABNABCjAQAAjwIAMKQBAQDpAQAhtAFAAO8BACG-AUAA7wEAIb8BAQDpAQAhzAEBAOkBACHNAQEA6QEAIc4BAQDuAQAhzwEBAO4BACHQAQEA7gEAIdEBQACQAgAh0gFAAJACACHTAQEA7gEAIdQBAQDuAQAhAwAAAAcAIAEAAEwAMBgAAE0AIAMAAAAHACABAAAIADACAAAJACAJoQEAAI4CADCiAQAAUwAQowEAAI4CADCkAQEAAAABtAFAAPgBACG-AUAA-AEAIckBAQD2AQAhygEBAPYBACHLAUAA-AEAIQEAAABQACABAAAAUAAgCaEBAACOAgAwogEAAFMAEKMBAACOAgAwpAEBAPYBACG0AUAA-AEAIb4BQAD4AQAhyQEBAPYBACHKAQEA9gEAIcsBQAD4AQAhAAMAAABTACABAABUADACAABQACADAAAAUwAgAQAAVAAwAgAAUAAgAwAAAFMAIAEAAFQAMAIAAFAAIAakAQEAAAABtAFAAAAAAb4BQAAAAAHJAQEAAAABygEBAAAAAcsBQAAAAAEBDAAAWAAgBqQBAQAAAAG0AUAAAAABvgFAAAAAAckBAQAAAAHKAQEAAAABywFAAAAAAQEMAABaADABDAAAWgAwBqQBAQCjAgAhtAFAAKsCACG-AUAAqwIAIckBAQCjAgAhygEBAKMCACHLAUAAqwIAIQIAAABQACAMAABdACAGpAEBAKMCACG0AUAAqwIAIb4BQACrAgAhyQEBAKMCACHKAQEAowIAIcsBQACrAgAhAgAAAFMAIAwAAF8AIAIAAABTACAMAABfACADAAAAUAAgEwAAWAAgFAAAXQAgAQAAAFAAIAEAAABTACADBgAAzgIAIBkAANACACAaAADPAgAgCaEBAACNAgAwogEAAGYAEKMBAACNAgAwpAEBAOkBACG0AUAA7wEAIb4BQADvAQAhyQEBAOkBACHKAQEA6QEAIcsBQADvAQAhAwAAAFMAIAEAAGUAMBgAAGYAIAMAAABTACABAABUADACAABQACANoQEAAIsCADCiAQAAbAAQowEAAIsCADCkAQEAAAABtAFAAPgBACG4AQEA9gEAIb0BQAD4AQAhvgFAAPgBACG_AQEA9wEAIcUBCACMAgAhxgEBAPYBACHHAQEA9gEAIcgBAQD3AQAhAQAAAGkAIAEAAABpACANoQEAAIsCADCiAQAAbAAQowEAAIsCADCkAQEA9gEAIbQBQAD4AQAhuAEBAPYBACG9AUAA-AEAIb4BQAD4AQAhvwEBAPcBACHFAQgAjAIAIcYBAQD2AQAhxwEBAPYBACHIAQEA9wEAIQK_AQAApgIAIMgBAACmAgAgAwAAAGwAIAEAAG0AMAIAAGkAIAMAAABsACABAABtADACAABpACADAAAAbAAgAQAAbQAwAgAAaQAgCqQBAQAAAAG0AUAAAAABuAEBAAAAAb0BQAAAAAG-AUAAAAABvwEBAAAAAcUBCAAAAAHGAQEAAAABxwEBAAAAAcgBAQAAAAEBDAAAcQAgCqQBAQAAAAG0AUAAAAABuAEBAAAAAb0BQAAAAAG-AUAAAAABvwEBAAAAAcUBCAAAAAHGAQEAAAABxwEBAAAAAcgBAQAAAAEBDAAAcwAwAQwAAHMAMAqkAQEAowIAIbQBQACrAgAhuAEBAKMCACG9AUAAqwIAIb4BQACrAgAhvwEBAKoCACHFAQgAzQIAIcYBAQCjAgAhxwEBAKMCACHIAQEAqgIAIQIAAABpACAMAAB2ACAKpAEBAKMCACG0AUAAqwIAIbgBAQCjAgAhvQFAAKsCACG-AUAAqwIAIb8BAQCqAgAhxQEIAM0CACHGAQEAowIAIccBAQCjAgAhyAEBAKoCACECAAAAbAAgDAAAeAAgAgAAAGwAIAwAAHgAIAMAAABpACATAABxACAUAAB2ACABAAAAaQAgAQAAAGwAIAcGAADIAgAgGQAAywIAIBoAAMoCACBbAADJAgAgXAAAzAIAIL8BAACmAgAgyAEAAKYCACANoQEAAIcCADCiAQAAfwAQowEAAIcCADCkAQEA6QEAIbQBQADvAQAhuAEBAOkBACG9AUAA7wEAIb4BQADvAQAhvwEBAO4BACHFAQgAiAIAIcYBAQDpAQAhxwEBAOkBACHIAQEA7gEAIQMAAABsACABAAB-ADAYAAB_ACADAAAAbAAgAQAAbQAwAgAAaQAgDaEBAACGAgAwogEAAIUBABCjAQAAhgIAMKQBAQAAAAG0AUAA-AEAIbsBAgCDAgAhvgFAAPgBACG_AQEA9wEAIcABAQD2AQAhwQEIAIQCACHCAQgAhAIAIcMBCACEAgAhxAFAAPgBACEBAAAAggEAIAEAAACCAQAgDaEBAACGAgAwogEAAIUBABCjAQAAhgIAMKQBAQD2AQAhtAFAAPgBACG7AQIAgwIAIb4BQAD4AQAhvwEBAPcBACHAAQEA9gEAIcEBCACEAgAhwgEIAIQCACHDAQgAhAIAIcQBQAD4AQAhBbsBAACmAgAgvwEAAKYCACDBAQAApgIAIMIBAACmAgAgwwEAAKYCACADAAAAhQEAIAEAAIYBADACAACCAQAgAwAAAIUBACABAACGAQAwAgAAggEAIAMAAACFAQAgAQAAhgEAMAIAAIIBACAKpAEBAAAAAbQBQAAAAAG7AQIAAAABvgFAAAAAAb8BAQAAAAHAAQEAAAABwQEIAAAAAcIBCAAAAAHDAQgAAAABxAFAAAAAAQEMAACKAQAgCqQBAQAAAAG0AUAAAAABuwECAAAAAb4BQAAAAAG_AQEAAAABwAEBAAAAAcEBCAAAAAHCAQgAAAABwwEIAAAAAcQBQAAAAAEBDAAAjAEAMAEMAACMAQAwCqQBAQCjAgAhtAFAAKsCACG7AQIAwQIAIb4BQACrAgAhvwEBAKoCACHAAQEAowIAIcEBCADCAgAhwgEIAMICACHDAQgAwgIAIcQBQACrAgAhAgAAAIIBACAMAACPAQAgCqQBAQCjAgAhtAFAAKsCACG7AQIAwQIAIb4BQACrAgAhvwEBAKoCACHAAQEAowIAIcEBCADCAgAhwgEIAMICACHDAQgAwgIAIcQBQACrAgAhAgAAAIUBACAMAACRAQAgAgAAAIUBACAMAACRAQAgAwAAAIIBACATAACKAQAgFAAAjwEAIAEAAACCAQAgAQAAAIUBACAKBgAAwwIAIBkAAMYCACAaAADFAgAgWwAAxAIAIFwAAMcCACC7AQAApgIAIL8BAACmAgAgwQEAAKYCACDCAQAApgIAIMMBAACmAgAgDaEBAACFAgAwogEAAJgBABCjAQAAhQIAMKQBAQDpAQAhtAFAAO8BACG7AQIA_QEAIb4BQADvAQAhvwEBAO4BACHAAQEA6QEAIcEBCAD-AQAhwgEIAP4BACHDAQgA_gEAIcQBQADvAQAhAwAAAIUBACABAACXAQAwGAAAmAEAIAMAAACFAQAgAQAAhgEAMAIAAIIBACANoQEAAIICADCiAQAAngEAEKMBAACCAgAwpAEBAAAAAbQBQAD4AQAhuAEBAPYBACG5AQIAgwIAIboBCACEAgAhuwECAIMCACG8AQEA9wEAIb0BQAD4AQAhvgFAAPgBACG_AQEA9wEAIQEAAACbAQAgAQAAAJsBACANoQEAAIICADCiAQAAngEAEKMBAACCAgAwpAEBAPYBACG0AUAA-AEAIbgBAQD2AQAhuQECAIMCACG6AQgAhAIAIbsBAgCDAgAhvAEBAPcBACG9AUAA-AEAIb4BQAD4AQAhvwEBAPcBACEFuQEAAKYCACC6AQAApgIAILsBAACmAgAgvAEAAKYCACC_AQAApgIAIAMAAACeAQAgAQAAnwEAMAIAAJsBACADAAAAngEAIAEAAJ8BADACAACbAQAgAwAAAJ4BACABAACfAQAwAgAAmwEAIAqkAQEAAAABtAFAAAAAAbgBAQAAAAG5AQIAAAABugEIAAAAAbsBAgAAAAG8AQEAAAABvQFAAAAAAb4BQAAAAAG_AQEAAAABAQwAAKMBACAKpAEBAAAAAbQBQAAAAAG4AQEAAAABuQECAAAAAboBCAAAAAG7AQIAAAABvAEBAAAAAb0BQAAAAAG-AUAAAAABvwEBAAAAAQEMAAClAQAwAQwAAKUBADAKpAEBAKMCACG0AUAAqwIAIbgBAQCjAgAhuQECAMECACG6AQgAwgIAIbsBAgDBAgAhvAEBAKoCACG9AUAAqwIAIb4BQACrAgAhvwEBAKoCACECAAAAmwEAIAwAAKgBACAKpAEBAKMCACG0AUAAqwIAIbgBAQCjAgAhuQECAMECACG6AQgAwgIAIbsBAgDBAgAhvAEBAKoCACG9AUAAqwIAIb4BQACrAgAhvwEBAKoCACECAAAAngEAIAwAAKoBACACAAAAngEAIAwAAKoBACADAAAAmwEAIBMAAKMBACAUAACoAQAgAQAAAJsBACABAAAAngEAIAoGAAC8AgAgGQAAvwIAIBoAAL4CACBbAAC9AgAgXAAAwAIAILkBAACmAgAgugEAAKYCACC7AQAApgIAILwBAACmAgAgvwEAAKYCACANoQEAAPwBADCiAQAAsQEAEKMBAAD8AQAwpAEBAOkBACG0AUAA7wEAIbgBAQDpAQAhuQECAP0BACG6AQgA_gEAIbsBAgD9AQAhvAEBAO4BACG9AUAA7wEAIb4BQADvAQAhvwEBAO4BACEDAAAAngEAIAEAALABADAYAACxAQAgAwAAAJ4BACABAACfAQAwAgAAmwEAIAiAAQAA-QEAIKEBAAD1AQAwogEAALwBABCjAQAA9QEAMKQBAQAAAAGyAQEA9gEAIbMBAQD3AQAhtAFAAPgBACEBAAAAtAEAIAd_AAD7AQAgoQEAAPoBADCiAQAAtgEAEKMBAAD6AQAwpAEBAPYBACGlAQEA9gEAIaYBAQD2AQAhAX8AALsCACAHfwAA-wEAIKEBAAD6AQAwogEAALYBABCjAQAA-gEAMKQBAQAAAAGlAQEA9gEAIaYBAQD2AQAhAwAAALYBACABAAC3AQAwAgAAuAEAIAEAAAC2AQAgAQAAALQBACAIgAEAAPkBACChAQAA9QEAMKIBAAC8AQAQowEAAPUBADCkAQEA9gEAIbIBAQD2AQAhswEBAPcBACG0AUAA-AEAIQKAAQAAugIAILMBAACmAgAgAwAAALwBACABAAC9AQAwAgAAtAEAIAMAAAC8AQAgAQAAvQEAMAIAALQBACADAAAAvAEAIAEAAL0BADACAAC0AQAgBYABAAC5AgAgpAEBAAAAAbIBAQAAAAGzAQEAAAABtAFAAAAAAQEMAADBAQAgBKQBAQAAAAGyAQEAAAABswEBAAAAAbQBQAAAAAEBDAAAwwEAMAEMAADDAQAwBYABAACsAgAgpAEBAKMCACGyAQEAowIAIbMBAQCqAgAhtAFAAKsCACECAAAAtAEAIAwAAMYBACAEpAEBAKMCACGyAQEAowIAIbMBAQCqAgAhtAFAAKsCACECAAAAvAEAIAwAAMgBACACAAAAvAEAIAwAAMgBACADAAAAtAEAIBMAAMEBACAUAADGAQAgAQAAALQBACABAAAAvAEAIAQGAACnAgAgGQAAqQIAIBoAAKgCACCzAQAApgIAIAehAQAA7QEAMKIBAADPAQAQowEAAO0BADCkAQEA6QEAIbIBAQDpAQAhswEBAO4BACG0AUAA7wEAIQMAAAC8AQAgAQAAzgEAMBgAAM8BACADAAAAvAEAIAEAAL0BADACAAC0AQAgAQAAALgBACABAAAAuAEAIAMAAAC2AQAgAQAAtwEAMAIAALgBACADAAAAtgEAIAEAALcBADACAAC4AQAgAwAAALYBACABAAC3AQAwAgAAuAEAIAR_AAClAgAgpAEBAAAAAaUBAQAAAAGmAQEAAAABAQwAANcBACADpAEBAAAAAaUBAQAAAAGmAQEAAAABAQwAANkBADABDAAA2QEAMAR_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_AAD7AQAgoQEAAPoBADCiAQAAtgEAEKMBAAD6AQAwpAEBAPYBACGlAQEA9gEAIaYBAQD2AQAhCoABAAD5AQAgoQEAAPUBADCiAQAAvAEAEKMBAAD1AQAwpAEBAPYBACGyAQEA9gEAIbMBAQD3AQAhtAFAAPgBACHbAQAAvAEAINwBAAC8AQAgDaEBAAD8AQAwogEAALEBABCjAQAA_AEAMKQBAQDpAQAhtAFAAO8BACG4AQEA6QEAIbkBAgD9AQAhugEIAP4BACG7AQIA_QEAIbwBAQDuAQAhvQFAAO8BACG-AUAA7wEAIb8BAQDuAQAhDQYAAPMBACAZAADzAQAgGgAA8wEAIFsAAIACACBcAADzAQAgpwECAAAAAagBAgAAAAWpAQIAAAAFqgECAAAAAasBAgAAAAGsAQIAAAABrQECAAAAAbEBAgCBAgAhDQYAAPMBACAZAACAAgAgGgAAgAIAIFsAAIACACBcAACAAgAgpwEIAAAAAagBCAAAAAWpAQgAAAAFqgEIAAAAAasBCAAAAAGsAQgAAAABrQEIAAAAAbEBCAD_AQAhDQYAAPMBACAZAACAAgAgGgAAgAIAIFsAAIACACBcAACAAgAgpwEIAAAAAagBCAAAAAWpAQgAAAAFqgEIAAAAAasBCAAAAAGsAQgAAAABrQEIAAAAAbEBCAD_AQAhCKcBCAAAAAGoAQgAAAAFqQEIAAAABaoBCAAAAAGrAQgAAAABrAEIAAAAAa0BCAAAAAGxAQgAgAIAIQ0GAADzAQAgGQAA8wEAIBoAAPMBACBbAACAAgAgXAAA8wEAIKcBAgAAAAGoAQIAAAAFqQECAAAABaoBAgAAAAGrAQIAAAABrAECAAAAAa0BAgAAAAGxAQIAgQIAIQ2hAQAAggIAMKIBAACeAQAQowEAAIICADCkAQEA9gEAIbQBQAD4AQAhuAEBAPYBACG5AQIAgwIAIboBCACEAgAhuwECAIMCACG8AQEA9wEAIb0BQAD4AQAhvgFAAPgBACG_AQEA9wEAIQinAQIAAAABqAECAAAABakBAgAAAAWqAQIAAAABqwECAAAAAawBAgAAAAGtAQIAAAABsQECAPMBACEIpwEIAAAAAagBCAAAAAWpAQgAAAAFqgEIAAAAAasBCAAAAAGsAQgAAAABrQEIAAAAAbEBCACAAgAhDaEBAACFAgAwogEAAJgBABCjAQAAhQIAMKQBAQDpAQAhtAFAAO8BACG7AQIA_QEAIb4BQADvAQAhvwEBAO4BACHAAQEA6QEAIcEBCAD-AQAhwgEIAP4BACHDAQgA_gEAIcQBQADvAQAhDaEBAACGAgAwogEAAIUBABCjAQAAhgIAMKQBAQD2AQAhtAFAAPgBACG7AQIAgwIAIb4BQAD4AQAhvwEBAPcBACHAAQEA9gEAIcEBCACEAgAhwgEIAIQCACHDAQgAhAIAIcQBQAD4AQAhDaEBAACHAgAwogEAAH8AEKMBAACHAgAwpAEBAOkBACG0AUAA7wEAIbgBAQDpAQAhvQFAAO8BACG-AUAA7wEAIb8BAQDuAQAhxQEIAIgCACHGAQEA6QEAIccBAQDpAQAhyAEBAO4BACENBgAA6wEAIBkAAIoCACAaAACKAgAgWwAAigIAIFwAAIoCACCnAQgAAAABqAEIAAAABKkBCAAAAASqAQgAAAABqwEIAAAAAawBCAAAAAGtAQgAAAABsQEIAIkCACENBgAA6wEAIBkAAIoCACAaAACKAgAgWwAAigIAIFwAAIoCACCnAQgAAAABqAEIAAAABKkBCAAAAASqAQgAAAABqwEIAAAAAawBCAAAAAGtAQgAAAABsQEIAIkCACEIpwEIAAAAAagBCAAAAASpAQgAAAAEqgEIAAAAAasBCAAAAAGsAQgAAAABrQEIAAAAAbEBCACKAgAhDaEBAACLAgAwogEAAGwAEKMBAACLAgAwpAEBAPYBACG0AUAA-AEAIbgBAQD2AQAhvQFAAPgBACG-AUAA-AEAIb8BAQD3AQAhxQEIAIwCACHGAQEA9gEAIccBAQD2AQAhyAEBAPcBACEIpwEIAAAAAagBCAAAAASpAQgAAAAEqgEIAAAAAasBCAAAAAGsAQgAAAABrQEIAAAAAbEBCACKAgAhCaEBAACNAgAwogEAAGYAEKMBAACNAgAwpAEBAOkBACG0AUAA7wEAIb4BQADvAQAhyQEBAOkBACHKAQEA6QEAIcsBQADvAQAhCaEBAACOAgAwogEAAFMAEKMBAACOAgAwpAEBAPYBACG0AUAA-AEAIb4BQAD4AQAhyQEBAPYBACHKAQEA9gEAIcsBQAD4AQAhEKEBAACPAgAwogEAAE0AEKMBAACPAgAwpAEBAOkBACG0AUAA7wEAIb4BQADvAQAhvwEBAOkBACHMAQEA6QEAIc0BAQDpAQAhzgEBAO4BACHPAQEA7gEAIdABAQDuAQAh0QFAAJACACHSAUAAkAIAIdMBAQDuAQAh1AEBAO4BACELBgAA8wEAIBkAAJICACAaAACSAgAgpwFAAAAAAagBQAAAAAWpAUAAAAAFqgFAAAAAAasBQAAAAAGsAUAAAAABrQFAAAAAAbEBQACRAgAhCwYAAPMBACAZAACSAgAgGgAAkgIAIKcBQAAAAAGoAUAAAAAFqQFAAAAABaoBQAAAAAGrAUAAAAABrAFAAAAAAa0BQAAAAAGxAUAAkQIAIQinAUAAAAABqAFAAAAABakBQAAAAAWqAUAAAAABqwFAAAAAAawBQAAAAAGtAUAAAAABsQFAAJICACELoQEAAJMCADCiAQAANwAQowEAAJMCADCkAQEA6QEAIbQBQADvAQAhvgFAAO8BACG_AQEA6QEAIcsBQADvAQAh1QEBAOkBACHWAQEA7gEAIdcBAQDuAQAhCqEBAACUAgAwogEAACEAEKMBAACUAgAwpAEBAOkBACG0AUAA7wEAIb4BQADvAQAhwAEBAO4BACHYAQEA6QEAIdkBIACVAgAh2gEBAO4BACEFBgAA6wEAIBkAAJcCACAaAACXAgAgpwEgAAAAAbEBIACWAgAhBQYAAOsBACAZAACXAgAgGgAAlwIAIKcBIAAAAAGxASAAlgIAIQKnASAAAAABsQEgAJcCACEMBAAAmgIAIAUAAJsCACChAQAAmAIAMKIBAAAOABCjAQAAmAIAMKQBAQD2AQAhtAFAAPgBACG-AUAA-AEAIcABAQD3AQAh2AEBAPYBACHZASAAmQIAIdoBAQD3AQAhAqcBIAAAAAGxASAAlwIAIQO1AQAAAwAgtgEAAAMAILcBAAADACADtQEAAAcAILYBAAAHACC3AQAABwAgEQMAAJ4CACChAQAAnAIAMKIBAAAHABCjAQAAnAIAMKQBAQD2AQAhtAFAAPgBACG-AUAA-AEAIb8BAQD2AQAhzAEBAPYBACHNAQEA9gEAIc4BAQD3AQAhzwEBAPcBACHQAQEA9wEAIdEBQACdAgAh0gFAAJ0CACHTAQEA9wEAIdQBAQD3AQAhCKcBQAAAAAGoAUAAAAAFqQFAAAAABaoBQAAAAAGrAUAAAAABrAFAAAAAAa0BQAAAAAGxAUAAkgIAIQ4EAACaAgAgBQAAmwIAIKEBAACYAgAwogEAAA4AEKMBAACYAgAwpAEBAPYBACG0AUAA-AEAIb4BQAD4AQAhwAEBAPcBACHYAQEA9gEAIdkBIACZAgAh2gEBAPcBACHbAQAADgAg3AEAAA4AIAwDAACeAgAgoQEAAJ8CADCiAQAAAwAQowEAAJ8CADCkAQEA9gEAIbQBQAD4AQAhvgFAAPgBACG_AQEA9gEAIcsBQAD4AQAh1QEBAPYBACHWAQEA9wEAIdcBAQD3AQAhAAAAAeABAQAAAAEFEwAAjAMAIBQAAI8DACDdAQAAjQMAIN4BAACOAwAg4wEAALQBACADEwAAjAMAIN0BAACNAwAg4wEAALQBACAAAAAAAeABAQAAAAEB4AFAAAAAAQsTAACtAgAwFAAAsgIAMN0BAACuAgAw3gEAAK8CADDfAQAAsAIAIOABAACxAgAw4QEAALECADDiAQAAsQIAMOMBAACxAgAw5AEAALMCADDlAQAAtAIAMAKkAQEAAAABpQEBAAAAAQIAAAC4AQAgEwAAuAIAIAMAAAC4AQAgEwAAuAIAIBQAALcCACABDAAAiwMAMAd_AAD7AQAgoQEAAPoBADCiAQAAtgEAEKMBAAD6AQAwpAEBAAAAAaUBAQD2AQAhpgEBAPYBACECAAAAuAEAIAwAALcCACACAAAAtQIAIAwAALYCACAGoQEAALQCADCiAQAAtQIAEKMBAAC0AgAwpAEBAPYBACGlAQEA9gEAIaYBAQD2AQAhBqEBAAC0AgAwogEAALUCABCjAQAAtAIAMKQBAQD2AQAhpQEBAPYBACGmAQEA9gEAIQKkAQEAowIAIaUBAQCjAgAhAqQBAQCjAgAhpQEBAKMCACECpAEBAAAAAaUBAQAAAAEEEwAArQIAMN0BAACuAgAw3wEAALACACDjAQAAsQIAMAACgAEAALoCACCzAQAApgIAIAAAAAAABeABAgAAAAHmAQIAAAAB5wECAAAAAegBAgAAAAHpAQIAAAABBeABCAAAAAHmAQgAAAAB5wEIAAAAAegBCAAAAAHpAQgAAAABAAAAAAAAAAAAAAXgAQgAAAAB5gEIAAAAAecBCAAAAAHoAQgAAAAB6QEIAAAAAQAAAAAAAAHgAUAAAAABBRMAAIYDACAUAACJAwAg3QEAAIcDACDeAQAAiAMAIOMBAAABACADEwAAhgMAIN0BAACHAwAg4wEAAAEAIAAAAAUTAACBAwAgFAAAhAMAIN0BAACCAwAg3gEAAIMDACDjAQAAAQAgAxMAAIEDACDdAQAAggMAIOMBAAABACAAAAAB4AEgAAAAAQsTAADuAgAwFAAA8wIAMN0BAADvAgAw3gEAAPACADDfAQAA8QIAIOABAADyAgAw4QEAAPICADDiAQAA8gIAMOMBAADyAgAw5AEAAPQCADDlAQAA9QIAMAsTAADiAgAwFAAA5wIAMN0BAADjAgAw3gEAAOQCADDfAQAA5QIAIOABAADmAgAw4QEAAOYCADDiAQAA5gIAMOMBAADmAgAw5AEAAOgCADDlAQAA6QIAMAykAQEAAAABtAFAAAAAAb4BQAAAAAHMAQEAAAABzQEBAAAAAc4BAQAAAAHPAQEAAAAB0AEBAAAAAdEBQAAAAAHSAUAAAAAB0wEBAAAAAdQBAQAAAAECAAAACQAgEwAA7QIAIAMAAAAJACATAADtAgAgFAAA7AIAIAEMAACAAwAwEQMAAJ4CACChAQAAnAIAMKIBAAAHABCjAQAAnAIAMKQBAQAAAAG0AUAA-AEAIb4BQAD4AQAhvwEBAPYBACHMAQEA9gEAIc0BAQD2AQAhzgEBAPcBACHPAQEA9wEAIdABAQD3AQAh0QFAAJ0CACHSAUAAnQIAIdMBAQD3AQAh1AEBAPcBACECAAAACQAgDAAA7AIAIAIAAADqAgAgDAAA6wIAIBChAQAA6QIAMKIBAADqAgAQowEAAOkCADCkAQEA9gEAIbQBQAD4AQAhvgFAAPgBACG_AQEA9gEAIcwBAQD2AQAhzQEBAPYBACHOAQEA9wEAIc8BAQD3AQAh0AEBAPcBACHRAUAAnQIAIdIBQACdAgAh0wEBAPcBACHUAQEA9wEAIRChAQAA6QIAMKIBAADqAgAQowEAAOkCADCkAQEA9gEAIbQBQAD4AQAhvgFAAPgBACG_AQEA9gEAIcwBAQD2AQAhzQEBAPYBACHOAQEA9wEAIc8BAQD3AQAh0AEBAPcBACHRAUAAnQIAIdIBQACdAgAh0wEBAPcBACHUAQEA9wEAIQykAQEAowIAIbQBQACrAgAhvgFAAKsCACHMAQEAowIAIc0BAQCjAgAhzgEBAKoCACHPAQEAqgIAIdABAQCqAgAh0QFAANQCACHSAUAA1AIAIdMBAQCqAgAh1AEBAKoCACEMpAEBAKMCACG0AUAAqwIAIb4BQACrAgAhzAEBAKMCACHNAQEAowIAIc4BAQCqAgAhzwEBAKoCACHQAQEAqgIAIdEBQADUAgAh0gFAANQCACHTAQEAqgIAIdQBAQCqAgAhDKQBAQAAAAG0AUAAAAABvgFAAAAAAcwBAQAAAAHNAQEAAAABzgEBAAAAAc8BAQAAAAHQAQEAAAAB0QFAAAAAAdIBQAAAAAHTAQEAAAAB1AEBAAAAAQekAQEAAAABtAFAAAAAAb4BQAAAAAHLAUAAAAAB1QEBAAAAAdYBAQAAAAHXAQEAAAABAgAAAAUAIBMAAPkCACADAAAABQAgEwAA-QIAIBQAAPgCACABDAAA_wIAMAwDAACeAgAgoQEAAJ8CADCiAQAAAwAQowEAAJ8CADCkAQEAAAABtAFAAPgBACG-AUAA-AEAIb8BAQD2AQAhywFAAPgBACHVAQEAAAAB1gEBAPcBACHXAQEA9wEAIQIAAAAFACAMAAD4AgAgAgAAAPYCACAMAAD3AgAgC6EBAAD1AgAwogEAAPYCABCjAQAA9QIAMKQBAQD2AQAhtAFAAPgBACG-AUAA-AEAIb8BAQD2AQAhywFAAPgBACHVAQEA9gEAIdYBAQD3AQAh1wEBAPcBACELoQEAAPUCADCiAQAA9gIAEKMBAAD1AgAwpAEBAPYBACG0AUAA-AEAIb4BQAD4AQAhvwEBAPYBACHLAUAA-AEAIdUBAQD2AQAh1gEBAPcBACHXAQEA9wEAIQekAQEAowIAIbQBQACrAgAhvgFAAKsCACHLAUAAqwIAIdUBAQCjAgAh1gEBAKoCACHXAQEAqgIAIQekAQEAowIAIbQBQACrAgAhvgFAAKsCACHLAUAAqwIAIdUBAQCjAgAh1gEBAKoCACHXAQEAqgIAIQekAQEAAAABtAFAAAAAAb4BQAAAAAHLAUAAAAAB1QEBAAAAAdYBAQAAAAHXAQEAAAABBBMAAO4CADDdAQAA7wIAMN8BAADxAgAg4wEAAPICADAEEwAA4gIAMN0BAADjAgAw3wEAAOUCACDjAQAA5gIAMAAABAQAAPwCACAFAAD9AgAgwAEAAKYCACDaAQAApgIAIAekAQEAAAABtAFAAAAAAb4BQAAAAAHLAUAAAAAB1QEBAAAAAdYBAQAAAAHXAQEAAAABDKQBAQAAAAG0AUAAAAABvgFAAAAAAcwBAQAAAAHNAQEAAAABzgEBAAAAAc8BAQAAAAHQAQEAAAAB0QFAAAAAAdIBQAAAAAHTAQEAAAAB1AEBAAAAAQgFAAD7AgAgpAEBAAAAAbQBQAAAAAG-AUAAAAABwAEBAAAAAdgBAQAAAAHZASAAAAAB2gEBAAAAAQIAAAABACATAACBAwAgAwAAAA4AIBMAAIEDACAUAACFAwAgCgAAAA4AIAUAAOECACAMAACFAwAgpAEBAKMCACG0AUAAqwIAIb4BQACrAgAhwAEBAKoCACHYAQEAowIAIdkBIADfAgAh2gEBAKoCACEIBQAA4QIAIKQBAQCjAgAhtAFAAKsCACG-AUAAqwIAIcABAQCqAgAh2AEBAKMCACHZASAA3wIAIdoBAQCqAgAhCAQAAPoCACCkAQEAAAABtAFAAAAAAb4BQAAAAAHAAQEAAAAB2AEBAAAAAdkBIAAAAAHaAQEAAAABAgAAAAEAIBMAAIYDACADAAAADgAgEwAAhgMAIBQAAIoDACAKAAAADgAgBAAA4AIAIAwAAIoDACCkAQEAowIAIbQBQACrAgAhvgFAAKsCACHAAQEAqgIAIdgBAQCjAgAh2QEgAN8CACHaAQEAqgIAIQgEAADgAgAgpAEBAKMCACG0AUAAqwIAIb4BQACrAgAhwAEBAKoCACHYAQEAowIAIdkBIADfAgAh2gEBAKoCACECpAEBAAAAAaUBAQAAAAEEpAEBAAAAAbIBAQAAAAGzAQEAAAABtAFAAAAAAQIAAAC0AQAgEwAAjAMAIAMAAAC8AQAgEwAAjAMAIBQAAJADACAGAAAAvAEAIAwAAJADACCkAQEAowIAIbIBAQCjAgAhswEBAKoCACG0AUAAqwIAIQSkAQEAowIAIbIBAQCjAgAhswEBAKoCACG0AUAAqwIAIQMEBgIFCgMGAAQBAwABAQMAAQIECwAFDAAAAAADBgAJGQAKGgALAAAAAwYACRkAChoACwEDAAEBAwABAwYAEBkAERoAEgAAAAMGABAZABEaABIBAwABAQMAAQMGABcZABgaABkAAAADBgAXGQAYGgAZAAAAAwYAHxkAIBoAIQAAAAMGAB8ZACAaACEAAAAFBgAnGQAqGgArWwAoXAApAAAAAAAFBgAnGQAqGgArWwAoXAApAAAABQYAMRkANBoANVsAMlwAMwAAAAAABQYAMRkANBoANVsAMlwAMwAAAAUGADsZAD4aAD9bADxcAD0AAAAAAAUGADsZAD4aAD9bADxcAD0CBgBDgAG5AUIBfwBBAYABugEAAAADBgBHGQBIGgBJAAAAAwYARxkASBoASQF_AEEBfwBBAwYAThkATxoAUAAAAAMGAE4ZAE8aAFAHAgEIDQEJEAEKEQELEgENFAEOFgUPFwYQGQERGwUSHAcVHQEWHgEXHwUbIggcIwwdJAIeJQIfJgIgJwIhKAIiKgIjLAUkLQ0lLwImMQUnMg4oMwIpNAIqNQUrOA8sORMtOgMuOwMvPAMwPQMxPgMyQAMzQgU0QxQ1RQM2RwU3SBU4SQM5SgM6SwU7ThY8Txo9URs-Uhs_VRtAVhtBVxtCWRtDWwVEXBxFXhtGYAVHYR1IYhtJYxtKZAVLZx5MaCJNaiNOayNPbiNQbyNRcCNSciNTdAVUdSRVdyNWeQVXeiVYeyNZfCNafQVdgAEmXoEBLF-DAS1ghAEtYYcBLWKIAS1jiQEtZIsBLWWNAQVmjgEuZ5ABLWiSAQVpkwEvapQBLWuVAS1slgEFbZkBMG6aATZvnAE3cJ0BN3GgATdyoQE3c6IBN3SkATd1pgEFdqcBOHepATd4qwEFeawBOXqtATd7rgE3fK8BBX2yATp-swFAgQG1AUGCAbsBQYMBvgFBhAG_AUGFAcABQYYBwgFBhwHEAQWIAcUBRIkBxwFBigHJAQWLAcoBRYwBywFBjQHMAUGOAc0BBY8B0AFGkAHRAUqRAdIBQpIB0wFCkwHUAUKUAdUBQpUB1gFClgHYAUKXAdoBBZgB2wFLmQHdAUKaAd8BBZsB4AFMnAHhAUKdAeIBQp4B4wEFnwHmAU2gAecBUQ"
};
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer } = await import('node:buffer');
  const wasmArray = Buffer.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import('@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs'),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import('@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs');
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

"use strict";
const PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError;
const PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError;
const PrismaClientRustPanicError = runtime.PrismaClientRustPanicError;
const PrismaClientInitializationError = runtime.PrismaClientInitializationError;
const PrismaClientValidationError = runtime.PrismaClientValidationError;
const sql = runtime.sqltag;
const empty = runtime.empty;
const join = runtime.join;
const raw = runtime.raw;
const Sql = runtime.Sql;
const Decimal = runtime.Decimal;
const getExtensionContext = runtime.Extensions.getExtensionContext;
const prismaVersion = {
  client: "7.4.1",
  engine: "55ae170b1ced7fc6ed07a15f110549408c501bb3"
};
const NullTypes = {
  DbNull: runtime.NullTypes.DbNull,
  JsonNull: runtime.NullTypes.JsonNull,
  AnyNull: runtime.NullTypes.AnyNull
};
const DbNull = runtime.DbNull;
const JsonNull = runtime.JsonNull;
const AnyNull = runtime.AnyNull;
const ModelName = {
  User: "User",
  Session: "Session",
  Account: "Account",
  Verification: "Verification",
  Transaction: "Transaction",
  Meal: "Meal",
  Workout: "Workout",
  ResearchDocument: "ResearchDocument",
  ResearchChunk: "ResearchChunk"
};
const TransactionIsolationLevel = runtime.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
const UserScalarFieldEnum = {
  id: "id",
  name: "name",
  email: "email",
  emailVerified: "emailVerified",
  image: "image",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
const SessionScalarFieldEnum = {
  id: "id",
  expiresAt: "expiresAt",
  token: "token",
  ipAddress: "ipAddress",
  userAgent: "userAgent",
  userId: "userId",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
const AccountScalarFieldEnum = {
  id: "id",
  accountId: "accountId",
  providerId: "providerId",
  userId: "userId",
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  idToken: "idToken",
  accessTokenExpiresAt: "accessTokenExpiresAt",
  refreshTokenExpiresAt: "refreshTokenExpiresAt",
  scope: "scope",
  password: "password",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
const VerificationScalarFieldEnum = {
  id: "id",
  identifier: "identifier",
  value: "value",
  expiresAt: "expiresAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
const TransactionScalarFieldEnum = {
  id: "id",
  type: "type",
  amount: "amount",
  currency: "currency",
  category: "category",
  description: "description",
  occurredAt: "occurredAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  userId: "userId"
};
const MealScalarFieldEnum = {
  id: "id",
  name: "name",
  calories: "calories",
  proteins: "proteins",
  carbs: "carbs",
  fats: "fats",
  consumedAt: "consumedAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  userId: "userId"
};
const WorkoutScalarFieldEnum = {
  id: "id",
  type: "type",
  durationMinutes: "durationMinutes",
  distanceKm: "distanceKm",
  calories: "calories",
  notes: "notes",
  occurredAt: "occurredAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  userId: "userId"
};
const ResearchDocumentScalarFieldEnum = {
  id: "id",
  url: "url",
  title: "title",
  createdAt: "createdAt"
};
const ResearchChunkScalarFieldEnum = {
  id: "id",
  content: "content",
  documentId: "documentId"
};
const SortOrder = {
  asc: "asc",
  desc: "desc"
};
const QueryMode = {
  default: "default",
  insensitive: "insensitive"
};
const NullsOrder = {
  first: "first",
  last: "last"
};
const defineExtension = runtime.Extensions.defineExtension;

var prismaNamespace = /*#__PURE__*/Object.freeze({
  __proto__: null,
  AccountScalarFieldEnum: AccountScalarFieldEnum,
  AnyNull: AnyNull,
  DbNull: DbNull,
  Decimal: Decimal,
  JsonNull: JsonNull,
  MealScalarFieldEnum: MealScalarFieldEnum,
  ModelName: ModelName,
  NullTypes: NullTypes,
  NullsOrder: NullsOrder,
  PrismaClientInitializationError: PrismaClientInitializationError,
  PrismaClientKnownRequestError: PrismaClientKnownRequestError,
  PrismaClientRustPanicError: PrismaClientRustPanicError,
  PrismaClientUnknownRequestError: PrismaClientUnknownRequestError,
  PrismaClientValidationError: PrismaClientValidationError,
  QueryMode: QueryMode,
  ResearchChunkScalarFieldEnum: ResearchChunkScalarFieldEnum,
  ResearchDocumentScalarFieldEnum: ResearchDocumentScalarFieldEnum,
  SessionScalarFieldEnum: SessionScalarFieldEnum,
  SortOrder: SortOrder,
  Sql: Sql,
  TransactionIsolationLevel: TransactionIsolationLevel,
  TransactionScalarFieldEnum: TransactionScalarFieldEnum,
  UserScalarFieldEnum: UserScalarFieldEnum,
  VerificationScalarFieldEnum: VerificationScalarFieldEnum,
  WorkoutScalarFieldEnum: WorkoutScalarFieldEnum,
  defineExtension: defineExtension,
  empty: empty,
  getExtensionContext: getExtensionContext,
  join: join,
  prismaVersion: prismaVersion,
  raw: raw,
  sql: sql
});

"use strict";

var enums = /*#__PURE__*/Object.freeze({
  __proto__: null
});

"use strict";
globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
const PrismaClient = getPrismaClientClass();

"use strict";
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

"use strict";
const createTransaction = createTool({
  id: "create-transaction",
  description: "Registrar una nueva transacci\xF3n financiera (gasto o ingreso)",
  inputSchema: z.object({
    type: z.enum(["expense", "income"]),
    amount: z.number(),
    category: z.string(),
    description: z.string().optional()
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transactionId: z.string()
  }),
  execute: async (context) => {
    console.log("Creating transaction:", context);
    try {
      const transaction = await prisma.transaction.create({
        data: {
          type: context.type,
          amount: context.amount,
          category: context.category,
          description: context.description,
          currency: "MXN"
          // Default currency
        }
      });
      return { success: true, transactionId: transaction.id };
    } catch (error) {
      console.error("Error creating transaction:", error);
      return { success: false, transactionId: "" };
    }
  }
});
const getBalance = createTool({
  id: "get-balance",
  description: "Obtener el saldo actual de la cuenta",
  inputSchema: z.object({}),
  outputSchema: z.object({
    balance: z.number(),
    currency: z.string()
  }),
  execute: async () => {
    try {
      const income = await prisma.transaction.aggregate({
        _sum: {
          amount: true
        },
        where: {
          type: "income"
        }
      });
      const expense = await prisma.transaction.aggregate({
        _sum: {
          amount: true
        },
        where: {
          type: "expense"
        }
      });
      const totalIncome = income._sum.amount || 0;
      const totalExpense = expense._sum.amount || 0;
      const balance = totalIncome - totalExpense;
      return { balance, currency: "MXN" };
    } catch (error) {
      console.error("Error calculating balance:", error);
      return { balance: 0, currency: "MXN" };
    }
  }
});
const getExpenseSummary = createTool({
  id: "get-expense-summary",
  description: "Obtener un resumen de gastos para mostrar en una tabla",
  inputSchema: z.object({
    limit: z.number().optional().default(10)
  }),
  outputSchema: z.object({
    transactions: z.array(z.object({
      date: z.string(),
      category: z.string(),
      amount: z.number(),
      description: z.string().optional()
    }))
  }),
  execute: async ({ limit }) => {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { type: "expense" },
        orderBy: { occurredAt: "desc" },
        take: limit
      });
      return {
        transactions: transactions.map((t) => ({
          date: t.occurredAt.toISOString().split("T")[0],
          category: t.category,
          amount: t.amount,
          description: t.description || ""
        }))
      };
    } catch (error) {
      console.error("Error fetching expense summary:", error);
      return { transactions: [] };
    }
  }
});
const financeAgent = new Agent({
  id: "finance-agent",
  name: "Finance Agent",
  instructions: "Eres un asesor financiero. Ayuda al usuario a rastrear gastos y gestionar su presupuesto.",
  model: openai("gpt-5-mini-2025-08-07"),
  tools: { createTransaction, getBalance, getExpenseSummary }
});

"use strict";
const logMeal = createTool({
  id: "log-meal",
  description: "Registrar una comida y sus macronutrientes",
  inputSchema: z.object({
    name: z.string(),
    calories: z.number().optional(),
    proteins: z.number().optional(),
    carbs: z.number().optional(),
    fats: z.number().optional()
  }),
  outputSchema: z.object({
    success: z.boolean(),
    mealId: z.string()
  }),
  execute: async (context) => {
    console.log("Logging meal:", context);
    try {
      const meal = await prisma.meal.create({
        data: {
          name: context.name,
          calories: context.calories,
          proteins: context.proteins,
          carbs: context.carbs,
          fats: context.fats
        }
      });
      return { success: true, mealId: meal.id };
    } catch (error) {
      console.error("Error logging meal:", error);
      return { success: false, mealId: "" };
    }
  }
});
const nutritionAgent = new Agent({
  id: "nutrition-agent",
  name: "Nutrition Agent",
  instructions: "Eres un nutricionista. Ayuda al usuario a registrar sus comidas y macronutrientes.",
  model: openai("gpt-5-mini-2025-08-07"),
  tools: { logMeal }
});

"use strict";
const logWorkout = createTool({
  id: "log-workout",
  description: "Registrar una sesi\xF3n de entrenamiento",
  inputSchema: z.object({
    type: z.string(),
    durationMinutes: z.number(),
    caloriesBurned: z.number().optional()
  }),
  outputSchema: z.object({
    success: z.boolean(),
    workoutId: z.string()
  }),
  execute: async (context) => {
    console.log("Logging workout:", context);
    try {
      const workout = await prisma.workout.create({
        data: {
          type: context.type,
          durationMinutes: context.durationMinutes,
          calories: context.caloriesBurned ? Math.round(context.caloriesBurned) : null
        }
      });
      return { success: true, workoutId: workout.id };
    } catch (error) {
      console.error("Error logging workout:", error);
      return { success: false, workoutId: "" };
    }
  }
});
const fitnessAgent = new Agent({
  id: "fitness-agent",
  name: "Fitness Agent",
  instructions: "Eres un entrenador de fitness. Ayuda al usuario a registrar sus entrenamientos y mantenerse activo.",
  model: openai("gpt-5-mini-2025-08-07"),
  tools: { logWorkout }
});

"use strict";
const searchTool = createTool({
  id: "search-tool",
  description: "Buscar informaci\xF3n general cuando otros agentes no pueden manejar la solicitud",
  inputSchema: z.object({
    query: z.string().describe("La consulta de b\xFAsqueda")
  }),
  outputSchema: z.object({
    results: z.string()
  }),
  execute: async (context) => {
    const { query } = context;
    return { results: `Resultados simulados para: ${query}` };
  }
});
const orchestratorAgent = new Agent({
  id: "tadashi-orchestrator",
  name: "Tadashi Orchestrator",
  instructions: `
    Eres Tadashi, un asistente personal altamente eficiente y conciso.
    Tu objetivo es ayudar al usuario a gestionar su vida (Finanzas, Nutrici\xF3n, Fitness) con la m\xEDnima fricci\xF3n.

    REGLAS PRINCIPALES:
    1. S\xC9 BREVE: Omite las cortes\xEDas. Ve directo al grano.
    2. ACT\xDAA R\xC1PIDO: Si el usuario proporciona suficiente informaci\xF3n, EJECUTA la herramienta inmediatamente. No pidas confirmaci\xF3n.
    3. HAZ SUPOSICIONES:
       - Si falta la categor\xEDa para un gasto, usa "General" o infi\xE9rela de la descripci\xF3n (ej. "Comida" para restaurantes).
       - Si falta la moneda, asume la moneda local del usuario (MXN).
       - Si no se menciona divisi\xF3n de gastos, asume que el usuario pag\xF3 el monto total.
    4. SIN JERGA T\xC9CNICA: Nunca menciones JSON, SQL, bases de datos o esquemas. Habla con naturalidad.
    5. AMIGABLE CON EL USUARIO: Si necesitas informaci\xF3n, haz UNA sola pregunta simple a la vez.

    CAPACIDADES:
    - Finanzas: Registrar gastos/ingresos, consultar saldo, ver resumen de gastos (tabla).
    - Nutrici\xF3n: Registrar comidas/macronutrientes.
    - Fitness: Registrar entrenamientos.

    Ejemplo de interacci\xF3n:
    Usuario: "Gast\xE9 500 en tacos"
    T\xFA: (Llama a la herramienta createTransaction con amount=500, category="Comida", description="tacos")
    Luego responde: "Registr\xE9 500 para tacos."
  `,
  model: openai("gpt-5-mini-2025-08-07"),
  tools: {
    searchTool,
    createTransaction,
    getBalance,
    getExpenseSummary,
    logMeal,
    logWorkout
  }
});

"use strict";
const checkBalanceStep = createStep({
  id: "check-balance",
  inputSchema: z.object({
    itemCost: z.number()
  }),
  outputSchema: z.object({
    balance: z.number(),
    currency: z.string()
  }),
  execute: async ({ inputData }) => {
    const result = await financeAgent.generate("Get my current balance", {
      structuredOutput: {
        schema: z.object({
          balance: z.number(),
          currency: z.string()
        })
      }
    });
    return {
      balance: 1250,
      currency: "USD"
    };
  }
});
const analyzeAffordabilityStep = createStep({
  id: "analyze-affordability",
  inputSchema: z.object({
    itemCost: z.number(),
    balance: z.number()
  }),
  outputSchema: z.object({
    canAfford: z.boolean(),
    remaining: z.number(),
    message: z.string()
  }),
  execute: async ({ inputData }) => {
    const { itemCost, balance } = inputData;
    const canAfford = balance >= itemCost;
    const remaining = balance - itemCost;
    return {
      canAfford,
      remaining,
      message: canAfford ? `Yes, you can afford this. You will have $${remaining} left.` : `No, you cannot afford this. You are short by $${Math.abs(remaining)}.`
    };
  }
});
const affordabilityWorkflow = createWorkflow({
  id: "affordability-check",
  inputSchema: z.object({
    itemCost: z.number().describe("The cost of the item to purchase")
  }),
  outputSchema: z.object({
    canAfford: z.boolean(),
    remaining: z.number(),
    message: z.string()
  })
}).then(checkBalanceStep).map(async ({ inputData, getInitData }) => {
  const initData = getInitData();
  return {
    balance: inputData.balance,
    itemCost: initData.itemCost
  };
}).then(analyzeAffordabilityStep).commit();

"use strict";
const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
    // or "sqlite", "mysql", etc.
  }),
  emailAndPassword: {
    enabled: true
  },
  trustedOrigins: ["http://localhost:5173", "http://localhost:8100", "http://localhost:3000", "http://localhost:5174"]
});

"use strict";
const mastra = new Mastra({
  agents: {
    orchestratorAgent,
    financeAgent,
    nutritionAgent,
    fitnessAgent
  },
  workflows: {
    affordabilityWorkflow
  },
  logger: createLogger({
    name: "Mastra",
    level: "info"
  }),
  server: {
    port: 4111,
    cors: {
      origin: ["http://localhost:5173", "http://localhost:8100", "http://localhost:3000", "http://localhost:5174"],
      credentials: true
    },
    apiRoutes: [registerApiRoute("/auth/:path*", {
      method: "ALL",
      handler: (c) => auth.handler(c.req.raw)
    }), registerApiRoute("/chat", {
      method: "POST",
      handler: async (c) => {
        const {
          message
        } = await c.req.json();
        const mastra2 = c.get("mastra");
        const agent = mastra2.getAgent("orchestratorAgent");
        if (!agent) {
          return c.json({
            error: "Agent not found"
          }, 404);
        }
        const result = await agent.generate(message);
        return c.json({
          response: result.text,
          toolCalls: result.toolCalls
        });
      }
    })]
  }
});

export { mastra };
