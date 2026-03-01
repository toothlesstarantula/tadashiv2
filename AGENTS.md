## AGENTS – Arquitectura conversacional de Tadashi

Este documento define cómo se modelan los agentes, tools y memoria del proyecto para que todo el equipo pueda diseñar y extender la capa conversacional de forma consistente.

---

## 1. Stack de referencia

- Backend HTTP: Hono sobre Bun.
- Orquestación de agentes: Mastra (TypeScript).
- Frontend web: Nuxt (Vue 3) + Nuxt UI v4 + TailwindCSS.
- App móvil: Ionic (sobre Vue/Nuxt).
- Base de datos: Postgres + pgvector.
- ORM: Prisma version 7, con pgvector extension, latest.
- Tooling en el editor: MCP de Context7 (docs de frameworks) y MCP de Mastra (docs de Mastra).

---

## 2. Arquitectura de alto nivel

Flujo general:

1. Usuario → UI (Nuxt/Ionic) → API Gateway (Hono).
2. Hono delega al servidor de Mastra (agents + tools).
3. El `OrchestratorAgent` decide:
   - Responder directamente.
   - Llamar a uno o varios tools de dominio (finanzas, nutrición, ejercicio, research).
   - Consultar memoria (Postgres + pgvector) para contexto de largo plazo.
   - Encadenar varios pasos (ej. hacer scraping, guardar, luego razonar).

Backend lógico:

- `OrchestratorAgent`: agente principal de conversación.
- `ResearchAgent`: especializado en scraping e investigación.
- `FinanceAgent`: altas de gastos/ingresos, presupuesto y affordance.
- `NutritionAgent`: registro de comidas y calorías.
- `FitnessAgent`: registro de entrenamientos y métricas.
- `ReportingAgent`: reportes cruzados (resúmenes mensuales, balance + hábitos).

---

## 3. Filosofía de diseño (Agents / Tools / Resources / Prompts)

- Agents: encapsulan comportamiento conversacional + memoria + acceso a tools.
- Tools: acciones sobre APIs o datos estructurados, con input/output JSON validados.
- Resources: datos de solo lectura (texto, guías, config) que se pasan como contexto.
- Prompts: plantillas reutilizables de instrucciones (system/assistant) para agentes y tools.

Regla práctica:

- Escribir/leer datos estructurados → Tool.
- Exponer texto o docs de referencia → Resource.
- Definir “cómo pensar/hablar” → Prompt.
- Coordinar varios tools/resources → Agent.

---

## 4. Catálogo de agentes

### 4.1 OrchestratorAgent (“Tadashi Orchestrator”)

- Rol: agente principal de chat estilo manus.im.
- Responsabilidades:
  - Entender intención del usuario.
  - Rutear hacia agente/tool adecuado.
  - Coordinar flujos multi-paso (research → memoria → reporte).
  - Mantener consistencia de personalidad y contexto global.
- Tools que puede invocar:
  - `research.scrapeAndIndex`
  - `finance.createTransaction`
  - `finance.getAffordability`
  - `nutrition.logMeal`
  - `fitness.logWorkout`
  - `reporting.generateSummary`

### 4.2 ResearchAgent

- Rol: investigaciones y scraping tipo manus.im.
- Tools:
  - `firecrawl.crawlUrl`  
    - Input: `{ url: string; depth?: number }`
    - Output: `{ pages: { url: string; html?: string; text: string }[] }`
  - `research.indexDocuments`
    - Usa pgvector para guardar chunks embebidos en Postgres.
  - `research.search`
    - Busca en memoria vectorial para responder preguntas sobre la investigación.

### 4.3 FinanceAgent

- Rol: presupuesto personal y “¿me puedo permitir X?”.
- Tools principales:
  - `finance.createTransaction`
    - Input: `{ type: "expense" | "income"; amount: number; currency: string; category: string; description?: string; occurredAt?: string }`
  - `finance.getBalance`
    - Output: `{ currentBalance: number; byAccount: Record<string, number> }`
  - `finance.getAffordability`
    - Input: `{ itemCost: number; horizonMonths?: number }`
    - Output: `{ canAfford: boolean; reasoning: string }`

### 4.4 NutritionAgent

