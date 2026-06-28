import { ref, computed, type Ref } from 'vue'
import { authAPI } from '@/shared/api/auth.api'
import { tokenService } from '@/shared/api/token.service'
import type { User } from './types'

const user: Ref<User | null> = ref(null)
const isLoading = ref(false)
const isInitialized = ref(false)

export const authStore = {
  user: computed(() => user.value),

  isAuthenticated: computed(() => !!user.value && tokenService.hasTokens()),

  isInitialized: computed(() => isInitialized.value),

  isLoading: computed(() => isLoading.value),

  async initialize(): Promise<boolean> {
    if (isInitialized.value) {
      return !!user.value
    }

    if (!tokenService.hasTokens()) {
      isInitialized.value = true
      return false
    }

    try {
      isLoading.value = true
      const userData = await authAPI.getMe()
      user.value = userData
      isInitialized.value = true
      return true
    } catch {
      tokenService.clearTokens()
      user.value = null
      isInitialized.value = true
      return false
    } finally {
      isLoading.value = false
    }
  },

  setUser(userData: User | null): void {
    user.value = userData
  },

  async refreshUser(): Promise<void> {
    if (!tokenService.hasTokens()) {
      user.value = null
      return
    }

    try {
      const userData = await authAPI.getMe()
      user.value = userData
    } catch {
      tokenService.clearTokens()
      user.value = null
    }
  },

  async logout(): Promise<void> {
    try {
      await authAPI.logout()
    } catch {
      // ignore
    } finally {
      user.value = null
      tokenService.clearTokens()
      isInitialized.value = false
    }
  },

  reset(): void {
    user.value = null
    isLoading.value = false
    isInitialized.value = false
  },
}
