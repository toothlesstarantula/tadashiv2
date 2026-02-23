import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "../../db";

export const logMeal = createTool({
  id: "log-meal",
  description: "Registrar una comida y sus macronutrientes",
  inputSchema: z.object({
    name: z.string(),
    calories: z.number().optional(),
    proteins: z.number().optional(),
    carbs: z.number().optional(),
    fats: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    mealId: z.string(),
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
          fats: context.fats,
        }
      });
      return { success: true, mealId: meal.id };
    } catch (error) {
      console.error("Error logging meal:", error);
      return { success: false, mealId: "" };
    }
  },
});

export const deleteMeal = createTool({
  id: "delete-meal",
  description: "Eliminar una comida registrada por su ID",
  inputSchema: z.object({
    mealId: z.string().describe("ID de la comida a eliminar"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ mealId }) => {
    try {
      await prisma.meal.delete({
        where: { id: mealId },
      });

      return { success: true };
    } catch (error) {
      console.error("Error deleting meal:", error);
      return { success: false };
    }
  },
});

export const getDailyNutrition = createTool({
  id: "get-daily-nutrition",
  description: "Obtener el resumen de nutrición (calorías y macros) de un día específico",
  inputSchema: z.object({
    date: z.string().describe("Fecha en formato YYYY-MM-DD. Si no se proporciona, se usa hoy."),
  }),
  outputSchema: z.object({
    totalCalories: z.number(),
    totalProteins: z.number(),
    totalCarbs: z.number(),
    totalFats: z.number(),
    meals: z.array(z.object({
      id: z.string(),
      name: z.string(),
      calories: z.number(),
      proteins: z.number(),
      carbs: z.number(),
      fats: z.number(),
    })),
  }),
  execute: async ({ date }) => {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    try {
      const meals = await prisma.meal.findMany({
        where: {
          consumedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const summary = meals.reduce(
        (acc, meal) => ({
          totalCalories: acc.totalCalories + (meal.calories || 0),
          totalProteins: acc.totalProteins + (meal.proteins || 0),
          totalCarbs: acc.totalCarbs + (meal.carbs || 0),
          totalFats: acc.totalFats + (meal.fats || 0),
        }),
        { totalCalories: 0, totalProteins: 0, totalCarbs: 0, totalFats: 0 }
      );

      return {
        ...summary,
        meals: meals.map(m => ({
          id: m.id,
          name: m.name,
          calories: m.calories || 0,
          proteins: m.proteins || 0,
          carbs: m.carbs || 0,
          fats: m.fats || 0,
        }))
      };
    } catch (error) {
      console.error("Error fetching daily nutrition:", error);
      return { totalCalories: 0, totalProteins: 0, totalCarbs: 0, totalFats: 0, meals: [] };
    }
  },
});

export const getNutritionTrend = createTool({
  id: "get-nutrition-trend",
  description: "Obtener tendencias de consumo calórico y de macros (semanal o mensual)",
  inputSchema: z.object({
    period: z.enum(["week", "month"]).describe("Periodo de tiempo para el análisis"),
  }),
  outputSchema: z.object({
    period: z.string(),
    data: z.array(z.object({
      date: z.string(),
      calories: z.number(),
      proteins: z.number(),
      carbs: z.number(),
      fats: z.number(),
    })),
  }),
  execute: async ({ period }) => {
    const now = new Date();
    const startDate = new Date();
    
    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    try {
      const meals = await prisma.meal.findMany({
        where: {
          consumedAt: {
            gte: startDate,
          },
        },
        orderBy: {
          consumedAt: 'asc',
        },
      });

      // Group by date
      const groupedData = meals.reduce((acc, meal) => {
        const dateKey = meal.consumedAt.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = { date: dateKey, calories: 0, proteins: 0, carbs: 0, fats: 0 };
        }
        acc[dateKey].calories += meal.calories || 0;
        acc[dateKey].proteins += meal.proteins || 0;
        acc[dateKey].carbs += meal.carbs || 0;
        acc[dateKey].fats += meal.fats || 0;
        return acc;
      }, {} as Record<string, any>);

      return {
        period,
        data: Object.values(groupedData),
      };
    } catch (error) {
      console.error("Error fetching nutrition trend:", error);
      return { period, data: [] };
    }
  },
});

export const nutritionAgent = new Agent({
  id: "nutrition-agent",
  name: "Nutrition Agent",
  instructions: "Eres un nutricionista. Ayuda al usuario a registrar sus comidas y macronutrientes.",
  model: openai("gpt-5-mini-2025-08-07"),
  tools: { logMeal, getDailyNutrition, getNutritionTrend, deleteMeal },
});
