<script setup lang="ts">

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

<template>
  <div class="w-full max-w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18181b] shadow-sm">
    <div class="overflow-x-auto">
      <table class="w-full max-w-full text-sm text-left">
        <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#27272a]">
          <tr>
            <th class="px-4 py-3">Fecha</th>
            <th class="px-4 py-3">Concepto</th>
            <th class="px-4 py-3 text-right">Monto</th>
            <th class="px-4 py-3">Categoría</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in transactions" :key="t.id" class="border-b dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-[#27272a]/50 transition-colors">
            <td class="px-4 py-3 font-medium">{{ t.date }}</td>
            <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ t.description || '-' }}</td>
            <td class="px-4 py-3 text-right font-semibold" :class="t.amount < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'">
              {{ formatCurrency(t.amount) }}
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {{ t.category }}
              </span>
            </td>
          </tr>
          <tr v-if="transactions.length === 0">
            <td colspan="4" class="px-4 py-8 text-center text-gray-500">
              No hay transacciones recientes
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
