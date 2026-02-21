<script setup lang="ts">
import { authClient } from './lib/auth-client'
const session = authClient.useSession()
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div v-if="!session?.data" class="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
      <h1 class="text-2xl font-bold mb-6 text-gray-900">Welcome to Tadashi</h1>
      <button 
        class="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors w-full flex items-center justify-center gap-2"
        @click="() => authClient.signIn.social({ provider: 'github' })"
      >
        <span>Continue with GitHub</span>
      </button>
    </div>
    
    <div v-else class="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
      <div class="mb-4">
        <img 
          v-if="session.data.user.image" 
          :src="session.data.user.image" 
          alt="Profile" 
          class="w-16 h-16 rounded-full mx-auto mb-4 border-2 border-gray-100"
        />
        <h2 class="text-xl font-semibold text-gray-900">{{ session.data.user.name }}</h2>
        <p class="text-gray-500 text-sm">{{ session.data.user.email }}</p>
      </div>
      
      <pre class="bg-gray-100 p-4 rounded text-left text-xs overflow-auto max-h-48 mb-6 border border-gray-200">{{ session.data }}</pre>
      
      <button 
        class="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors w-full"
        @click="authClient.signOut()"
      >
        Sign out
      </button>
    </div>
  </div>
</template>

<style scoped>
</style>
