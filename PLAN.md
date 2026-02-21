# Tadashi Implementation Plan

## Overview
Tadashi is a "Turbo Monorepo" project aiming to replicate the capabilities of Manus.im but for personal finance, nutrition, and fitness tracking. It features a Hono+Mastra backend and two frontends: a Vue 3 web app and an Ionic mobile app.

## Architecture
- **Monorepo**: Turborepo
- **Backend**: Hono (Bun) + Mastra (Agents) + Prisma v7 (pgvector)
- **Web Client**: Vue 3 + Vite + Nuxt UI v4 + Pinia
- **Mobile Client**: Ionic + Vue 3
- **Database**: Postgres + pgvector

---

## Phase 1: Foundation & Setup (Current)
**Goal**: Establish the project structure, install core dependencies, and ensure all apps can start.

- [x] **Monorepo Structure**: Ensure `apps/server`, `apps/client`, `apps/mobile` exist.
- [x] **Server Setup**: Install Hono and Mastra dependencies.
- [x] **Client Setup**: Install Vue 3, Vite, Nuxt UI v4 (Alpha), Pinia, TailwindCSS v4.
- [x] **Mobile Setup**: Initialize Ionic Vue app.
- [ ] **Shared Configuration**: Setup TypeScript config and shared UI types if needed.
- [ ] **Database Setup**: Initialize Prisma with pgvector extension and basic schema (`User`, `Message`, `Transaction`).

## Phase 2: Core Backend & Agents
**Goal**: Implement the "Brain" of Tadashi using Mastra and Hono.

- [ ] **Mastra Configuration**:
    - Configure LLM provider (OpenAI/Anthropic) in Mastra.
    - Create `OrchestratorAgent`.
    - Create domain agents: `FinanceAgent`, `NutritionAgent`, `FitnessAgent`.
- [ ] **Tool Implementation**:
    - **Finance**: `createTransaction`, `getBalance`, `scanReceipt` (Vision).
    - **Nutrition**: `logMeal`, `getDailyMacros`, `scanFood` (Vision).
    - **Fitness**: `logWorkout`, `getWeeklyActivity`.
- [ ] **API Layer**:
    - Expose `/api/chat` endpoint in Hono.
    - Handle streaming responses from Mastra.
    - Implement file upload endpoints for images/audio.

## Phase 3: UI Implementation
**Goal**: Build the chat interface and custom widgets.

- [ ] **Web Client (Vue + Nuxt UI)**:
    - Implement Chat Interface (Message list, Input area).
    - Build "Widgets" for tool outputs (e.g., Transaction Receipt card, Macro chart).
    - Integrate Pinia for chat history state.
- [ ] **Mobile Client (Ionic)**:
    - Implement Camera integration for receipt/food scanning.
    - Implement Voice recording for audio logging.
    - Replicate Chat UI with mobile-native feel.

## Phase 4: Intelligence & Refinement
**Goal**: Make the agent smarter and the UI smoother.

- [ ] **Memory System**:
    - Implement vector search for long-term memory (pgvector).
    - Store user preferences and history.
- [ ] **Complex Flows**:
    - "Can I afford this?" logic (checking budget + balance).
    - "Weekly Health Report" generation.
- [ ] **Polishing**:
    - Error handling for failed tool calls.
    - Optimistic UI updates.
    - Dark mode support (via Nuxt UI).

## Next Steps
1. Configure Prisma schema.
2. Setup Mastra agents in `apps/server`.
3. Build the basic Chat UI in `apps/client`.
