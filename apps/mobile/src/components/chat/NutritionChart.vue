<template>
  <ion-card class="m-0 bg-black/20 border border-white/10 backdrop-blur-md shadow-none">
    <ion-card-header>
      <ion-card-subtitle class="text-gray-400">{{ data.period === 'week' ? 'Última Semana' : 'Último Mes' }}</ion-card-subtitle>
      <ion-card-title class="text-white">Tendencia Calórica</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <div class="chart-container">
        <div v-for="(day, i) in bars" :key="i" class="chart-bar-container group">
          <div class="bar-wrapper">
            <div 
              class="bar bg-orange-500/80 group-hover:bg-orange-400 transition-colors" 
              :style="{ height: `${day.height}%` }"
              :title="`${Math.round(day.calories)} kcal`"
            ></div>
          </div>
          <span class="day-label text-gray-500 group-hover:text-white transition-colors">{{ formatDate(day.date) }}</span>
        </div>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent } from '@ionic/vue';

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

const bars = computed(() => {
  if (!props.data || !props.data.data || props.data.data.length === 0) return [];
  
  const maxCalories = Math.max(...props.data.data.map(d => d.calories || 0), 2500);
  
  return props.data.data.map(d => ({
    ...d,
    height: Math.max(((d.calories || 0) / maxCalories) * 100, 5) // Min 5% height
  }))
})

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(date).slice(0, 3)
  } catch (e) {
    return '---'
  }
}
</script>

<style scoped>
.chart-container {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 200px;
  padding-top: 20px;
}

.chart-bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  cursor: pointer;
}

.bar-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-bottom: 8px;
}

.bar {
  width: 12px;
  border-radius: 4px 4px 0 0;
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.day-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 600;
}
</style>
