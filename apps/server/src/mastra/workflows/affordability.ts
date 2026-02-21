import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { financeAgent } from "../agents/finance";

// Step 1: Check balance
const checkBalanceStep = createStep({
  id: "check-balance",
  inputSchema: z.object({
    itemCost: z.number(),
  }),
  outputSchema: z.object({
    balance: z.number(),
    currency: z.string(),
  }),
  execute: async ({ inputData }) => {
    // We don't strictly use itemCost here, but it's passed through
    const result = await financeAgent.generate("Get my current balance", {
        structuredOutput: {
            schema: z.object({
                balance: z.number(),
                currency: z.string(),
            })
        }
    });
    
    // For now returning mock data as the agent isn't fully connected
    return {
      balance: 1250.00,
      currency: "USD"
    };
  },
});

// Step 2: Analyze affordability
const analyzeAffordabilityStep = createStep({
  id: "analyze-affordability",
  inputSchema: z.object({
    itemCost: z.number(),
    balance: z.number(),
  }),
  outputSchema: z.object({
    canAfford: z.boolean(),
    remaining: z.number(),
    message: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { itemCost, balance } = inputData;
    
    const canAfford = balance >= itemCost;
    const remaining = balance - itemCost;
    
    return {
      canAfford,
      remaining,
      message: canAfford 
        ? `Yes, you can afford this. You will have $${remaining} left.`
        : `No, you cannot afford this. You are short by $${Math.abs(remaining)}.`
    };
  },
});

export const affordabilityWorkflow = createWorkflow({
  id: "affordability-check",
  inputSchema: z.object({
    itemCost: z.number().describe("The cost of the item to purchase"),
  }),
  outputSchema: z.object({
    canAfford: z.boolean(),
    remaining: z.number(),
    message: z.string(),
  })
})
.then(checkBalanceStep)
.map(async ({ inputData, getInitData }) => {
    const initData = getInitData() as { itemCost: number };
    return {
        balance: inputData.balance,
        itemCost: initData.itemCost
    };
})
.then(analyzeAffordabilityStep)
.commit();
