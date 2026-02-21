import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/Login.vue'
import SignupView from '@/views/Signup.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignupView,
      meta: { requiresAuth: false }
    }
  ]
})

router.beforeEach(async (to, _, next) => {
  const authStore = useAuthStore()
  
  if (authStore.loading) {
    await authStore.fetchSession()
  }
  
  const isAuthenticated = !!authStore.user
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' })
  } else if (!to.meta.requiresAuth && isAuthenticated && (to.name === 'login' || to.name === 'signup')) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
