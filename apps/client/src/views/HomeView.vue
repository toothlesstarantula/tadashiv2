<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { UIMessage } from 'ai'
import TransactionTable from '@/components/chat/TransactionTable.vue'
import StatCard from '@/components/chat/StatCard.vue'
import NutritionCard from '@/components/chat/NutritionCard.vue'
import NutritionChart from '@/components/chat/NutritionChart.vue'
import tadashiBlue from '@/assets/tadashi_blue.png'

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

const auth = useAuthStore()
const scrollContainer = ref<HTMLElement | null>(null)
const isSidebarOpen = ref(true)

const messages = ref<ChatMessage[]>([])
const wireMessages = ref<UIMessage[]>([])
const input = ref('')
const isStreaming = ref(false)
const isListening = ref(false)
const speechError = ref<string | null>(null)
let recognition: any = null

const toggleSpeechRecognition = () => {
  if (isListening.value) {
    recognition?.stop()
    isListening.value = false
    return
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    speechError.value = 'Navegador no soportado'
    setTimeout(() => speechError.value = null, 3000)
    return
  }

  recognition = new SpeechRecognition()
  recognition.lang = 'es-ES'
  recognition.continuous = false
  recognition.interimResults = false

  recognition.onstart = () => {
    isListening.value = true
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

type ConversationSummary = {
  id: string
  title: string
  updatedAt: string
}

const conversations = ref<ConversationSummary[]>([])
const conversationSearch = ref('')
const activeConversationId = ref<string | null>(null)

const estimateTokens = (text: string | undefined | null) => {
  if (!text) return 0
  const length = text.length
  if (!length) return 0
  return Math.max(1, Math.round(length / 4))
}

const suggestions = [
  { label: 'Registrar gasto', icon: 'i-heroicons-banknotes', prompt: 'Registrar un gasto de 500 pesos en comida' },
  { label: 'Añadir comida', icon: 'i-heroicons-cake', prompt: 'Me comí una ensalada de pollo' },
  { label: 'Registrar entreno', icon: 'i-heroicons-fire', prompt: 'Hice 30 mins de cardio' },
  { label: 'Ver resumen', icon: 'i-heroicons-chart-bar', prompt: 'Dame un resumen de mis gastos de esta semana' },
]

function createId() {
  return Math.random().toString(36).slice(2)
}

function makeUserWireMessage(text: string): UIMessage {
  return {
    id: createId(),
    role: 'user',
    parts: [
      {
        id: createId(),
        type: 'text',
        text,
      } as any,
    ],
  } as any
}

function makeAssistantWireMessage(text: string): UIMessage {
  return {
    id: createId(),
    role: 'assistant',
    parts: [
      {
        id: createId(),
        type: 'text',
        text,
      } as any,
    ],
  } as any
}

async function sendToServer(requestMessages: UIMessage[], assistantMessage: ChatMessage) {
  isStreaming.value = true
  const startTime = Date.now()

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ messages: requestMessages, conversationId: activeConversationId.value }),
    })

    if (!response.body) {
      return
    }

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

          if (prefix === '0') {
            try {
              const textChunk = JSON.parse(payload) as string
              assistantMessage.text += textChunk
            } catch {
            }
          } else if (prefix === '9') {
            try {
              const toolCall = JSON.parse(payload) as {
                toolCallId: string
                toolName: string
                args: unknown
              }

              let tool = assistantMessage.tools.find(t => t.id === toolCall.toolCallId)
              if (!tool) {
                tool = {
                  id: toolCall.toolCallId,
                  name: toolCall.toolName,
                  state: 'calling',
                  args: toolCall.args,
                }
                assistantMessage.tools.push(tool)
              } else {
                tool.state = 'calling'
                tool.args = toolCall.args
              }
            } catch {
            }
          } else if (prefix === 'a') {
            try {
              const toolResult = JSON.parse(payload) as {
                toolCallId: string
                toolName: string
                result: any
              }

              let tool = assistantMessage.tools.find(t => t.id === toolResult.toolCallId)
              if (!tool) {
                tool = {
                  id: toolResult.toolCallId,
                  name: toolResult.toolName,
                  state: 'done',
                  args: undefined,
                }
                assistantMessage.tools.push(tool)
              }

              if (toolResult.result && toolResult.result.error) {
                tool.state = 'error'
                tool.errorMessage = toolResult.result.message || 'Error al ejecutar la tool'
                tool.result = toolResult.result
              } else {
                tool.state = 'done'
                tool.result = toolResult.result
              }
            } catch {
            }
          } else if (prefix === 'u') {
            try {
              const usageEvent = JSON.parse(payload) as any

              const newConversationId = usageEvent?.conversationId as string | undefined
              if (newConversationId) {
                activeConversationId.value = newConversationId
                fetchConversations()
              }

              const usage =
                usageEvent?.payload?.usage ??
                usageEvent?.usage ??
                null

              if (usage) {
                const total =
                  usage.totalTokens ??
                  usage.total ??
                  usage.total_tokens ??
                  0

                const meta = assistantMessage.meta || {}
                assistantMessage.meta = {
                  ...meta,
                  tokensApprox: total || meta.tokensApprox,
                }
              }
            } catch {
            }
          }
        }

        newlineIndex = buffer.indexOf('\n')
      }
    }
  } catch (error) {
    console.error('Error sending chat message', error)
  } finally {
    const finishedAt = new Date().toISOString()
    const latencyMs = Date.now() - startTime
    const existingMeta = assistantMessage.meta || {}
    const hasTokens = typeof existingMeta.tokensApprox === 'number' && existingMeta.tokensApprox > 0

    assistantMessage.meta = {
      ...existingMeta,
      latencyMs,
      finishedAt,
      tokensApprox: hasTokens ? existingMeta.tokensApprox : estimateTokens(assistantMessage.text),
    }

    isStreaming.value = false
    await nextTick()
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
    createdAt: new Date().toISOString(),
    meta: {
      tokensApprox: estimateTokens(userText),
    },
  }

  const assistantMessage: ChatMessage = {
    id: createId(),
    role: 'assistant',
    text: '',
    tools: [],
    createdAt: new Date().toISOString(),
  }

  messages.value.push(userMessage)
  messages.value.push(assistantMessage)

  const userWire = makeUserWireMessage(userText)
  const requestMessages = [...wireMessages.value, userWire]

  await sendToServer(requestMessages, assistantMessage)

  wireMessages.value.push(userWire)
  if (assistantMessage.text) {
    wireMessages.value.push(makeAssistantWireMessage(assistantMessage.text))
  }
}

