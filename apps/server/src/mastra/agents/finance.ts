import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "../../db";

async function fetchExpenses(limit: number = 20, startDate?: string, endDate?: string) {
  const where: any = { type: "expense" };
  
  if (startDate || endDate) {
    where.occurredAt = {};
    if (startDate) {
      where.occurredAt.gte = new Date(`${startDate}T00:00:00`);
    }
    if (endDate) {
      where.occurredAt.lte = new Date(`${endDate}T23:59:59`);
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  return transactions.map(t => ({
    id: t.id,
    date: t.occurredAt.toISOString().split('T')[0],
    category: t.category,
    amount: t.amount,
    description: t.description || "",
  }));
}

export const createAccount = createTool({
  id: "create-account",
  description: "Crear una nueva cuenta financiera (ej. Banco, Efectivo, Crédito)",
  inputSchema: z.object({
    name: z.string(),
    type: z.enum(["DEBIT", "CREDIT", "CASH", "SAVINGS", "INVESTMENT"]),
    balance: z.number().default(0),
    currency: z.string().default("MXN"),
    creditLimit: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    account: z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      balance: z.number(),
    }).optional(),
  }),
  execute: async (context) => {
    try {
      const account = await prisma.financialAccount.create({
        data: {
          name: context.name,
          type: context.type,
          balance: context.balance,
          currency: context.currency,
          creditLimit: context.creditLimit,
        }
      });
      return { success: true, account };
    } catch (error) {
      console.error("Error creating account:", error);
      return { success: false };
    }
  },
});

export const getAccounts = createTool({
  id: "get-accounts",
  description: "Obtener lista de cuentas financieras y sus saldos",
  inputSchema: z.object({}),
  outputSchema: z.object({
    accounts: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      balance: z.number(),
      currency: z.string(),
    })),
    totalBalance: z.number(),
  }),
  execute: async () => {
    try {
      const accounts = await prisma.financialAccount.findMany();
      // Calculate net worth: sum of positive balances (assets) - debt?
      // Usually Credit cards have negative balance if used? Or positive "debt"?
      // Let's assume Credit Card balance is "available" or "current debt"?
      // Standard: Debit/Cash/Savings balance is positive. Credit balance is debt (negative net worth).
      // User said "Capturar ingresos... tener un total".
      // Let's just return raw balances for now.
      const totalBalance = accounts.reduce((acc, curr) => {
        if (curr.type === 'CREDIT') return acc; // Credit limit isn't "money I have"
        return acc + curr.balance;
      }, 0);
      
      return { accounts, totalBalance };
    } catch (error) {
      console.error("Error fetching accounts:", error);
      return { accounts: [], totalBalance: 0 };
    }
  },
});

