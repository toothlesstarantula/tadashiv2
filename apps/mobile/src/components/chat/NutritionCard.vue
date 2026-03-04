<template>
  <ion-card class="m-0 bg-black/20 border border-white/10 backdrop-blur-md shadow-none">
    <ion-card-header>
      <ion-card-subtitle class="text-gray-400">Resumen Nutricional</ion-card-subtitle>
      <ion-card-title class="text-white">Hoy</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <div class="flex items-center gap-6">
        <!-- Circular Progress -->
        <div class="relative w-24 h-24 flex items-center justify-center">
          <svg class="transform -rotate-90 w-full h-full">
            <circle
              class="text-white/10"
              stroke-width="8"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="48"
              cy="48"
            />
            <circle
              class="text-orange-500 transition-all duration-1000 ease-out"
              stroke-width="8"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="strokeDashoffset"
              stroke-linecap="round"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="48"
              cy="48"
            />
          </svg>
          <div class="absolute flex flex-col items-center">
            <span class="text-xl font-bold text-white">{{ Math.round(calories || 0) }}</span>
            <span class="text-[10px] text-gray-400 uppercase">kcal</span>
          </div>
        </div>

        <!-- Macros -->
        <div class="flex-1 space-y-3">
          <div v-for="macro in macroData" :key="macro.label" class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="font-medium text-gray-400">{{ macro.label }}</span>
              <span class="font-bold text-white">{{ Math.round(macro.value || 0) }}g</span>
            </div>
            <div class="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(((macro.value || 0) / (macro.target || 100)) * 100, 100)}%`, backgroundColor: macro.color }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent } from '@ionic/vue';

const props = defineProps<{
  calories?: number
  proteins?: number
  carbs?: number
  fats?: number
}>()

const circumference = 2 * Math.PI * 40
const maxCalories = 2500 // Target default

const strokeDashoffset = computed(() => {
  const cals = props.calories || 0
  if (isNaN(cals)) return circumference
  const progress = Math.min(cals / maxCalories, 1)
  return circumference - progress * circumference
})

const macroData = computed(() => [
  { label: 'Proteínas', value: props.proteins || 0, color: '#3b82f6', target: 150 }, // Blue
  { label: 'Carbs', value: props.carbs || 0, color: '#10b981', target: 250 },     // Green
  { label: 'Grasas', value: props.fats || 0, color: '#f59e0b', target: 80 },      // Orange
])
</script>
