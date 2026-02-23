<script setup lang="ts">
const props = defineProps<{
  balance: number
  currency: string
}>()

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: props.currency
  }).format(amount)
}
</script>

<template>
  <div class="inline-flex flex-col p-6 bg-gradient-to-br from-[#18181b] to-[#27272a] rounded-2xl border border-white/10 shadow-lg min-w-[240px]">
    <div class="text-sm text-gray-400 mb-1 font-medium tracking-wide uppercase">Saldo Actual</div>
    <div class="text-3xl font-bold text-white tracking-tight">
      {{ formatCurrency(balance) }}
    </div>
    <div class="mt-4 flex items-center gap-2 text-xs text-gray-500">
      <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
      Actualizado ahora
    </div>
  </div>
</template>