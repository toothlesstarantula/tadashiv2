<template>
  <ion-page>
    <ion-menu content-id="main-content" style="--background: #18181b;">
      <ion-header class="ion-no-border">
        <ion-toolbar style="--background: #18181b; --color: white; --min-height: 60px;">
          <div class="flex items-center justify-between px-4 py-2">
            <div class="flex items-center gap-2">
              <img :src="tadashiBlue" alt="Tadashi" class="w-8 h-8 rounded-xl shadow-sm" />
              <span class="text-xl font-bold text-white tracking-wide">Tadashi</span>
            </div>
            <ion-menu-toggle>
              <ion-button fill="clear" color="medium" size="small">
                <ion-icon slot="icon-only" :icon="gridOutline" class="text-lg"></ion-icon>
              </ion-button>
            </ion-menu-toggle>
          </div>
        </ion-toolbar>
      </ion-header>
      
      <ion-content class="ion-padding" style="--background: #18181b; --color: white;">
        <ion-button expand="block" @click="startNewConversation" class="ion-margin-bottom mb-6 shadow-none" color="medium" style="--background: #27272a; --color: white; --box-shadow: none; margin: 0 0 1.5rem 0;">
          <ion-icon slot="start" :icon="add"></ion-icon>
          Nueva tarea
        </ion-button>

        <ion-searchbar v-model="conversationSearch" placeholder="Buscar conversación..." :debounce="500" class="custom-searchbar mb-4" style="--background: #27272a; --color: white; --placeholder-color: #9ca3af; --icon-color: #9ca3af; --border-radius: 9999px; padding-inline: 0;"></ion-searchbar>

        <ion-list style="background: transparent; --background: transparent;">
          <ion-list-header style="--background: transparent; --color: #9ca3af; min-height: 30px; padding-left: 0.5rem; margin-bottom: 0.25rem;">
            <ion-label class="text-xs font-medium text-gray-400 uppercase tracking-wider m-0">Conversaciones</ion-label>
          </ion-list-header>

          <ion-item v-for="conv in conversations" :key="conv.id" button @click="openConversation(conv.id)" :detail="false" class="history-item rounded-lg mb-1" style="--background: transparent; --min-height: 40px; --color: white; --padding-start: 0.5rem; --inner-padding-end: 0.5rem;">
            <ion-label class="my-1">
              <h2 class="text-sm text-gray-300 font-normal truncate">{{ conv.title }}</h2>
              <p class="text-[10px] text-gray-500">{{ formatDate(conv.updatedAt) }}</p>
            </ion-label>
            <ion-button slot="end" fill="clear" color="medium" size="small" @click.stop="deleteConversation(conv.id)" class="h-6 w-6 min-h-0 m-0">
              <ion-icon slot="icon-only" :icon="trash" class="text-sm"></ion-icon>
            </ion-button>
          </ion-item>
          
          <ion-item v-if="conversations.length === 0" lines="none" style="--background: transparent; --color: white;">
            <ion-label class="ion-text-center">
              <p class="text-sm text-gray-500">No hay conversaciones</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-list style="background: transparent; --background: transparent;">
          <ion-list-header style="--background: transparent; --color: #9ca3af; min-height: 30px; padding-left: 0.5rem; margin-bottom: 0.25rem;">
            <ion-label class="text-xs font-medium text-gray-400 uppercase tracking-wider m-0">Proyectos</ion-label>
          </ion-list-header>

          <ion-item button :detail="false" class="history-item rounded-lg mb-1" style="--background: transparent; --min-height: 40px; --color: white; --padding-start: 0.5rem; --inner-padding-end: 0.5rem;">
            <ion-label class="my-1">
              <h2 class="text-sm text-gray-300 font-normal">Finanzas</h2>
            </ion-label>
          </ion-item>
          <ion-item button :detail="false" class="history-item rounded-lg mb-1" style="--background: transparent; --min-height: 40px; --color: white; --padding-start: 0.5rem; --inner-padding-end: 0.5rem;">
            <ion-label class="my-1">
              <h2 class="text-sm text-gray-300 font-normal">Salud</h2>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
      
      <ion-footer class="ion-no-border">
        <ion-toolbar class="border-t border-gray-800" style="--background: #18181b; --color: white;">
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3 overflow-hidden">
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {{ auth.user?.name?.charAt(0).toUpperCase() || 'U' }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-medium text-white truncate">{{ auth.user?.name || 'Usuario' }}</span>
                <span class="text-xs text-gray-500 truncate">Plan Gratuito</span>
              </div>
            </div>
            <div class="flex items-center">
              <ion-button fill="clear" color="medium" size="small">
                <ion-icon slot="icon-only" :icon="settingsOutline"></ion-icon>
              </ion-button>
              <ion-button fill="clear" color="medium" size="small" @click="handleLogout">
                <ion-icon slot="icon-only" :icon="logOut"></ion-icon>
              </ion-button>
            </div>
          </div>
        </ion-toolbar>
      </ion-footer>
    </ion-menu>

    <div class="ion-page" id="main-content">
      <ion-header :translucent="true" class="border-b border-gray-800">
        <ion-toolbar class="bg-black" style="--background: #000000; --color: white; --min-height: 60px;">
          <ion-buttons slot="start">
            <ion-menu-toggle>
              <ion-button fill="clear" color="medium" size="small" class="ml-2">
                <ion-icon slot="icon-only" :icon="gridOutline" class="text-lg text-gray-400 hover:text-white transition-colors"></ion-icon>
              </ion-button>
            </ion-menu-toggle>
          </ion-buttons>
          <ion-buttons slot="end" class="mr-2">
            <div class="flex items-center gap-3">
              <span class="font-bold text-xl text-white">Tadashi</span>
              <img :src="tadashiBlue" alt="Tadashi" class="w-8 h-8 rounded-md" />
            </div>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
  
      <ion-content :fullscreen="true" class="ion-padding bg-black" ref="contentRef" style="--background: #000000;">
        <!-- Empty State / Hero -->
        <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center px-4 max-w-lg mx-auto">
          <h2 class="text-3xl font-medium text-white text-center mb-8">¿Qué puedo hacer por ti?</h2>
          
          <!-- Hero Input Card -->
          <div class="w-full bg-[#1e1e1e] rounded-3xl p-4 mb-8 border border-gray-800 shadow-lg relative">
            <ion-textarea
              v-model="input"
              placeholder="Asigna una tarea o pregunta algo..."
              :auto-grow="true"
              :rows="3"
              class="custom-textarea-hero text-lg text-gray-200 bg-transparent border-none focus:outline-none w-full"
              style="--background: transparent; --padding-start: 0;"
              @keydown.enter.prevent="handleSubmit"
            ></ion-textarea>
            
            <div class="flex justify-between items-center mt-4">
              <div class="flex gap-2">
                <ion-button fill="clear" size="small" color="medium" class="hover:bg-gray-800 rounded-full w-8 h-8 p-0" style="--padding-start: 0; --padding-end: 0;">
                  <ion-icon slot="icon-only" :icon="add" class="text-xl"></ion-icon>
                </ion-button>
                <ion-button fill="clear" size="small" color="medium" class="hover:bg-gray-800 rounded-full w-8 h-8 p-0" style="--padding-start: 0; --padding-end: 0;">
                  <ion-icon slot="icon-only" :icon="attach" class="text-xl"></ion-icon>
                </ion-button>
              </div>
              
              <div class="flex gap-2 items-center">
                <ion-button fill="clear" @click="toggleSpeechRecognition" :color="isListening ? 'danger' : 'medium'" class="rounded-full w-10 h-10 p-0">
                  <ion-icon slot="icon-only" :icon="mic" class="text-xl"></ion-icon>
                </ion-button>
                <ion-button 
                  @click="handleSubmit" 
                  :disabled="!input.trim() || isStreaming"
                  class="rounded-full w-10 h-10 m-0"
                  shape="round"
                  color="light"
                  style="--border-radius: 50%; width: 40px; height: 40px;"
                >
                  <ion-icon slot="icon-only" :icon="arrowUp" class="text-xl"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>
          
          <!-- Suggestions Grid -->
          <div class="grid grid-cols-2 gap-3 w-full">
            <button 
              v-for="s in suggestions" 
              :key="s.label" 
              @click="handleSuggestion(s.prompt)"
              class="bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-gray-800 rounded-xl p-3 flex items-center gap-3 transition-colors text-left"
            >
              <ion-icon :icon="getIcon(s.icon)" :class="s.color" class="text-xl"></ion-icon>
              <span class="text-gray-300 font-medium text-sm">{{ s.label }}</span>
            </button>
          </div>
        </div>
  
        <!-- Active Chat State -->
        <div v-else class="chat-container pb-24">
          <div v-for="msg in messages" :key="msg.id" class="message-wrapper animate-fade-in-up" :class="msg.role">
            <div class="message-content w-full flex" :class="{'justify-end': msg.role === 'user'}">
              <div v-if="msg.role === 'assistant'" class="assistant-avatar mr-2 flex-shrink-0 self-end">
                <img :src="tadashiBlue" alt="AI" class="w-8 h-8 rounded-lg" />
              </div>
              
              <div 
                class="message-bubble max-w-[85%] p-4 shadow-sm relative group" 
                :class="[
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-none ml-auto' 
                    : 'bg-[#27272a] text-gray-200 rounded-2xl rounded-bl-none border border-gray-800'
                ]"
              >
                <div v-if="getMessageText(msg)" class="whitespace-pre-wrap text-sm leading-relaxed">{{ getMessageText(msg) }}</div>
                
                <!-- Tools Rendering -->
                <div v-if="msg.tools && msg.tools.length > 0" class="tools-container mt-4 space-y-3">
                  <div v-for="tool in getToolCapsules(msg)" :key="tool.id" class="tool-item">
                    
                    <!-- Loading State -->
                    <div v-if="tool.state === 'calling'" class="tool-loading flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                      <div class="flex space-x-1">
                        <div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
                        <div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                        <div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                      </div>
                      <span class="text-xs text-gray-400 font-mono">Ejecutando {{ tool.name }}...</span>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="tool.state === 'error'" class="tool-error flex items-center gap-2 text-red-400 text-xs p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                      <ion-icon :icon="warning" class="text-lg"></ion-icon>
                      <span>{{ tool.errorMessage }}</span>
                    </div>

                    <!-- Success State -->
                    <div v-else-if="tool.state === 'done'" class="tool-result animate-fade-in-up">
                      <!-- Dynamic Component Rendering based on tool name -->
                      <TransactionTable 
                        v-if="tool.name === 'getExpenseSummary' && tool.result?.transactions" 
                        :transactions="tool.result.transactions" 
                      />
                      
                      <StatCard 
                        v-else-if="tool.name === 'getBalance'"
                        title="Balance Actual"
                        :value="tool.result.currentBalance"
                        type="currency"
                        icon="wallet"
                      />

                      <NutritionCard
                        v-else-if="tool.name === 'getDailyNutrition'"
                        :calories="tool.result.calories"
                        :proteins="tool.result.proteins"
                        :carbs="tool.result.carbs"
                        :fats="tool.result.fats"
                      />

                      <NutritionChart
                        v-else-if="tool.name === 'getNutritionTrend'"
                        :data="tool.result"
                      />

                      <div v-else-if="tool.result?.message" class="simple-result flex items-center gap-2 text-green-400 text-sm p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                        <ion-icon :icon="checkmarkCircle"></ion-icon>
                        {{ tool.result.message }}
                      </div>
                      
                      <!-- Fallback for other tools -->
                      <div v-else class="text-[10px] text-gray-500 font-mono overflow-x-auto p-3 bg-black/40 rounded-xl border border-white/5">
                        <pre>{{ JSON.stringify(tool.result, null, 2) }}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="isStreaming" class="typing-indicator flex items-center gap-3 text-gray-500 text-sm ml-4 mt-2 bg-[#27272a] self-start px-4 py-3 rounded-2xl rounded-bl-none w-fit border border-gray-800">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
            </div>
            <span class="text-xs font-medium tracking-wide">Pensando...</span>
          </div>
        </div>
      </ion-content>
  
      <!-- Floating Input Bar (Active State) -->
      <div v-if="messages.length > 0" class="fixed bottom-0 left-0 right-0 bg-[#000000] border-t border-gray-900 p-2 pb-6 backdrop-blur-md bg-opacity-90 z-10">
        <div class="max-w-3xl mx-auto flex items-end gap-2 bg-[#1e1e1e] rounded-3xl p-1.5 border border-gray-800">
          <div class="h-10 w-10 flex items-center justify-center">
            <ion-button fill="clear" size="small" color="medium" class="rounded-full w-8 h-8 p-0 m-0">
               <ion-icon slot="icon-only" :icon="add" class="text-xl"></ion-icon>
            </ion-button>
          </div>
          
          <ion-textarea
              v-model="input"
              placeholder="Escribe un mensaje..."
              :auto-grow="true"
              :rows="1"
              class="custom-textarea-floating flex-1 text-gray-200 bg-transparent border-none focus:outline-none py-2.5"
              style="--background: transparent; --padding-start: 0; --padding-end: 0; max-height: 120px; overflow-y: auto; margin-bottom: 1px;"
              @keydown.enter.prevent="handleSubmit"
          ></ion-textarea>
          
          <ion-button fill="clear" @click="toggleSpeechRecognition" :color="isListening ? 'danger' : 'medium'" class="rounded-full w-10 h-10 m-0">
              <ion-icon slot="icon-only" :icon="mic" class="text-xl"></ion-icon>
          </ion-button>
            
          <ion-button 
              @click="handleSubmit" 
              :disabled="!input.trim() || isStreaming"
              class="rounded-full w-10 h-10 m-0"
              shape="round"
              color="light"
              style="--border-radius: 50%; width: 40px; height: 40px;"
          >
              <ion-icon slot="icon-only" :icon="arrowUp" class="text-xl"></ion-icon>
          </ion-button>
        </div>
      </div>
  
      <ion-toast
        :is-open="!!speechError"
        :message="speechError || ''"
        :duration="3000"
        @didDismiss="speechError = null"
        color="danger"
      ></ion-toast>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, 
  IonButtons, IonButton, IonIcon, IonMenu, IonMenuButton, IonList, 
  IonItem, IonLabel, IonTextarea, IonSpinner, IonAvatar, 
  IonListHeader, IonSearchbar, menuController, IonToast, IonMenuToggle
} from '@ionic/vue'
import { 
  add, trash, logOut, send, mic, wallet, warning, checkmarkCircle,
  barChart, cafe, fitness, attach, arrowUp, menuOutline, settingsOutline, gridOutline
} from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { Capacitor } from '@capacitor/core'
import type { UIMessage } from 'ai'
import TransactionTable from '@/components/chat/TransactionTable.vue'
import StatCard from '@/components/chat/StatCard.vue'
import NutritionCard from '@/components/chat/NutritionCard.vue'
import NutritionChart from '@/components/chat/NutritionChart.vue'
import tadashiBlue from '@/assets/tadashi_blue.png'

