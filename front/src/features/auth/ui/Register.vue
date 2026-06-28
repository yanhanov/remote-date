<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
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
import {
  isValidUsername,
  normalizeUsername,
  USERNAME_HINT,
} from '@/shared/lib/username'
import VerificationDialog from './VerificationDialog.vue'

const emit = defineEmits<{
  (e: 'login'): void
}>()

const router = useRouter()

const email = ref('')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)
const showVerificationDialog = ref(false)
const registeredEmail = ref('')

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

const usernameStatus = ref<UsernameStatus>('idle')
const usernameMessage = ref<string | null>(null)

watchDebounced(
  username,
  async (value) => {
    const normalized = normalizeUsername(value)

    if (!normalized) {
      usernameStatus.value = 'idle'
      usernameMessage.value = null
      return
    }

    if (!isValidUsername(normalized)) {
      usernameStatus.value = 'invalid'
      usernameMessage.value = USERNAME_HINT
      return
    }

    usernameStatus.value = 'checking'
    usernameMessage.value = null

    try {
      const result = await authAPI.checkUsername(normalized)
      if (result.available) {
        usernameStatus.value = 'available'
        usernameMessage.value = 'Username is available'
      } else {
        usernameStatus.value = 'taken'
        usernameMessage.value = result.reason ?? 'Username is already taken'
      }
    } catch {
      usernameStatus.value = 'idle'
      usernameMessage.value = null
    }
  },
  { debounce: 400 },
)

const isUsernameBlocked = () =>
  usernameStatus.value === 'taken' ||
  usernameStatus.value === 'invalid' ||
  usernameStatus.value === 'checking'

const handleRegister = async (e: Event) => {
  e.preventDefault()
  error.value = null

  if (!email.value || !username.value || !password.value || !confirmPassword.value) {
    error.value = 'Please fill in all fields'
    toast.error('Please fill in all fields')
    return
  }

  const normalizedUsername = normalizeUsername(username.value)
  if (!isValidUsername(normalizedUsername)) {
    error.value = USERNAME_HINT
    toast.error(error.value)
    return
  }

  if (usernameStatus.value === 'taken') {
    error.value = usernameMessage.value ?? 'Username is already taken'
    toast.error(error.value)
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    toast.error('Passwords do not match')
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    toast.error('Password must be at least 6 characters')
    return
  }

  isLoading.value = true

  try {
    await authAPI.register({
      email: email.value,
      username: normalizedUsername,
      password: password.value,
    })

    registeredEmail.value = email.value
    showVerificationDialog.value = true
    toast.info('Verification code sent to your email')
  } catch (err: any) {
    const message = err.message || 'Registration failed'
    error.value = message
    toast.error(message)
  } finally {
    isLoading.value = false
  }
}

const handleVerified = async (_userId: string) => {
  await authStore.refreshUser()
  toast.success('Account verified. Welcome!')
  router.push('/')
}

const handleDialogClose = () => {
  showVerificationDialog.value = false
}
</script>

<template>
  <Card class="register-form w-full max-w-md">
    <CardHeader class="register-form__header">
      <CardTitle class="register-form__title text-2xl font-bold">Register</CardTitle>
      <CardDescription class="register-form__description">Register to your account to continue</CardDescription>
    </CardHeader>
    <CardContent class="register-form__content">
      <form class="register-form__form flex flex-col items-stretch justify-center gap-4" @submit="handleRegister">
        <div v-if="error" class="register-form__error p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {{ error }}
        </div>
        <div class="register-form__field register-form__field--username space-y-2">
          <Label class="register-form__label" for="register-handle">Username</Label>
          <Input
            id="register-handle"
            v-model="username"
            class="register-form__input register-form__input--username"
            type="text"
            name="register-handle"
            placeholder="yourname"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            required
            :disabled="isLoading"
          />
          <p
            v-if="usernameMessage"
            class="register-form__username-status text-xs"
            :class="{
              'text-muted-foreground': usernameStatus === 'checking',
              'text-green-600 dark:text-green-400': usernameStatus === 'available',
              'text-destructive': usernameStatus === 'taken' || usernameStatus === 'invalid',
            }"
          >
            {{ usernameMessage }}
          </p>
          <p v-else class="register-form__username-hint text-xs text-muted-foreground">
            Letters, numbers, underscores. 3–30 characters.
          </p>
        </div>
        <div class="register-form__field register-form__field--email space-y-2">
          <Label class="register-form__label" for="email">Email</Label>
          <Input
            id="email"
            v-model="email"
            class="register-form__input register-form__input--email"
            type="email"
            name="email"
            placeholder="Email"
            autocomplete="email"
            required
            :disabled="isLoading"
          />
        </div>
        <div class="register-form__field register-form__field--password space-y-2">
          <Label class="register-form__label" for="password">Password</Label>
          <Input
            id="password"
            v-model="password"
            class="register-form__input register-form__input--password"
            type="password"
            variant="password"
            name="new-password"
            placeholder="Password"
            autocomplete="new-password"
            required
            :disabled="isLoading"
          />
        </div>
        <div class="register-form__field register-form__field--confirm space-y-2">
          <Label class="register-form__label" for="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            v-model="confirmPassword"
            class="register-form__input register-form__input--confirm"
            type="password"
            variant="password"
            name="confirm-password"
            placeholder="Confirm Password"
            autocomplete="new-password"
            required
            :disabled="isLoading"
          />
        </div>
        <Button
          type="submit"
          class="register-form__submit w-full"
          :disabled="isLoading || isUsernameBlocked()"
        >
          {{ isLoading ? 'Registering...' : 'Register' }}
        </Button>
        <div class="register-form__footer space-y-2">
          <p class="register-form__switch text-center text-sm text-muted-foreground">
            Already have an account?
            <button
              type="button"
              class="register-form__switch-link text-foreground hover:text-primary/80 transition"
              @click="emit('login')"
            >
              Login
            </button>
          </p>
        </div>
      </form>
    </CardContent>
  </Card>

  <VerificationDialog
    class="register-form__verification"
    :open="showVerificationDialog"
    :email="registeredEmail"
    @update:open="handleDialogClose"
    @verified="handleVerified"
  />
</template>
