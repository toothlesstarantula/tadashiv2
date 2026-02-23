import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "../../db";

export const createTransaction = createTool({
  id: "create-transaction",
  description: "Registrar una nueva transacción financiera (gasto o ingreso)",
  inputSchema: z.object({
    type: z.enum(["expense", "income"]),
    amount: z.number(),
    category: z.string(),
    description: z.string().optional(),
    occurredAt: z.string().optional().describe("Fecha de la transacción en formato YYYY-MM-DD (zona horaria del usuario)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transactionId: z.string(),
  }),
  execute: async (context) => {
    console.log("Creating transaction:", context);

    const occurredAt =
      context.occurredAt != null && context.occurredAt !== ""
        ? new Date(`${context.occurredAt}T12:00:00`)
        : new Date();

    try {
      const transaction = await prisma.transaction.create({
        data: {
          type: context.type,
          amount: context.amount,
          category: context.category,
          description: context.description,
          currency: "MXN", // Default currency
          occurredAt,
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
  description: "Obtener el saldo actual de la cuenta",
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

      return { balance, currency: "MXN" };
    } catch (error) {
      console.error("Error calculating balance:", error);
      return { balance: 0, currency: "MXN" };
    }
  },
});

export const updateTransaction = createTool({
  id: "update-transaction",
  description: "Modificar una transacción existente (gasto o ingreso)",
  inputSchema: z.object({
    transactionId: z.string().describe("ID de la transacción a editar"),
    amount: z.number().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    occurredAt: z.string().optional().describe("Nueva fecha de la transacción en formato YYYY-MM-DD (zona horaria del usuario)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transaction: z
      .object({
        id: z.string(),
        date: z.string(),
        category: z.string(),
        amount: z.number(),
        description: z.string().optional(),
      })
      .optional(),
  }),
  execute: async (context) => {
    const occurredAt =
      context.occurredAt != null && context.occurredAt !== ""
        ? new Date(`${context.occurredAt}T12:00:00`)
        : undefined;

    try {
      const updated = await prisma.transaction.update({
        where: { id: context.transactionId },
        data: {
          amount: context.amount,
          category: context.category,
          description: context.description,
          occurredAt,
        }
      });
      return {
        success: true,
        transaction: {
          id: updated.id,
          date: updated.occurredAt.toISOString().split("T")[0],
          category: updated.category,
          amount: updated.amount,
          description: updated.description || "",
        },
      };
    } catch (error) {
      console.error("Error updating transaction:", error);
      return { success: false };
    }
  },
});

export const deleteTransaction = createTool({
  id: "delete-transaction",
  description: "Eliminar una transacción por ID",
  inputSchema: z.object({
    transactionId: z.string().describe("ID de la transacción a eliminar"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async (context) => {
    try {
      await prisma.transaction.delete({
        where: { id: context.transactionId },
      });
      return { success: true };
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return { success: false };
    }
  },
});

export const getExpenseSummary = createTool({
  id: "get-expense-summary",
  description: "Obtener un resumen de gastos para mostrar en una tabla",
  inputSchema: z.object({
    limit: z.number().optional().default(10),
  }),
  outputSchema: z.object({
    transactions: z.array(z.object({
      id: z.string(),
      date: z.string(),
      category: z.string(),
      amount: z.number(),
      description: z.string().optional(),
    })),
  }),
  execute: async ({ limit }) => {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { type: "expense" },
        orderBy: { occurredAt: "desc" },
        take: limit,
      });

      return {
        transactions: transactions.map(t => ({
          id: t.id,
          date: t.occurredAt.toISOString().split('T')[0],
          category: t.category,
          amount: t.amount,
          description: t.description || "",
        }))
      };
    } catch (error) {
      console.error("Error fetching expense summary:", error);
      return { transactions: [] };
    }
  },
});

export const financeAgent = new Agent({
  id: "finance-agent",
  name: "Finance Agent",
  instructions: "Eres un asesor financiero. Ayuda al usuario a rastrear gastos y gestionar su presupuesto.",
  model: openai('gpt-5-mini-2025-08-07'),
  tools: { createTransaction, getBalance, getExpenseSummary, updateTransaction, deleteTransaction },
});
