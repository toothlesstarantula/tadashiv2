import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "../../db";

export const logMeal = createTool({
  id: "log-meal",
  description: "Log a meal consumed by the user",
  inputSchema: z.object({
    name: z.string(),
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
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
          calories: context.calories ? Math.round(context.calories) : null,
          proteins: context.protein,
          carbs: context.carbs,
          fats: context.fat,
        }
      });
      return { success: true, mealId: meal.id };
    } catch (error) {
      console.error("Error logging meal:", error);
      return { success: false, mealId: "" };
    }
  },
});

export const nutritionAgent = new Agent({
  id: "nutrition-agent",
  name: "Nutrition Agent",
  instructions: "You are a nutritionist. Help the user track their meals and macronutrients.",
  model: openai("gpt-5-mini-2025-08-07"),
  tools: { logMeal },
});
