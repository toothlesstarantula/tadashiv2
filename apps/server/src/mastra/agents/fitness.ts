import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "../../db";

export const logWorkout = createTool({
  id: "log-workout",
  description: "Log a workout session",
  inputSchema: z.object({
    type: z.string(),
    durationMinutes: z.number(),
    caloriesBurned: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    workoutId: z.string(),
  }),
  execute: async (context) => {
    console.log("Logging workout:", context);
    
    try {
      const workout = await prisma.workout.create({
        data: {
          type: context.type,
          durationMinutes: context.durationMinutes,
          calories: context.caloriesBurned ? Math.round(context.caloriesBurned) : null,
        }
      });
      return { success: true, workoutId: workout.id };
    } catch (error) {
      console.error("Error logging workout:", error);
      return { success: false, workoutId: "" };
    }
  },
});

export const fitnessAgent = new Agent({
  id: "fitness-agent",
  name: "Fitness Agent",
  instructions: "You are a fitness coach. Help the user track their workouts and stay active.",
  model: openai("gpt-5-mini-2025-08-07"),
  tools: { logWorkout },
});
