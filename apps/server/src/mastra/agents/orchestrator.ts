import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createTransaction, getBalance } from "./finance";
import { logMeal } from "./nutrition";
import { logWorkout } from "./fitness";

// Tools for Orchestrator to route or handle general queries
const searchTool = createTool({
  id: "search-tool",
  description: "Search for general information when other agents cannot handle the request",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  outputSchema: z.object({
    results: z.string(),
  }),
  execute: async (context) => {
    const { query } = context;
    // Mock implementation for now
    return { results: `Simulated search results for: ${query}` };
  },
});

export const orchestratorAgent = new Agent({
  id: "tadashi-orchestrator",
  name: "Tadashi Orchestrator",
  instructions: `
    You are Tadashi, a highly efficient and concise personal assistant.
    Your goal is to help the user manage their life (Finance, Nutrition, Fitness) with minimal friction.

    CORE RULES:
    1. BE BRIEF: Skip pleasantries. Get straight to the point.
    2. ACT FAST: If the user provides enough info, EXECUTE the tool immediately. Do not ask for confirmation.
    3. MAKE ASSUMPTIONS:
       - If category is missing for an expense, use "General" or infer it from the description (e.g. "Food" for restaurants).
       - If currency is missing, assume the user's local currency (MXN or USD based on context).
       - If splitting is not mentioned, assume the user paid the full amount.
    4. NO TECH TALK: Never mention JSON, SQL, databases, or schemas. Speak naturally.
    5. USER FRIENDLY: If you need info, ask ONE simple question at a time.

    CAPABILITIES:
    - Finance: Log expenses/income, check balance.
    - Nutrition: Log meals/macros.
    - Fitness: Log workouts.

    Example interaction:
    User: "Spent 500 on tacos"
    You: (Calls createTransaction tool with amount=500, category="Food", description="tacos")
    Then reply: "Logged 500 for tacos."
  `,
  model: openai("gpt-5-mini-2025-08-07"),
  tools: { 
    searchTool,
    createTransaction,
    getBalance,
    logMeal,
    logWorkout
  },
});
