import { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@mastra/core/logger";
import { registerApiRoute } from "@mastra/core/server";
import { orchestratorAgent } from "./agents/orchestrator";
import { financeAgent } from "./agents/finance";
import { nutritionAgent } from "./agents/nutrition";
import { fitnessAgent } from "./agents/fitness";
import { affordabilityWorkflow } from "./workflows/affordability";
import { auth } from "../auth";

export const mastra = new Mastra({
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
    level: "info",
  }),
  server: {
    port: 4111,
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:8100',
        'http://localhost:3000',
        'http://localhost:5174',
        process.env.CLIENT_URL || ''
      ].filter(Boolean),
      credentials: true,
    },
    apiRoutes: [
      registerApiRoute("/auth/:path*", {
        method: "ALL",
        handler: (c) => auth.handler(c.req.raw)
      }),
      registerApiRoute("/chat", {
        method: "POST",
        handler: async (c) => {
          const { message } = await c.req.json();
          // Access mastra instance from context or closure
          const mastra = c.get("mastra");
          const agent = mastra.getAgent("orchestratorAgent");
          
          if (!agent) {
            return c.json({ error: "Agent not found" }, 404);
          }

          const result = await agent.generate(message);

          return c.json({ 
            response: result.text,
            toolCalls: result.toolCalls 
          });
        }
      })
    ]
  },
});
