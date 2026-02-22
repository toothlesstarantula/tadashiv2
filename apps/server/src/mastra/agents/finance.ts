import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "../../db";

export const createTransaction = createTool({
  id: "create-transaction",
  description: "Log a new financial transaction (expense or income)",
  inputSchema: z.object({
    type: z.enum(["expense", "income"]),
    amount: z.number(),
    category: z.string(),
    description: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transactionId: z.string(),
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
          currency: "USD", // Default currency
        }
      });
      
      return { success: true, transactionId: transaction.id };
    } catch (error) {
      console.error("Error creating transaction:", error);
      return { success: false, transactionId: "" };
    }
  },
});

export const getBalance = createTool({
  id: "get-balance",
  description: "Get the current account balance",
  inputSchema: z.object({}),
  outputSchema: z.object({
    balance: z.number(),
    currency: z.string(),
  }),
  execute: async () => {
    try {
      const income = await prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: "income",
        },
      });

      const expense = await prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: "expense",
        },
      });

      const totalIncome = income._sum.amount || 0;
      const totalExpense = expense._sum.amount || 0;
      const balance = totalIncome - totalExpense;

      return { balance, currency: "USD" };
    } catch (error) {
      console.error("Error calculating balance:", error);
      return { balance: 0, currency: "USD" };
    }
  },
});

export const financeAgent = new Agent({
  id: "finance-agent",
  name: "Finance Agent",
  instructions: "You are a financial advisor. Help the user track expenses and manage their budget.",
  model: openai('gpt-5-mini-2025-08-07'),
  tools: { createTransaction, getBalance },
});