const auth = useAuthStore()
const router = useRouter()
const contentRef = ref<HTMLElement | null>(null)

// Types
type ToolState = 'calling' | 'done' | 'error'

type ToolCapsule = {
  id: string
  name: string
  state: ToolState
  args: any
  result?: any
  errorMessage?: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  tools: ToolCapsule[]
  createdAt: string
  meta?: {
    latencyMs?: number
    finishedAt?: string
    tokensApprox?: number
  }
}

type ConversationSummary = {
  id: string
  title: string
  updatedAt: string
}

// State
const messages = ref<ChatMessage[]>([])
const wireMessages = ref<UIMessage[]>([])
const input = ref('')
const isStreaming = ref(false)
const isListening = ref(false)
const speechError = ref<string | null>(null)
const conversations = ref<ConversationSummary[]>([])
const conversationSearch = ref('')
const activeConversationId = ref<string | null>(null)
const inputBeforeSpeech = ref('')
let recognition: any = null

// Constants
const suggestions = [
  { label: 'Gasto', icon: 'wallet', prompt: 'Registrar un gasto de 500 pesos en comida', color: 'text-green-400' },
  { label: 'Comida', icon: 'cafe', prompt: 'Me comí una ensalada de pollo', color: 'text-orange-400' },
  { label: 'Entreno', icon: 'fitness', prompt: 'Hice 30 mins de cardio', color: 'text-blue-400' },
  { label: 'Resumen', icon: 'barChart', prompt: 'Dame un resumen de mis gastos', color: 'text-purple-400' },
]

