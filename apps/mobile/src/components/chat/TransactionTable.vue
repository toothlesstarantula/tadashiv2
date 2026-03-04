<template>
  <div class="transaction-container bg-black/20 backdrop-blur-md border border-white/10">
    <ion-list class="bg-transparent p-0">
      <ion-list-header class="bg-transparent">
        <ion-label class="text-gray-400 font-medium text-sm">Transacciones Recientes</ion-label>
      </ion-list-header>

      <ion-item v-for="t in transactions" :key="t.id" lines="none" class="bg-transparent transaction-item">
        <ion-label>
          <h2 class="text-white font-medium">{{ t.description || 'Sin descripción' }}</h2>
          <p class="text-gray-500 text-xs mt-1">{{ t.date }} • {{ t.category }}</p>
        </ion-label>
        <ion-note slot="end" :color="t.amount < 0 ? 'danger' : 'success'" class="font-bold">
          {{ formatCurrency(t.amount) }}
        </ion-note>
      </ion-item>

      <ion-item v-if="transactions.length === 0" lines="none" class="bg-transparent">
        <ion-label class="ion-text-center text-gray-500 text-sm py-4">
          <p>No hay transacciones recientes</p>
        </ion-label>
      </ion-item>
    </ion-list>
  </div>
</template>

<script setup lang="ts">
import { IonList, IonItem, IonLabel, IonNote, IonListHeader } from '@ionic/vue';

const props = defineProps<{
  transactions: Array<{
    id: string
    date: string
    category: string
    amount: number
    description: string
  }>
}>()

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount)
}
</script>

<style scoped>
.transaction-container {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
}

ion-list {
  background: transparent;
  padding-top: 0;
  padding-bottom: 0;
}

ion-list-header {
  --background: transparent;
  --color: #a1a1aa;
  min-height: 40px;
}

ion-item {
  --background: transparent;
  --color: white;
  --padding-start: 16px;
  --inner-padding-end: 16px;
}

.transaction-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.transaction-item:last-child {
  border-bottom: none;
}
</style>
