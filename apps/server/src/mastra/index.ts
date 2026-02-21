import { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@mastra/core/logger";
import { orchestratorAgent } from "./agents/orchestrator";
import { financeAgent } from "./agents/finance";
import { nutritionAgent } from "./agents/nutrition";
import { fitnessAgent } from "./agents/fitness";
import { affordabilityWorkflow } from "./workflows/affordability";

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
});