// Helper functions
const getIcon = (name: string) => {
  const map: Record<string, string> = {
    wallet, cafe, fitness, barChart
  }
  return map[name] || checkmarkCircle
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const getLoadingText = (toolName: string) => {
  const texts: Record<string, string> = {
    createTransaction: 'Registrando gasto...',
    getBalance: 'Consultando saldo...',
    getExpenseSummary: 'Analizando gastos...',
    logMeal: 'Guardando comida...',
    getDailyNutrition: 'Calculando macros...',
    logWorkout: 'Registrando entreno...',
  }
  return texts[toolName] || `Usando ${toolName}...`
}

const getMessageText = (msg: ChatMessage) => {
  const text = msg.text || ''
  if (!text.trim()) return ''
  // Hide text if tool result covers it (simplified logic)
  return text
}

const getToolCapsules = (msg: ChatMessage) => {
  // Simplified grouping logic
  return msg.tools.filter(t => t.state !== 'calling' || msg.tools.indexOf(t) === msg.tools.length - 1)
}

function createId() {
  return Math.random().toString(36).slice(2)
}

// Actions
async function handleLogout() {
  await auth.signOut()
  router.replace('/login')
}

async function fetchConversations() {
  try {
    const q = conversationSearch.value.trim()
    const params = q ? `?q=${encodeURIComponent(q)}` : ''
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/conversations${params}`, {
      headers: authClientHeaders()
    })
    if (!response.ok) return
    const data = await response.json()
    conversations.value = data.conversations ?? []
  } catch (error) {
    console.error('Error fetching conversations', error)
  }
}

function authClientHeaders() {
    const token = localStorage.getItem('auth_token')
    return {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
    }
}

async function openConversation(id: string) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/conversations/${id}`, {
      headers: authClientHeaders()
    })
    if (!response.ok) return
    const data = await response.json()

    activeConversationId.value = data.id
    
    // Transform messages
    const convMessages = (data.messages || []) as any[]
    messages.value = convMessages.map(m => ({
      id: m.id,
      role: m.role === 'assistant' ? 'assistant' : 'user',
      text: m.text,
      tools: (m.toolCalls || []).map((tc: any) => ({
        id: tc.id,
        name: tc.name,
        state: tc.state || (tc.result?.error ? 'error' : 'done'),
        args: tc.args,
        result: tc.result,
        errorMessage: tc.result?.message
      })),
      createdAt: m.createdAt
    }))

    // Rebuild wire messages
    wireMessages.value = convMessages.map(m => ({
      id: createId(),
      role: m.role,
      parts: [{ type: 'text', text: m.text }]
    } as any))
    
    menuController.close('main-content')
  } catch (error) {
    console.error('Error opening conversation', error)
  }
}