export const createTransaction = createTool({
  id: "create-transaction",
  description: "Registrar transacción (gasto, ingreso o transferencia)",
  inputSchema: z.object({
    type: z.enum(["expense", "income", "transfer"]),
    amount: z.number(),
    category: z.string(),
    description: z.string().optional(),
    occurredAt: z.string().optional().describe("YYYY-MM-DD"),
    accountId: z.string().optional().describe("ID de la cuenta origen o donde ingresa el dinero"),
    toAccountId: z.string().optional().describe("ID de la cuenta destino (solo para transferencias)"),
    installments: z.number().optional().default(1).describe("Número total de meses (para compras a Meses Sin Intereses)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transactionId: z.string(),
    message: z.string().optional(),
  }),
  execute: async (context) => {
    const occurredAt = context.occurredAt 
      ? new Date(`${context.occurredAt}T12:00:00`)
      : new Date();

    try {
      // Logic for balance updates
      if (context.type === 'transfer') {
        if (!context.accountId || !context.toAccountId) {
          throw new Error("Transfer requires accountId and toAccountId");
        }
        // Atomic transaction
        return await prisma.$transaction(async (tx) => {
          // Deduct from source
          await tx.financialAccount.update({
            where: { id: context.accountId },
            data: { balance: { decrement: context.amount } }
          });
          // Add to dest
          await tx.financialAccount.update({
            where: { id: context.toAccountId },
            data: { balance: { increment: context.amount } }
          });
          // Record
          const t = await tx.transaction.create({
            data: {
              type: context.type,
              amount: context.amount,
              category: context.category,
              description: context.description,
              occurredAt,
              accountId: context.accountId,
              toAccountId: context.toAccountId,
              currency: "MXN",
              installments: 1,
            }
          });
          return { success: true, transactionId: t.id, message: "Transferencia realizada" };
        });
      } else if (context.type === 'income') {
        if (context.accountId) {
          await prisma.financialAccount.update({
            where: { id: context.accountId },
            data: { balance: { increment: context.amount } }
          });
        }
      } else if (context.type === 'expense') {
        if (context.accountId) {
          // For CREDIT accounts, spending also decreases balance (making it more negative, i.e., more debt)
          // For DEBIT/CASH, spending decreases balance (less money)
          // Logic is the same: decrement.
          await prisma.financialAccount.update({
            where: { id: context.accountId },
            data: { balance: { decrement: context.amount } }
          });
        }
      }

      const transaction = await prisma.transaction.create({
        data: {
          type: context.type,
          amount: context.amount,
          category: context.category,
          description: context.description,
          currency: "MXN",
          occurredAt,
          accountId: context.accountId,
          installments: context.installments || 1,
        }
      });
      
      return { success: true, transactionId: transaction.id };
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      return { success: false, transactionId: "", message: error.message };
    }
  },
});

export const getBalance = createTool({
  id: "get-balance",
  description: "Obtener el saldo global de todas las cuentas (Efectivo + Débito + Ahorros). NO incluye crédito.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    balance: z.number(),
    currency: z.string(),
    breakdown: z.array(z.object({
      name: z.string(),
      balance: z.number(),
      type: z.string(),
    })).optional(),
  }),
  execute: async () => {
    try {
      const accounts = await prisma.financialAccount.findMany();
      const liquidAccounts = accounts.filter(a => ['DEBIT', 'CASH', 'SAVINGS'].includes(a.type));
      
      const balance = liquidAccounts.reduce((sum, acc) => sum + acc.balance, 0);
      
      const breakdown = accounts.map(a => ({
        name: a.name,
        balance: a.balance,
        type: a.type,
      }));

      return { balance, currency: "MXN", breakdown };
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
  description: "Eliminar una transacción por ID y devolver la lista actualizada de gastos. NO llamar a getExpenseSummary en el mismo turno.",
  inputSchema: z.object({
    transactionId: z.string().describe("ID de la transacción a eliminar"),
    limit: z.number().optional().default(20),
    startDate: z.string().optional().describe("Fecha inicial para el resumen (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("Fecha final para el resumen (YYYY-MM-DD)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transactions: z.array(z.object({
      id: z.string(),
      date: z.string(),
      category: z.string(),
      amount: z.number(),
      description: z.string().optional(),
    })).optional(),
  }),
  execute: async (context) => {
    try {
      await prisma.transaction.delete({
        where: { id: context.transactionId },
      });
      
      const transactions = await fetchExpenses(context.limit, context.startDate, context.endDate);
      
      return { success: true, transactions };
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return { success: false };
    }
  },
});

export const getExpenseSummary = createTool({
  id: "get-expense-summary",
  description: "Obtener un resumen de gastos para mostrar en una tabla. Permite filtrar por rango de fechas.",
  inputSchema: z.object({
    limit: z.number().optional().default(20),
    startDate: z.string().optional().describe("Fecha inicial (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("Fecha final (YYYY-MM-DD)"),
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
  execute: async ({ limit, startDate, endDate }) => {
    try {
      const transactions = await fetchExpenses(limit, startDate, endDate);
      return { transactions };
    } catch (error) {
      console.error("Error fetching expense summary:", error);
      return { transactions: [] };
    }
  },
});

export const financeAgent = new Agent({
  id: "finance-agent",
  name: "Finance Agent",
  instructions: "Eres un asesor financiero. Ayuda al usuario a rastrear gastos, ingresos y gestionar sus cuentas. SIEMPRE verifica si el usuario quiere usar una cuenta específica para ingresos o transferencias. Al iniciar, puedes ofrecer listar las cuentas disponibles.",
  model: openai('gpt-5-mini-2025-08-07'),
  tools: { createTransaction, getBalance, getExpenseSummary, updateTransaction, deleteTransaction, createAccount, getAccounts },
});
