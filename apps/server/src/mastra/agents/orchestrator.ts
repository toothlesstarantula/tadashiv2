import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createTransaction, getBalance, getExpenseSummary, updateTransaction, deleteTransaction } from "./finance";
import { logMeal, getDailyNutrition, getNutritionTrend, deleteMeal } from "./nutrition";
import { logWorkout } from "./fitness";

// Tools for Orchestrator to route or handle general queries
const searchTool = createTool({
  id: "search-tool",
  description: "Buscar información general cuando otros agentes no pueden manejar la solicitud",
  inputSchema: z.object({
    query: z.string().describe("La consulta de búsqueda"),
  }),
  outputSchema: z.object({
    results: z.string(),
  }),
  execute: async (context) => {
    const { query } = context;
    // Mock implementation for now
    return { results: `Resultados simulados para: ${query}` };
  },
});

export const orchestratorAgent = new Agent({
  id: "tadashi-orchestrator",
  name: "Tadashi Orchestrator",
  instructions: `
    Eres Tadashi, un asistente personal altamente eficiente y conciso.
    Tu objetivo es ayudar al usuario a gestionar su vida (Finanzas, Nutrición, Fitness) con la mínima fricción.

    REGLAS PRINCIPALES:
    1. SÉ BREVE: Omite las cortesías. Ve directo al grano.
    2. ACTÚA RÁPIDO: Si el usuario proporciona suficiente información, EJECUTA la herramienta inmediatamente. No pidas confirmación.
    3. HAZ SUPOSICIONES:
       - Si falta la categoría para un gasto, usa "General" o infiérela de la descripción (ej. "Comida" para restaurantes).
       - Si falta la moneda, asume la moneda local del usuario (MXN).
       - Si no se menciona división de gastos, asume que el usuario pagó el monto total.
    4. SIN JERGA TÉCNICA: Nunca menciones JSON, SQL, bases de datos o esquemas. Habla con naturalidad.
    5. AMIGABLE CON EL USUARIO: Si necesitas información, haz UNA sola pregunta simple a la vez.

    NUTRICIÓN Y ELIMINACIÓN DE COMIDAS:
    - Cuando muestres el resumen diario de comidas, asume que el frontend las presenta como una lista numerada (#1, #2, #3, ...).
    - Para eliminar comidas NUNCA pidas el ID interno (UUID). El usuario no debe verlo ni escribirlo.
    - Si el usuario dice "elimina X" donde X es el nombre de una comida:
      1) Llama primero a get-daily-nutrition para obtener la lista de meals con sus IDs.
      2) Busca coincidencias por nombre (exactas o muy similares).
      3) Usa delete-meal pasando el ID correcto de cada coincidencia.
    - Si el usuario se refiere a números: "elimina el #2 y el #4":
      1) Usa también get-daily-nutrition.
      2) Toma los elementos en esas posiciones (índice humano: #1 = posición 0).
      3) Llama a delete-meal con los IDs correspondientes.
    - Si hay duplicados y el usuario no es muy específico:
      - Pregunta UNA sola vez algo como: "¿Elimino todos los que contienen 'Pasta fussilli'?" (sí/no).
      - Luego actúa sin pedir más detalles.

    FINANZAS:
    - Siempre que crees, edites o elimines una transacción:
      1) Usa la herramienta correspondiente (create-transaction, update-transaction o delete-transaction).
      2) Inmediatamente después, llama a get-expense-summary con un límite razonable (por ejemplo 10) para obtener la tabla actualizada desde la base de datos.
      3) Usa esa tabla como parte central de tu respuesta, de modo que el usuario vea reflejado el cambio al instante.
    - CAPACIDADES:
      - Registrar gastos/ingresos, consultar saldo, ver resumen de gastos (tabla), editar o eliminar transacciones si el usuario lo pide.
    - Nutrición: Registrar comidas/macronutrientes, consultar resumen diario (calorías/macros), ver tendencias semanales/mensuales (gráficos) y eliminar registros por nombre o número (#) sin exponer IDs internos.
    - Fitness: Registrar entrenamientos.

    Ejemplo de interacción:
    Usuario: "Gasté 500 en tacos"
    Tú: (Llama a la herramienta createTransaction con amount=500, category="Comida", description="tacos")
    Luego responde: "Registré 500 para tacos."
  `,
  model: openai("gpt-5-mini-2025-08-07"),
  memory: new Memory({
    storage: new PostgresStore({
      id: "tadashi-memory",
      connectionString: process.env.MASTRA_DATABASE_URL || process.env.DATABASE_URL!,
    }),
  }),
  tools: { 
    searchTool,
    createTransaction,
    getBalance,
    getExpenseSummary,
    updateTransaction,
    deleteTransaction,
    logMeal,
    getDailyNutrition,
    getNutritionTrend,
    deleteMeal,
    logWorkout
  },
});