function handleSuggestion(prompt: string) {
  input.value = prompt
  handleSubmit()
}

function scrollToBottom() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
  })
}

async function fetchConversations() {
  try {
    const q = conversationSearch.value.trim()
    const params = q ? `?q=${encodeURIComponent(q)}` : ''
    const response = await fetch(`http://localhost:3000/api/conversations${params}`, {
      credentials: 'include',
    })
    if (!response.ok) return
    const data = await response.json()
    conversations.value = data.conversations ?? []
  } catch (error) {
    console.error('Error fetching conversations', error)
  }
}

async function openConversation(id: string) {
  try {
    const response = await fetch(`http://localhost:3000/api/conversations/${id}`, {
      credentials: 'include',
    })
    if (!response.ok) return
    const data = await response.json()

    activeConversationId.value = data.id

    const convMessages = (data.messages || []) as {
      id: string
      role: 'user' | 'assistant' | 'system'
      text: string
      toolCalls?: any[]
      createdAt: string
    }[]

    messages.value = convMessages.map(m => ({
      id: m.id,
      role: m.role === 'assistant' ? 'assistant' : 'user',
      text: m.text,
      tools: (m.toolCalls || []).map((tc: any) => {
        const isError = tc.result && tc.result.error
        return {
          id: tc.id,
          name: tc.name,
          state: tc.state || (isError ? 'error' : 'done'),
          args: tc.args,
          result: tc.result,
          errorMessage: isError ? (tc.result.message || 'Error al ejecutar la tool') : tc.errorMessage,
        }
      }),
      createdAt: m.createdAt,
      meta: {
        tokensApprox: estimateTokens(m.text),
      },
    }))

    wireMessages.value = convMessages.map(m =>
      m.role === 'assistant' ? makeAssistantWireMessage(m.text) : makeUserWireMessage(m.text),
    )
  } catch (error) {
    console.error('Error loading conversation', error)
  }
}

