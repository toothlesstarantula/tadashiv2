<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: {
    totalCalories: number
    totalProteins: number
    totalCarbs: number
    totalFats: number
    meals: Array<{
      id: string
      name: string
      calories: number
      proteins: number
      carbs: number
      fats: number
    }>
  }
}>()

const maxCalories = 2500 // Example daily goal

const percentage = computed(() => {
  return Math.min(Math.round((props.data.totalCalories / maxCalories) * 100), 100)
})

const macroData = computed(() => [
  { label: 'Proteína', value: props.data.totalProteins, color: 'bg-blue-500' },
  { label: 'Carbos', value: props.data.totalCarbs, color: 'bg-green-500' },
  { label: 'Grasas', value: props.data.totalFats, color: 'bg-yellow-500' },
])
</script>

<template>
  <div class="w-full max-w-full bg-white dark:bg-[#18181b] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm overflow-hidden">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Resumen Diario</h3>
      <div class="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 dark:bg-[#27272a] rounded-md">
        Hoy
      </div>
    </div>

    <!-- Calories Circle -->
    <div class="flex items-center gap-8 mb-8">
      <div class="relative w-32 h-32 flex items-center justify-center">
        <!-- Background Circle -->
        <svg class="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="58" stroke="currentColor" stroke-width="8" fill="transparent" class="text-gray-100 dark:text-[#27272a]" />
          <circle cx="64" cy="64" r="58" stroke="currentColor" stroke-width="8" fill="transparent" :stroke-dasharray="365" :stroke-dashoffset="365 - (365 * percentage) / 100" class="text-orange-500 transition-all duration-1000 ease-out" />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl font-bold text-gray-900 dark:text-white">{{ data.totalCalories }}</span>
          <span class="text-xs text-gray-500">kcal</span>
        </div>
      </div>

      <!-- Macros -->
      <div class="flex-1 space-y-4">
        <div v-for="macro in macroData" :key="macro.label" class="space-y-1">
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400 font-medium">{{ macro.label }}</span>
            <span class="text-gray-900 dark:text-white font-bold">{{ Math.round(macro.value) }}g</span>
          </div>
          <div class="h-2 w-full bg-gray-100 dark:bg-[#27272a] rounded-full overflow-hidden">
            <div :class="['h-full rounded-full transition-all duration-500', macro.color]" :style="{ width: `${Math.min((macro.value / 200) * 100, 100)}%` }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Meals List -->
    <div class="space-y-3">
      <div
        v-for="(meal, i) in data.meals"
        :key="meal.id || i"
        class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#27272a]/50 border border-gray-100 dark:border-white/5"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <span class="i-heroicons-cake w-4 h-4"></span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ meal.name }}
            </span>
            <span class="text-[10px] text-gray-500 font-mono">
              #{{ i + 1 }}
            </span>
          </div>
        </div>
        <div class="text-sm font-bold text-gray-600 dark:text-gray-400">
          {{ Math.round(meal.calories) }} kcal
        </div>
      </div>
      <div v-if="data.meals.length === 0" class="text-center py-4 text-sm text-gray-500">
        No hay comidas registradas hoy
      </div>
      <div v-else class="pt-2 text-[10px] text-gray-500 text-right">
        Para eliminar, puedes decir: "elimina el #2" o "elimina Pasta fussilli..."
      </div>
    </div>
  </div>
</template>