- Rol: registro de comidas y calorías.
- Tools:
  - `nutrition.logMeal`
    - Input: `{ name: string; calories?: number; proteins?: number; carbs?: number; fats?: number; consumedAt?: string }`
  - `nutrition.getDailySummary`
    - Output: `{ date: string; calories: number; proteins: number; carbs: number; fats: number }`

### 4.5 FitnessAgent

- Rol: registro de entrenamientos con todos sus datos.
- Tools:
  - `fitness.logWorkout`
    - Input: `{ type: string; durationMinutes?: number; distanceKm?: number; calories?: number; notes?: string; occurredAt?: string }`
  - `fitness.getWeeklySummary`
    - Output: `{ weekStart: string; totalWorkouts: number; totalMinutes: number; byType: Record<string, number> }`

### 4.6 ReportingAgent

- Rol: generar reportes cruzados (finanzas + hábitos).
- Tools:
  - `reporting.generateSummary`
    - Input: `{ period: "week" | "month"; focus?: "finance" | "nutrition" | "fitness" | "all" }`
    - Output: `{ title: string; textSummary: string; metrics: Record<string, number | string>; suggestions: string[] }`

---

## 5. Memoria y modelo de datos

- Postgres + pgvector se usan para:
  - Memoria de investigaciones (ResearchAgent).
  - Hechos persistentes de usuario (objetivos, límites de gasto, etc.).
  - Historial de transacciones, comidas y entrenamientos.
- Prisma:
  - Tablas sugeridas:
    - `User`, `Conversation`, `Message`.
    - `Transaction` (finanzas).
    - `Meal`, `Workout`.
    - `ResearchDocument`, `ResearchChunk` con columnas vectoriales.
- Los agents leen/escriben **solo vía tools** que envuelven Prisma; el LLM nunca ve SQL directo.

---

## 6. Integración con frontend (Nuxt + Ionic)

- La UI de chat envía mensajes a un endpoint de Hono:
  - Ejemplo: `POST /api/chat` → body `{ conversationId, message }`.
- Hono llama al OrchestratorAgent en Mastra:
  - El resultado incluye:
    - Mensajes del asistente.
    - Tool calls ejecutados (para debugging).
    - Metadata para UI (ej. tags de “research”, “finance”).
- El frontend debe:
  - Mostrar el hilo de mensajes.
  - Mostrar bloques colapsables para resultados de tools (p.ej. tablas de gastos, gráficos).

---

## 7. Uso de MCP en TRAE/VS Code

En desarrollo, el editor ya expone dos MCP servers clave:

- **Context7**
  - Úsalo para preguntar por:
    - Hono (routing, middlewares, patrones de error handling).
    - Nuxt 3 / Nuxt UI v4 (componentes, slots, props).
    - Prisma y pgvector (migraciones, índices).
- **Mastra**
  - Úsalo para:
    - Revisar API actualizada de `Agent`, `Tool`, `Resource`, `Prompt`.
    - Ver ejemplos de integración con Hono/Express.
    - Consultar cambios de versión y mejores prácticas.

Recomendación:

- Antes de definir un nuevo agent/tool, consulta:
  - En Context7: patrones de best practices del framework concreto.
  - En Mastra: ejemplos de agents/tools parecidos.

---

## 8. Convenciones y extensibilidad

- Nombres de tools: `dominio.verboObjeto` (ej. `finance.createTransaction`).
- Todos los tools deben:
  - Definir `inputSchema` y `outputSchema` claros.
  - Validar inputs en el backend antes de tocar la BD o APIs externas.
  - Devolver errores tipados (ej. `code`, `message`, `details`).
- Al agregar un nuevo dominio:
  - Crear un nuevo Agent de dominio.
  - Definir tools mínimos CRUD + summaries.
  - Añadir rutas en Hono y wiring en Mastra.
  - Documentar el agent y sus tools en este archivo.

---

## 9. Reglas de Infraestructura y Base de Datos

- **Base de Datos (Prisma)**:
  - **PROHIBIDO**: Usar `prisma db push` o `prisma migrate deploy` en desarrollo.
  - **OBLIGATORIO**: Usar siempre `prisma migrate dev` para aplicar cambios en el esquema.
  - Si `prisma migrate dev` falla (ej. drift, conflictos):
    - NO intentar forzarlo con `db push`.
    - Pedir intervención manual o instrucciones para resolver el conflicto.
  - Razón: `db push` modifica el esquema sin dejar rastro en el historial de migraciones, causando inconsistencias y errores futuros.