async function deleteConversation(id: string) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/conversations/${id}`, {
      method: 'DELETE',
      headers: authClientHeaders()
    })
    if (response.ok) {
      if (activeConversationId.value === id) startNewConversation()
      await fetchConversations()
    }
  } catch (error) {
    console.error('Error deleting conversation', error)
  }
}

function startNewConversation() {
  activeConversationId.value = null
  messages.value = []
  wireMessages.value = []
  input.value = ''
  menuController.close('main-content')
}

// Chat Logic
async function sendToServer(requestMessages: UIMessage[], assistantMessage: ChatMessage) {
  isStreaming.value = true
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/chat`, {
      method: 'POST',
      headers: authClientHeaders(),
      body: JSON.stringify({ messages: requestMessages, conversationId: activeConversationId.value }),
    })

    if (!response.body) return

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      let newlineIndex = buffer.indexOf('\n')
      
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        
        if (line.length > 0) {
          const prefix = line[0]
          const payload = line.slice(2)
          
          if (prefix === '0') { // Text
            try {
              assistantMessage.text += JSON.parse(payload)
            } catch {}
          } else if (prefix === '9') { // Tool Call
             try {
              const toolCall = JSON.parse(payload)
              let tool = assistantMessage.tools.find(t => t.id === toolCall.toolCallId)
              if (!tool) {
                assistantMessage.tools.push({
                  id: toolCall.toolCallId,
                  name: toolCall.toolName,
                  state: 'calling',
                  args: toolCall.args
                })
              }
             } catch {}
          } else if (prefix === 'a') { // Tool Result
             try {
              const toolResult = JSON.parse(payload)
              let tool = assistantMessage.tools.find(t => t.id === toolResult.toolCallId)
              if (tool) {
                tool.state = 'done'
                tool.result = toolResult.result
                if (toolResult.result?.error) {
                  tool.state = 'error'
                  tool.errorMessage = toolResult.result.message
                }
              }
             } catch {}
          } else if (prefix === 'u') { // Usage/Meta
             try {
               const event = JSON.parse(payload)
               if (event.conversationId) {
                 activeConversationId.value = event.conversationId
                 fetchConversations()
               }
             } catch {}
          }
        }
        newlineIndex = buffer.indexOf('\n')
      }
    }
  } catch (error) {
    console.error('Error sending message', error)
  } finally {
    isStreaming.value = false
    scrollToBottom()
  }
}

