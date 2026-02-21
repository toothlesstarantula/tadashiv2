<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const messages = ref<{ role: 'user' | 'assistant', content: string, toolCalls?: any[] }[]>([])
const input = ref('')
const loading = ref(false)

async function sendMessage() {
  if (!input.value.trim() || loading.value) return
  
  const userMessage = input.value
  messages.value.push({ role: 'user', content: userMessage })
  input.value = ''
  loading.value = true
  
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    })
    const data = await res.json()
    messages.value.push({ 
      role: 'assistant', 
      content: data.response,
      toolCalls: data.toolCalls
    })
  } catch (e) {
    console.error(e)
    messages.value.push({ 
      role: 'assistant', 
      content: "Sorry, something went wrong. Please try again."
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <!-- Sidebar -->
    <div class="w-64 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col hidden md:flex">
      <div class="mb-6">
        <h1 class="font-bold text-xl px-2">Tadashi</h1>
      </div>
      
      <UButton variant="soft" color="neutral" block class="mb-4" icon="i-heroicons-plus">
        New Chat
      </UButton>
      
      <div class="flex-1 overflow-y-auto">
        <!-- History list here -->
        <div class="text-sm text-gray-500 px-2">No history yet</div>
      </div>
      
      <div class="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-2 px-2">
          <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold">
            {{ auth.user?.name?.charAt(0).toUpperCase() }}
          </div>
          <div class="text-sm font-medium truncate flex-1">
            {{ auth.user?.name }}
          </div>
          <UButton icon="i-heroicons-arrow-right-start-on-rectangle" color="neutral" variant="ghost" size="sm" @click="auth.signOut()" />
        </div>
      </div>
    </div>
    
    <!-- Main Chat -->
    <div class="flex-1 flex flex-col w-full relative">
      <div class="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center opacity-50">
          <div class="text-6xl mb-6">👋</div>
          <h2 class="text-2xl font-semibold mb-2">How can I help you today?</h2>
          <p class="text-gray-500">I can help with finance, nutrition, and fitness tracking.</p>
        </div>
        
        <div v-for="(msg, i) in messages" :key="i" class="flex flex-col gap-2 max-w-3xl mx-auto w-full">
          <!-- User Message -->
          <div v-if="msg.role === 'user'" class="self-end max-w-[80%]">
            <div class="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tr-sm px-4 py-3">
              {{ msg.content }}
            </div>
          </div>
          
          <!-- Assistant Message -->
          <div v-else class="self-start w-full space-y-4">
            <!-- Tool Calls (Thought/Action) -->
            <div v-if="msg.toolCalls?.length" class="space-y-3">
              <div v-for="tool in msg.toolCalls" :key="tool.toolName" class="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-sm">
                <div class="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium mb-2">
                  <span class="i-heroicons-cog-6-tooth w-4 h-4"></span>
                  <span>Used {{ tool.toolName }}</span>
                </div>
                <!-- Render structured output if needed -->
                <pre class="text-xs overflow-x-auto text-gray-600 dark:text-gray-400 font-mono bg-white/50 dark:bg-black/20 p-2 rounded">{{ tool.args }}</pre>
              </div>
            </div>
            
            <div class="prose dark:prose-invert max-w-none">
              {{ msg.content }}
            </div>
          </div>
        </div>
        
        <div v-if="loading" class="max-w-3xl mx-auto w-full">
           <div class="flex gap-2 items-center text-gray-400 text-sm animate-pulse">
             <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
             <span class="w-2 h-2 bg-gray-400 rounded-full delay-75"></span>
             <span class="w-2 h-2 bg-gray-400 rounded-full delay-150"></span>
           </div>
        </div>
      </div>
      
      <!-- Input Area -->
      <div class="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-white via-white to-transparent dark:from-gray-950 dark:via-gray-950 pt-10">
        <div class="max-w-3xl mx-auto w-full relative">
          <form @submit.prevent="sendMessage" class="relative bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm focus-within:ring-2 ring-primary-500/20 transition-all">
            <UTextarea 
              v-model="input" 
              placeholder="Ask anything about your finances, meals, or workouts..." 
              :rows="1" 
              autoresize
              :ui="{ base: 'border-0 bg-transparent focus:ring-0 px-4 py-3 min-h-[56px] max-h-48' }"
              @keydown.enter.prevent="sendMessage"
            />
            <div class="absolute bottom-2 right-2 flex items-center gap-2">
               <UButton 
                type="submit" 
                icon="i-heroicons-paper-airplane" 
                color="primary" 
                variant="solid" 
                size="sm"
                :disabled="!input.trim() || loading"
              />
            </div>
          </form>
          <div class="text-center mt-2 text-xs text-gray-400">
            Tadashi can make mistakes. Please verify important information.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
