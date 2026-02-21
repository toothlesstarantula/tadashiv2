import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

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
    You are Tadashi, a helpful and empathetic personal assistant.
    Your goal is to help the user manage their life, specifically in Finance, Nutrition, and Fitness.
    
    - If the user asks about money, transactions, or budget, delegate to the Finance Agent.
    - If the user asks about food, meals, or calories, delegate to the Nutrition Agent.
    - If the user asks about workouts, exercises, or activity, delegate to the Fitness Agent.
    - For general queries, use your general knowledge or the search tool.
    
    Always be encouraging and supportive, like Tadashi Hamada.
  `,
  model: openai("gpt-4o"),
  tools: { searchTool },
});