const handleSubmit = async () => {
  if (!input.value.trim() || isStreaming.value) return
  
  const userText = input.value
  input.value = ''
  
  const userMessage: ChatMessage = {
    id: createId(),
    role: 'user',
    text: userText,
    tools: [],
    createdAt: new Date().toISOString()
  }
  
  const assistantMessage: ChatMessage = {
    id: createId(),
    role: 'assistant',
    text: '',
    tools: [],
    createdAt: new Date().toISOString()
  }
  
  messages.value.push(userMessage)
  messages.value.push(assistantMessage)
  
  const userWire = {
    id: createId(),
    role: 'user',
    parts: [{ type: 'text', text: userText }]
  } as any
  
  const requestMessages = [...wireMessages.value, userWire]
  
  await sendToServer(requestMessages, assistantMessage)
  
  wireMessages.value.push(userWire)
}

function handleSuggestion(prompt: string) {
  input.value = prompt
  handleSubmit()
}

function scrollToBottom() {
  const content = document.querySelector('ion-content')
  content?.scrollToBottom(300)
}

async function toggleSpeechRecognition() {
  const isNative = Capacitor.isNativePlatform()

  if (isListening.value) {
    if (isNative) {
      try {
        await SpeechRecognition.stop()
      } catch (e) {
        console.error('Error stopping speech recognition', e)
      }
    } else {
      recognition?.stop()
    }
    isListening.value = false
    return
  }

  inputBeforeSpeech.value = input.value

  if (isNative) {
    try {
      const { available } = await SpeechRecognition.available()
      if (!available) {
        speechError.value = 'Reconocimiento de voz no disponible'
        setTimeout(() => speechError.value = null, 3000)
        return
      }

      const { speechRecognition } = await SpeechRecognition.checkPermissions()
      if (speechRecognition !== 'granted') {
        const { speechRecognition: req } = await SpeechRecognition.requestPermissions()
        if (req !== 'granted') {
          speechError.value = 'Permiso de micrófono denegado'
          setTimeout(() => speechError.value = null, 3000)
          return
        }
      }

      isListening.value = true
      speechError.value = null

      await SpeechRecognition.start({
        language: "es-ES",
        maxResults: 1,
        prompt: "Hable ahora",
        partialResults: true,
        popup: false,
      })

    } catch (e) {
      console.error('Error starting speech recognition', e)
      speechError.value = 'Error al iniciar reconocimiento de voz'
      isListening.value = false
      setTimeout(() => speechError.value = null, 3000)
    }
  } else {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      speechError.value = 'Reconocimiento de voz no soportado en este navegador'
      setTimeout(() => speechError.value = null, 3000)
      return
    }

    recognition = new SpeechRecognitionAPI()
    recognition.lang = 'es-ES'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      isListening.value = true
      speechError.value = null
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      input.value += (input.value ? ' ' : '') + transcript
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      isListening.value = false
      
      if (event.error === 'not-allowed') {
        speechError.value = 'Permiso denegado: Habilita el micrófono'
      } else if (event.error === 'service-not-allowed') {
        speechError.value = 'Servicio no disponible'
      } else if (event.error === 'no-speech') {
        return
      } else {
        speechError.value = `Error: ${event.error}`
      }
      setTimeout(() => speechError.value = null, 4000)
    }

    recognition.onend = () => {
      isListening.value = false
    }

    recognition.start()
  }
}

onMounted(() => {
  fetchConversations()
  
  if (Capacitor.isNativePlatform()) {
    SpeechRecognition.addListener('partialResults', (data: any) => {
      if (data.matches && data.matches.length > 0) {
        const transcript = data.matches[0]
        const prefix = inputBeforeSpeech.value ? inputBeforeSpeech.value + ' ' : ''
        input.value = prefix + transcript
      }
    })
  }
})

watch(conversationSearch, fetchConversations)
</script>

<style scoped>
.avatar-placeholder {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #8b5cf6, #3b82f6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

.chat-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 16px;
  line-height: 1.5;
  color: white;
}

.message-bubble.user {
  background: #3b82f6; /* Blue-500 */
  border-bottom-right-radius: 4px;
  color: white;
}

.message-bubble.assistant {
  background: #27272a; /* Zinc-800 */
  border-bottom-left-radius: 4px;
  color: #e4e4e7; /* Zinc-200 */
}

ion-content {
  --background: #000000;
}

ion-item {
  --background: transparent;
  --color: white;
}
</style>
