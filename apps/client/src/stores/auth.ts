import { defineStore } from 'pinia'
import { authClient } from '@/lib/auth-client'
import type { User } from 'better-auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    session: null as any | null,
    loading: true,
  }),
  actions: {
    async fetchSession() {
      this.loading = true
      try {
        const { data } = await authClient.getSession()
        this.user = data?.user ?? null
        this.session = data?.session ?? null
      } catch (error) {
        this.user = null
        this.session = null
      } finally {
        this.loading = false
      }
    },
    async signIn(email: string, password: string) {
      const { data, error } = await authClient.signIn.email({ 
        email, 
        password 
      })
      if (data) {
        await this.fetchSession()
        return { success: true }
      }
      return { success: false, error }
    },
    async signUp(name: string, email: string, password: string) {
      const { data, error } = await authClient.signUp.email({ 
        email, 
        password, 
        name 
      })
      if (data) {
        await this.fetchSession()
        return { success: true }
      }
      return { success: false, error }
    },
    async signOut() {
      await authClient.signOut()
      this.user = null
      this.session = null
    }
  }
})
