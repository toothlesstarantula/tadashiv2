<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: {
    period: string
    data: Array<{
      date: string
      calories: number
      proteins: number
      carbs: number
      fats: number
    }>
  }
}>()

const maxCalories = Math.max(...props.data.data.map(d => d.calories), 2500)

const bars = computed(() => {
  return props.data.data.map(d => ({
    ...d,
    height: Math.max((d.calories / maxCalories) * 100, 5) // Min 5% height
  }))
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(date)
}
</script>

<template>
  <div class="w-full max-w-full bg-white dark:bg-[#18181b] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm overflow-hidden">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Tendencia Calórica</h3>
      <div class="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 dark:bg-[#27272a] rounded-md capitalize">
        {{ data.period === 'week' ? 'Última Semana' : 'Último Mes' }}
      </div>
    </div>

    <div class="h-48 flex items-end justify-between gap-2">
      <div v-for="(day, i) in bars" :key="i" class="flex-1 flex flex-col items-center gap-2 group">
        <div class="relative w-full flex justify-center">
          <!-- Tooltip -->
          <div class="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none">
            {{ Math.round(day.calories) }} kcal
          </div>
          <!-- Bar -->
          <div 
            class="w-full max-w-[24px] bg-orange-500/80 hover:bg-orange-500 rounded-t-sm transition-all duration-300"
            :style="{ height: `${day.height}%` }"
          ></div>
        </div>
        <span class="text-xs text-gray-500 uppercase">{{ formatDate(day.date) }}</span>
      </div>
    </div>
  </div>
</template>