async function deleteConversation(id: string) {
  if (!confirm('¿Eliminar esta conversación?')) return

  try {
    const response = await fetch(`http://localhost:3000/api/conversations/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (response.ok) {
      if (activeConversationId.value === id) {
        startNewConversation()
      }
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
}

watch(
  messages,
  async () => {
    await nextTick()
    scrollToBottom()
  },
  { deep: true },
)

watch(conversationSearch, () => {
  fetchConversations()
})

onMounted(() => {
  fetchConversations()
})

const getLoadingText = (toolName: string) => {
  switch (toolName) {
    case 'createTransaction':
      return 'Registrando tu gasto...'
    case 'getBalance':
      return 'Consultando tu saldo...'
    case 'getExpenseSummary':
      return 'Analizando tus gastos...'
    case 'updateTransaction':
      return 'Actualizando transacción...'
    case 'deleteTransaction':
      return 'Eliminando transacción...'
    case 'logMeal':
      return 'Guardando tu comida...'
    case 'getDailyNutrition':
      return 'Calculando calorías y macros...'
    case 'getNutritionTrend':
      return 'Generando gráfico de tendencias...'
    case 'logWorkout':
      return 'Registrando entrenamiento...'
    case 'searchTool':
      return 'Buscando información...'
    default:
      return `Usando ${toolName}...`
  }
}

const isEmpty = computed(() => messages.value.length === 0)

const getMessageText = (msg: ChatMessage) => {
  const text = msg.text || ''
  if (!text.trim()) return ''

  const hasExpenseSummaryTool = msg.tools.some(
    t => (t.name === 'getExpenseSummary' || t.name === 'deleteTransaction') && t.state === 'done' && t.result?.transactions,
  )

  if (!hasExpenseSummaryTool) return text

  const blocks = text.split('\n\n')
  if (blocks.length <= 1) return text

  const lastBlock = blocks[blocks.length - 1]
  if (!lastBlock) return text

  const trimmed = lastBlock.trim()
  return trimmed || text
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getToolCapsules = (msg: ChatMessage) => {
  if (!msg.tools.length) return []

  const grouped = new Map<string, ToolCapsule[]>()

  for (const tool of msg.tools) {
    const list = grouped.get(tool.name)
    if (list) {
      list.push(tool)
    } else {
      grouped.set(tool.name, [tool])
    }
  }

  const result: ToolCapsule[] = []

  for (const [, tools] of grouped) {
    const success = tools.find(t => t.state === 'done')
    if (success) {
      result.push(success)
      continue
    }

    const fallback = tools[tools.length - 1]
    if (fallback) {
      result.push(fallback)
    }
  }

  // Prioritize deleteTransaction: if present and successful, remove getExpenseSummary
  // This prevents showing stale data if the agent calls both in parallel
  const deleteTool = result.find(t => t.name === 'deleteTransaction' && t.state === 'done' && t.result?.transactions)
  if (deleteTool) {
    return result.filter(t => t.name !== 'getExpenseSummary')
  }

  return result
}

const isThinking = computed(() => isStreaming.value)
</script>

<template>
  <div class="flex h-screen bg-[#09090b] text-gray-200">
    <!-- Sidebar (overlay en mobile, fijo en desktop) -->
    <div 
      class="bg-[#18181b] border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
      :class="isSidebarOpen
        ? 'fixed inset-y-0 left-0 z-40 w-64 translate-x-0 opacity-100 md:static md:w-64'
        : 'fixed inset-y-0 left-0 z-40 w-64 -translate-x-full opacity-0 pointer-events-none md:static md:w-0 md:opacity-0 md:border-r-0'
      "
    >
      <div class="p-4 flex items-center justify-between min-w-[256px]">
        <div class="flex items-center gap-2 text-white text-xl tracking-wide font-medium">
          <img :src="tadashiBlue" alt="Tadashi" class="w-8 h-8 rounded-xl shadow-sm logo-pulse" />
          <span>Tadashi</span>
        </div>
        <UButton icon="i-heroicons-bars-3-bottom-left" color="neutral" variant="ghost" size="sm" @click="isSidebarOpen = false" />
      </div>

      <div class="px-3 py-2 min-w-[256px]">
        <UButton block color="neutral" variant="solid" class="justify-start bg-[#27272a] hover:bg-[#3f3f46] text-white border-none mb-4" @click="startNewConversation">
          <template #leading>
            <span class="i-heroicons-pencil-square w-5 h-5"></span>
          </template>
          Nueva tarea
        </UButton>

        <UInput
          v-model="conversationSearch"
          size="sm"
          placeholder="Buscar conversación..."
          class="mb-4 w-full search-input"
        />

        <div class="text-xs font-medium text-gray-500 uppercase px-2 mb-2">Conversaciones</div>
        <div class="space-y-1 mb-6 max-h-64 overflow-y-auto pr-1">
          <button
            v-for="conv in conversations"
            :key="conv.id"
            type="button"
            @click="openConversation(conv.id)"
            class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs conversation-item group"
            :class="conv.id === activeConversationId ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'"
          >
            <span class="truncate max-w-[140px] text-left">
              {{ conv.title }}
            </span>
            <span class="text-[10px] text-gray-500 ml-2 whitespace-nowrap group-hover:hidden">
              {{ formatDate(conv.updatedAt) }}
            </span>
            <UButton
              icon="i-heroicons-trash"
              size="xs"
              color="neutral"
              variant="ghost"
              class="hidden group-hover:flex ml-2 text-gray-300 hover:text-red-400 hover:bg-white/10 shrink-0"
              @click.stop="deleteConversation(conv.id)"
            />
          </button>
          <div v-if="!conversations.length" class="px-2 py-1 text-[11px] text-gray-500">
            No hay conversaciones aún
          </div>
        </div>

        <div class="text-xs font-medium text-gray-500 uppercase px-2 mb-2">Proyectos</div>
        <div class="space-y-1">
          <UButton block color="neutral" variant="ghost" class="justify-start text-gray-400 hover:text-white hover:bg-white/5">
            <template #leading><span class="i-heroicons-folder w-4 h-4"></span></template>
            Finanzas
          </UButton>
          <UButton block color="neutral" variant="ghost" class="justify-start text-gray-400 hover:text-white hover:bg-white/5">
            <template #leading><span class="i-heroicons-heart w-4 h-4"></span></template>
            Salud
          </UButton>
        </div>
      </div>

      <div class="mt-auto p-4 border-t border-white/5 min-w-[256px]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-linear-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
            {{ auth.user?.name?.charAt(0).toUpperCase() || 'U' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-white truncate">{{ auth.user?.name || 'Usuario' }}</div>
            <div class="text-xs text-gray-500 truncate">Plan Gratuito</div>
          </div>
          <UButton icon="i-heroicons-cog-6-tooth" color="neutral" variant="ghost" size="sm" />
        </div>
      </div>
    </div>

    <!-- Backdrop para cerrar sidebar al hacer click fuera (solo mobile) -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-30 bg-black/40 md:hidden"
      @click="isSidebarOpen = false"
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col relative h-full">
      
      <!-- Top Bar (Mobile only) -->
      <div class="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#18181b]">
        <UButton
          icon="i-heroicons-bars-3-bottom-left"
          color="neutral"
          variant="ghost"
          size="sm"
          class="hamburger-button"
          @click="isSidebarOpen = true"
        />
        <div class="flex items-center gap-2">
          <span class="text-lg text-white font-medium">Tadashi</span>
          <img :src="tadashiBlue" alt="Tadashi" class="w-8 h-8 rounded-xl shadow-sm" />
        </div>
      </div>

      <!-- Toggle Sidebar Button (Desktop only, visible when closed) -->
      <div class="hidden md:block absolute top-4 left-4 z-10" v-if="!isSidebarOpen">
         <UButton icon="i-heroicons-bars-3-bottom-left" color="neutral" variant="ghost" size="sm" @click="isSidebarOpen = true" />
      </div>

      <!-- Chat Area -->
      <div 
        ref="scrollContainer"
        class="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth"
        :class="{ 'flex flex-col items-center justify-center': isEmpty }"
      >
        <!-- Empty State -->
        <div v-if="isEmpty" class="w-full max-w-2xl mx-auto flex flex-col items-center animate-fade-in">
          <h1 class="text-4xl md:text-5xl text-white mb-12 text-center tracking-tight font-light">
            ¿Qué puedo hacer por ti?
          </h1>
          
          <!-- Input Box (Centered) -->
          <div class="w-full bg-[#27272a] rounded-3xl p-4 shadow-2xl border border-white/5 transition-all focus-within:ring-1 focus-within:ring-white/20 relative">
            <div v-if="speechError" class="absolute -top-14 left-0 right-0 flex justify-center z-50">
              <div class="bg-red-500/90 text-white text-sm px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-fade-in-up flex items-center gap-2">
                <span class="i-heroicons-exclamation-circle w-4 h-4"></span>
                {{ speechError }}
              </div>
            </div>
            <textarea
                v-model="input"
                rows="1"
                placeholder="Asigna una tarea o pregunta algo..."
                class="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 focus:outline-none resize-none py-3 text-lg max-h-48"
                @keydown.enter.prevent="handleSubmit"
              ></textarea>
            
            <div class="flex items-center justify-between mt-4 pt-2 border-t border-white/5">
              <div class="flex items-center gap-2">
                <UButton icon="i-heroicons-plus" color="neutral" variant="ghost" class="text-gray-400 hover:text-white rounded-full icon-button" />
                <UButton icon="i-heroicons-link" color="neutral" variant="ghost" class="text-gray-400 hover:text-white rounded-full icon-button" />
                <UButton icon="i-heroicons-puzzle-piece" color="neutral" variant="ghost" class="text-gray-400 hover:text-white rounded-full icon-button" />
              </div>
              <div class="flex items-center gap-2">
                 <UButton 
                  icon="i-heroicons-microphone" 
                  :color="isListening ? 'primary' : 'neutral'" 
                  variant="ghost" 
                  class="text-gray-400 hover:text-white rounded-full icon-button"
                  :class="{ 'text-blue-400 animate-pulse bg-blue-500/10': isListening }"
                  @click="toggleSpeechRecognition"
                 />
                 <UButton 
                  @click="handleSubmit"
                  icon="i-heroicons-arrow-up" 
                  color="neutral" 
                  variant="solid" 
                  class="rounded-full w-8 h-8 flex items-center justify-center transition-opacity send-button"
                  :class="{ 'opacity-50 cursor-not-allowed': !input.trim() }"
                  :disabled="!input.trim()"
                />
              </div>
            </div>
          </div>

          <!-- Suggestions -->
          <div class="flex flex-wrap justify-center gap-3 mt-8 w-full">
            <button 
              v-for="s in suggestions" 
              :key="s.label"
              @click="handleSuggestion(s.prompt)"
              class="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#27272a] border border-white/5 hover:bg-[#3f3f46] text-sm text-gray-300 transition-colors suggestion-chip text-center"
            >
              <UIcon :name="s.icon" class="w-4 h-4 text-white" />
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- Chat History -->
        <div v-else class="w-full max-w-3xl mx-auto space-y-8 pb-32">
          <div v-for="(msg, i) in messages" :key="i" class="animate-fade-in-up">
            <!-- User Message -->
            <div v-if="msg.role === 'user'" class="flex flex-col items-end mb-4">
              <div class="bg-[#27272a] text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] border border-white/5">
                {{ getMessageText(msg) }}
              </div>
              <div class="mt-1 text-[10px] text-gray-500 flex items-center gap-2">
                <span>{{ formatTime(msg.createdAt) }}</span>
                <span v-if="msg.meta?.tokensApprox">
                  · ~{{ msg.meta.tokensApprox }} tokens
                </span>
              </div>
            </div>

            <!-- Assistant Message -->
            <div v-else-if="msg.text || getToolCapsules(msg).length" class="flex gap-4">
              <div class="hidden md:flex w-8 h-8 rounded-full bg-white/10 shrink-0 items-center justify-center mt-1">
                <span class="i-heroicons-sparkles w-4 h-4 text-white"></span>
              </div>
              <div class="flex-1 space-y-4">
                
                <!-- Tool Invocations (Loading & Results) -->
                <div v-if="getToolCapsules(msg).length" class="space-y-4">
                   <div v-for="tool in getToolCapsules(msg)" :key="tool.id" class="w-full tool-card">
                      
                      <!-- Loading State -->
                      <div v-if="tool.state === 'calling'" class="flex items-center gap-3 text-gray-400 animate-pulse bg-[#27272a]/50 px-4 py-2 rounded-lg border border-white/5 w-fit">
                        <span class="i-heroicons-arrow-path w-4 h-4 animate-spin text-blue-400"></span>
                        <div class="flex flex-col">
                          <span class="text-sm font-medium">{{ getLoadingText(tool.name) }}</span>
                          <span class="text-[10px] text-gray-500 font-mono">
                            {{ tool.name }}
                          </span>
                        </div>
                      </div>

                      <!-- Error State -->
                      <div v-else-if="tool.state === 'error'" class="text-sm text-red-400 bg-red-950/40 px-3 py-2 rounded-lg border border-red-500/40">
                        {{ tool.errorMessage }}
                      </div>

                      <!-- Results UI -->
                      <div v-else>
                        <!-- Expense Table -->
                        <div v-if="tool.name === 'getExpenseSummary' || (tool.name === 'deleteTransaction' && tool.result?.transactions)" class="w-full">
                          <TransactionTable 
                            :transactions="tool.result.transactions" 
                            class="mb-2"
                          />
                        </div>
                        
                        <!-- Balance Card -->
                        <StatCard 
                          v-if="tool.name === 'getBalance'"
                          :balance="tool.result.balance"
                          :currency="tool.result.currency"
                          class="mb-2"
                        />

                        <!-- Daily Nutrition Card -->
                        <NutritionCard 
                          v-if="tool.name === 'getDailyNutrition'"
                          :data="tool.result"
                          class="mb-2"
                        />

                        <!-- Nutrition Chart -->
                        <NutritionChart 
                          v-if="tool.name === 'getNutritionTrend'"
                          :data="tool.result"
                          class="mb-2"
                        />
                      </div>
                   </div>
                </div>
                
                <!-- Text Content -->
                <div v-if="getMessageText(msg)" class="prose prose-invert prose-p:leading-relaxed prose-li:text-gray-300 max-w-none text-gray-200">
                  {{ getMessageText(msg) }}
                </div>

                <!-- Metadata -->
                <div class="text-[10px] text-gray-500 flex flex-wrap items-center gap-2">
                  <span>{{ formatTime(msg.createdAt) }}</span>
                  <span v-if="msg.meta?.latencyMs">
                    · {{ (msg.meta.latencyMs / 1000).toFixed(1) }}s en responder
                  </span>
                  <span v-if="getToolCapsules(msg).length">
                    · {{ getToolCapsules(msg).length }} tools
                  </span>
                  <span v-if="msg.meta?.tokensApprox">
                    · ~{{ msg.meta.tokensApprox }} tokens
                  </span>
                </div>
              </div>
            </div>
          </div>

           <!-- General Loading Indicator (assistant thinking bubble) -->
           <div v-if="isThinking" class="flex gap-4 animate-fade-in-up">
              <div class="hidden md:flex w-8 h-8 rounded-full bg-white/10 shrink-0 items-center justify-center">
                <span class="i-heroicons-sparkles w-4 h-4 text-white animate-pulse"></span>
              </div>
              <div class="bg-[#18181b] border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[70%] flex items-center gap-3 shadow-lg">
                <span class="i-heroicons-arrow-path w-4 h-4 animate-spin text-blue-400"></span>
                <div class="flex flex-col gap-1">
                  <span class="text-sm text-gray-300">
                    Pensando...
                  </span>
                  <div class="typing-dots">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Bottom Input (Visible only when not empty) -->
      <div v-if="!isEmpty" class=" w-full absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-[#09090b] via-[#09090b] to-transparent pt-12">
        <div class="max-w-3xl mx-auto w-full relative">
           <div v-if="speechError" class="absolute -top-14 left-0 right-0 flex justify-center z-50">
              <div class="bg-red-500/90 text-white text-sm px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-fade-in-up flex items-center gap-2">
                <span class="i-heroicons-exclamation-circle w-4 h-4"></span>
                {{ speechError }}
              </div>
           </div>
           <div class="w-full bg-[#27272a] rounded-3xl p-3 shadow-xl border border-white/5 flex items-center gap-2 transition-all focus-within:ring-1 focus-within:ring-white/20 input-shell">
            <UButton icon="i-heroicons-plus" color="neutral" variant="ghost" class="text-gray-400 hover:text-white rounded-full" />
             <textarea
                 v-model="input"
                 rows="1"
                 placeholder="Escribe un mensaje..."
                 class="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 focus:outline-none resize-none py-2 max-h-32"
                 @keydown.enter.prevent="handleSubmit"
               ></textarea>
              <UButton 
                icon="i-heroicons-microphone" 
                :color="isListening ? 'primary' : 'neutral'" 
                variant="ghost" 
                class="text-gray-400 hover:text-white rounded-full icon-button"
                :class="{ 'text-blue-400 animate-pulse bg-blue-500/10': isListening }"
                @click="toggleSpeechRecognition"
              />
              <UButton 
                @click="handleSubmit"
                icon="i-heroicons-paper-airplane" 
                color="neutral" 
                variant="solid" 
                size="sm"
                class="rounded-full w-8 h-8 flex items-center justify-center transition-opacity send-button"
                :class="{ 'opacity-50 cursor-not-allowed': !input.trim() }"
                :disabled="!input.trim()"
              />
           </div>
           <div class="text-center mt-2 text-xs text-gray-500">
             Tadashi puede cometer errores.
           </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Custom Scrollbar for dark theme */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

.animate-fade-in-up {
  animation: fadeInUp 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.logo-pulse {
  animation: logoPulse 4s ease-in-out infinite;
}

@keyframes logoPulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.25); }
  50% { transform: scale(1.03); box-shadow: 0 0 24px 0 rgba(56, 189, 248, 0.25); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.25); }
}

.suggestion-chip {
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out, background-color 0.15s ease-out;
}

.suggestion-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
}

.conversation-item {
  transition: background-color 0.15s ease-out, color 0.15s ease-out, transform 0.15s ease-out;
}

.conversation-item:hover {
  transform: translateX(2px);
}

.tool-card {
  animation: fadeInUp 0.35s ease-out;
}

.typing-dots {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.typing-dot {
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 9999px;
  background-color: #60a5fa;
  opacity: 0.4;
  animation: typingDot 1s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typingDot {
  0% { transform: translateY(0); opacity: 0.3; }
  30% { transform: translateY(-3px); opacity: 0.9; }
  60% { transform: translateY(0); opacity: 0.4; }
  100% { transform: translateY(0); opacity: 0.3; }
}

.input-shell {
  transition: box-shadow 0.15s ease-out, transform 0.15s ease-out, border-color 0.15s ease-out;
}

.input-shell:focus-within {
  transform: translateY(-1px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  border-color: rgba(250, 250, 250, 0.18);
}

.send-button {
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out, background-color 0.15s ease-out, opacity 0.15s ease-out;
}

.send-button:not(:disabled):hover {
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 10px 24px rgba(56, 189, 248, 0.55);
}

.search-input {
  border-radius: 9999px;
  background-color: #111827;
  border: 1px solid rgba(250, 250, 250, 0.06);
}

.search-input :deep(input) {
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  font-size: 0.75rem;
}

.icon-button {
  width: 2.5rem;
  height: 2.5rem;
}

.hamburger-button {
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.2rem;
}

@media (min-width: 768px) {
  .icon-button {
    width: 2.25rem;
    height: 2.25rem;
  }

  .suggestion-chip {
    min-width: 0;
  }
}
</style>
