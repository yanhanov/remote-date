<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Input,
  Button,
  Label,
} from '@/shared/ui'
import { authAPI } from '@/shared/api/auth.api'
import { authStore } from '@/entities/user'

const emit = defineEmits<{
  (e: 'register'): void
}>()

const router = useRouter()

const login = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)

const handleLogin = async (e: Event) => {
  e.preventDefault()
  error.value = null

  if (!login.value || !password.value) {
    error.value = 'Please fill in all fields'
    toast.error('Please fill in all fields')
    return
  }

  isLoading.value = true

  try {
    await authAPI.login({
      login: login.value.trim(),
      password: password.value,
    })

    await authStore.refreshUser()

    toast.success('Welcome back!')
    router.push('/')
  } catch (err: any) {
    const message = err.message || 'Login failed'
    error.value = message
    toast.error(message)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Card class="login-form w-full max-w-md">
    <CardHeader class="login-form__header">
      <CardTitle class="login-form__title text-2xl font-bold">Login</CardTitle>
      <CardDescription class="login-form__description">Login to your account to continue</CardDescription>
    </CardHeader>
    <CardContent class="login-form__content">
      <form class="login-form__form flex flex-col items-stretch justify-center gap-4" @submit="handleLogin">
        <div v-if="error" class="login-form__error p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {{ error }}
        </div>
        <div class="login-form__field login-form__field--login space-y-2">
          <Label class="login-form__label" for="login">Email or username</Label>
          <Input
            id="login"
            v-model="login"
            class="login-form__input login-form__input--login"
            type="text"
            name="login"
            placeholder="Email or username"
            autocomplete="username"
            required
            :disabled="isLoading"
          />
        </div>
        <div class="login-form__field login-form__field--password space-y-2">
          <Label class="login-form__label" for="password">Password</Label>
          <Input
            id="password"
            v-model="password"
            class="login-form__input login-form__input--password"
            type="password"
            variant="password"
            name="password"
            placeholder="Password"
            autocomplete="current-password"
            required
            :disabled="isLoading"
          />
          <button type="button" class="login-form__forgot text-left hover:text-muted-foreground transition">
            Forgot password?
          </button>
        </div>
        <Button type="submit" class="login-form__submit w-full" :disabled="isLoading">
          {{ isLoading ? 'Logging in...' : 'Login' }}
        </Button>
        <div class="login-form__footer space-y-2">
          <p class="login-form__switch text-center text-sm text-muted-foreground">
            Don't have an account?
            <button
              type="button"
              class="login-form__switch-link text-foreground hover:text-primary/80 transition"
              @click="emit('register')"
            >
              Register
            </button>
          </p>
        </div>
      </form>
    </CardContent>
  </Card>
</template>
