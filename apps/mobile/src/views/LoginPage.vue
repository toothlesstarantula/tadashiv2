<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Login</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="flex-center">
        <div class="auth-container">
          <div class="logo-container">
            <img src="@/assets/tadashi_white.png" alt="Tadashi" class="logo" />
            <h1>Tadashi</h1>
            <p>Sign in to your account</p>
          </div>

          <form @submit.prevent="handleLogin">
            <ion-item>
              <ion-input v-model="email" type="email" label="Email" label-placement="floating" placeholder="you@example.com" required></ion-input>
            </ion-item>

            <ion-item>
              <ion-input v-model="password" type="password" label="Password" label-placement="floating" placeholder="••••••••" required></ion-input>
            </ion-item>

            <div v-if="error" class="error-message">
              {{ error }}
            </div>

            <ion-button expand="block" type="submit" :disabled="loading" class="ion-margin-top">
              <span v-if="!loading">Sign In</span>
              <ion-spinner v-else name="crescent"></ion-spinner>
            </ion-button>
          </form>

          <div class="footer-text">
            <span>Don't have an account?</span>
            <router-link to="/signup">Sign up</router-link>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonInput, IonButton, IonSpinner } from '@ionic/vue';

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const router = useRouter();
const authStore = useAuthStore();

async function handleLogin() {
  loading.value = true;
  error.value = '';

  try {
    const result = await authStore.signIn(email.value, password.value);
    if (result.success) {
      router.replace('/home');
    } else {
      error.value = result.error?.message || 'Failed to sign in';
    }
  } catch (e: any) {
    error.value = e.message || 'An unexpected error occurred';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.logo-container {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  margin-bottom: 16px;
}

.error-message {
  color: var(--ion-color-danger);
  font-size: 14px;
  text-align: center;
  margin-top: 10px;
}

.footer-text {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: var(--ion-color-medium);
}

.footer-text a {
  margin-left: 5px;
  text-decoration: none;
  font-weight: bold;
  color: var(--ion-color-primary);
}
</style>
