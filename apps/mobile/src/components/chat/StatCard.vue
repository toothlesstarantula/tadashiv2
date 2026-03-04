<template>
  <ion-card class="m-0 bg-black/20 border border-white/10 backdrop-blur-md shadow-none">
    <ion-card-content>
      <div class="flex items-center justify-between mb-2">
        <ion-text class="uppercase text-xs font-bold tracking-wider text-gray-400">{{ title }}</ion-text>
        <ion-icon :icon="iconObj" color="primary"></ion-icon>
      </div>
      
      <div class="text-3xl font-bold text-white my-2">
        {{ formattedValue }}
      </div>
      
      <div class="flex items-center gap-2 mt-2">
        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <ion-text class="text-xs text-gray-500">Actualizado ahora</ion-text>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IonCard, IonCardContent, IonText, IonIcon } from '@ionic/vue';
import { wallet, barChart, cafe, fitness } from 'ionicons/icons';

const props = defineProps<{
  title: string
  value: number | string
  type?: 'currency' | 'number' | 'text'
  icon?: string
}>()

const iconObj = computed(() => {
  const map: Record<string, string> = {
    wallet, barChart, cafe, fitness
  }
  return (props.icon && map[props.icon]) || wallet
})

const formattedValue = computed(() => {
  if (props.type === 'currency') {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(Number(props.value))
  }
  return props.value
})
</script>
