<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const router = useRouter()
const authStore = useAuthStore()

async function handleSignup() {
  loading.value = true
  error.value = ''
  
  try {
    const result = await authStore.signUp(name.value, email.value, password.value)
    if (result.success) {
      router.push('/')
    } else {
      error.value = result.error?.message || 'Failed to sign up'
    }
  } catch (e: any) {
    error.value = e.message || 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
    <div class="w-full max-w-md space-y-4">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Tadashi</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">Create your account</p>
      </div>
      
      <UCard class="p-6">
        <form @submit.prevent="handleSignup" class="space-y-4">
          <UFormField label="Name" name="name">
            <UInput v-model="name" type="text" placeholder="Your Name" required class="w-full" />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput v-model="email" type="email" placeholder="you@example.com" required class="w-full" />
          </UFormField>
          
          <UFormField label="Password" name="password">
            <UInput v-model="password" type="password" placeholder="••••••••" required class="w-full" />
          </UFormField>
          
          <div v-if="error" class="text-red-500 text-sm text-center">
            {{ error }}
          </div>
          
          <UButton type="submit" block :loading="loading" class="w-full" color="neutral" variant="solid">
            Sign Up
          </UButton>
        </form>
        
        <div class="mt-4 text-center text-sm">
          <span class="text-gray-500">Already have an account?</span>
          <router-link to="/login" class="ml-1 text-primary-600 hover:text-primary-500 font-medium">
            Sign in
          </router-link>
        </div>
      </UCard>
    </div>
  </div>
</template>
