import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";

// Ensure we have a database URL
const dbUrl = process.env.MASTRA_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("MASTRA_DATABASE_URL or DATABASE_URL must be defined");
}

// Construct the connection string with the 'mastra' schema
const url = new URL(dbUrl);
url.searchParams.set("schema", "mastra");

export const mastraMemory = new Memory({
  storage: new PostgresStore({
    id: "tadashi-memory",
    connectionString: url.toString(),
  }),
});
