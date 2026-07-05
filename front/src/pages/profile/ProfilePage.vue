<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { PhCamera, PhSpinner, PhSun, PhMoon, PhSignOut } from '@phosphor-icons/vue'
import { useColorMode } from '@vueuse/core'
import { authStore } from '@/entities/user'
import { authAPI } from '@/shared/api/auth.api'
import { AvatarCropDialog } from '@/features/profile'
import { AVATAR_SOURCE_MAX_BYTES } from '@/shared/lib/avatar-image'
import { toDateInputValue } from '@/shared/lib/birth-date'
import { isValidUsername, normalizeUsername, USERNAME_HINT } from '@/shared/lib/username'
import { cn } from '@/shared/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { ThemeToggle } from '@/shared/ui/theme-toggle'

type Sex = 'male' | 'female' | 'other' | ''

const user = computed(() => authStore.user.value)
const router = useRouter()
const colorMode = useColorMode()

const firstName = ref('')
const lastName = ref('')
const username = ref('')
const birthDate = ref('')
const sex = ref<Sex>('')
const avatarUrl = ref('')

const isSaving = ref(false)
const isUploadingAvatar = ref(false)
const isDraggingAvatar = ref(false)
const cropDialogOpen = ref(false)
const pendingCropFile = ref<File | null>(null)
const avatarInputRef = useTemplateRef<HTMLInputElement>('avatarInput')

watch(
  user,
  (current) => {
    if (!current) return
    firstName.value = current.firstName ?? ''
    lastName.value = current.lastName ?? ''
    username.value = current.username ?? ''
    birthDate.value = toDateInputValue(current.birthDate)
    sex.value = (current.sex as Sex | undefined) ?? ''
    avatarUrl.value = current.avatarUrl ?? ''
  },
  { immediate: true },
)

watch(cropDialogOpen, (open) => {
  if (!open) pendingCropFile.value = null
})

const displayName = computed(() => {
  if (firstName.value && lastName.value) {
    return `${firstName.value} ${lastName.value}`
  }
  if (firstName.value) return firstName.value
  if (lastName.value) return lastName.value
  if (username.value) return username.value
  return user.value?.email?.split('@')[0] ?? 'Guest'
})

const avatarInitials = computed(() => {
  if (firstName.value && lastName.value) {
    return `${firstName.value[0]}${lastName.value[0]}`.toUpperCase()
  }
  if (firstName.value) return firstName.value[0]?.toUpperCase() ?? ''
  if (lastName.value) return lastName.value[0]?.toUpperCase() ?? ''
  return user.value?.email?.[0]?.toUpperCase() ?? '?'
})

const memberSince = computed(() => {
  if (!user.value?.createdAt) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(user.value.createdAt))
})

const hasAvatar = computed(() => Boolean(avatarUrl.value))

const themeLabel = computed(() => (colorMode.value === 'dark' ? 'Dark' : 'Light'))

const selectClass = cn(
  'border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  'dark:bg-input/30',
)

function openAvatarPicker() {
  if (isUploadingAvatar.value || cropDialogOpen.value) return
  avatarInputRef.value?.click()
}

async function uploadAvatar(dataUrl: string) {
  const updated = await authAPI.updateProfile({ avatarUrl: dataUrl })
  authStore.setUser(updated)
  avatarUrl.value = updated.avatarUrl ?? dataUrl
}

function processAvatarFile(file: File) {
  if (!file.type.startsWith('image/')) {
    toast.error('Please select an image')
    return
  }

  if (file.size > AVATAR_SOURCE_MAX_BYTES) {
    toast.error('Image must be under 12 MB')
    return
  }

  pendingCropFile.value = file
  cropDialogOpen.value = true
  isDraggingAvatar.value = false
}

async function onAvatarCropConfirm(dataUrl: string) {
  pendingCropFile.value = null
  isUploadingAvatar.value = true

  try {
    avatarUrl.value = dataUrl
    await uploadAvatar(dataUrl)
    toast.success('Photo updated')
  } catch (e: unknown) {
    avatarUrl.value = user.value?.avatarUrl ?? ''
    const message = e instanceof Error ? e.message : 'Failed to upload photo'
    toast.error(message)
  } finally {
    isUploadingAvatar.value = false
  }
}

async function onAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) processAvatarFile(file)
}

function onAvatarDragOver(event: DragEvent) {
  event.preventDefault()
  if (!isUploadingAvatar.value) isDraggingAvatar.value = true
}

function onAvatarDragLeave() {
  isDraggingAvatar.value = false
}

async function onAvatarDrop(event: DragEvent) {
  event.preventDefault()
  isDraggingAvatar.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) processAvatarFile(file)
}

async function removeAvatar() {
  if (!hasAvatar.value || isUploadingAvatar.value) return

  isUploadingAvatar.value = true

  try {
    const updated = await authAPI.updateProfile({ avatarUrl: '' })
    authStore.setUser(updated)
    avatarUrl.value = ''
    toast.success('Photo removed')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to remove photo'
    toast.error(message)
  } finally {
    isUploadingAvatar.value = false
  }
}

const onSubmit = async () => {
  if (!user.value) return

  const normalizedUsername = normalizeUsername(username.value)
  if (normalizedUsername && !isValidUsername(normalizedUsername)) {
    toast.error(USERNAME_HINT)
    return
  }

  isSaving.value = true

  try {
    const updated = await authAPI.updateProfile({
      username: normalizedUsername || undefined,
      firstName: firstName.value || undefined,
      lastName: lastName.value || undefined,
      birthDate: birthDate.value || undefined,
      sex: sex.value || undefined,
    })

    authStore.setUser(updated)
    username.value = updated.username ?? ''
    birthDate.value = toDateInputValue(updated.birthDate)
    toast.success('Profile saved')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update profile'
    toast.error(message)
  } finally {
    isSaving.value = false
  }
}

const isLoggingOut = ref(false)

async function logout() {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  try {
    await authStore.logout()
    toast.success('Logged out')
    router.push('/auth')
  } catch {
    toast.error('Failed to log out')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="profile-page w-full max-w-4xl flex-1 p-6 md:p-8 lg:p-10">
    <header class="profile-page__header mb-8">
      <h1 class="profile-page__title text-2xl font-semibold tracking-tight">Profile</h1>
      <p class="profile-page__subtitle mt-1 text-sm text-muted-foreground">
        Account, appearance and personal details.
      </p>
    </header>

    <div class="profile-page__layout grid gap-6 lg:grid-cols-[minmax(0,14rem)_1fr] lg:gap-8">
      <aside
        class="profile-page__sidebar surface p-5 lg:sticky lg:top-6 lg:self-start"
      >
        <div
          class="profile-page__avatar-zone group relative mx-auto w-fit lg:mx-0"
          :class="{ 'profile-page__avatar-zone--dragging': isDraggingAvatar }"
          @dragover="onAvatarDragOver"
          @dragleave="onAvatarDragLeave"
          @drop="onAvatarDrop"
        >
          <button
            type="button"
            class="profile-page__avatar-trigger relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
            :disabled="isUploadingAvatar || cropDialogOpen"
            aria-label="Upload profile photo"
            @click="openAvatarPicker"
          >
            <Avatar
              class="profile-page__avatar size-24 ring-1 ring-border/50 transition-all group-hover:ring-primary/30 lg:size-28"
              :class="{
                'scale-[0.98] opacity-80 ring-2 ring-primary/40': isDraggingAvatar,
              }"
            >
              <AvatarImage :src="avatarUrl" :alt="displayName" />
              <AvatarFallback
                class="profile-page__avatar-fallback bg-primary/10 text-xl font-medium text-primary"
              >
                {{ avatarInitials }}
              </AvatarFallback>
            </Avatar>

            <span
              class="profile-page__avatar-overlay absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100"
              :class="{ 'opacity-100': isDraggingAvatar || isUploadingAvatar }"
            >
              <PhSpinner
                v-if="isUploadingAvatar"
                class="profile-page__avatar-spinner size-5 animate-spin text-white"
              />
              <template v-else>
                <PhCamera class="profile-page__avatar-camera size-5 text-white" />
                <span class="profile-page__avatar-label text-[11px] font-medium text-white/90">
                  {{ isDraggingAvatar ? 'Drop here' : 'Upload' }}
                </span>
              </template>
            </span>
          </button>

          <input
            ref="avatarInput"
            type="file"
            accept="image/*"
            class="profile-page__avatar-input sr-only"
            @change="onAvatarSelected"
          />
        </div>

        <div class="profile-page__identity mt-4 min-w-0">
            <p class="profile-page__display-name truncate text-base font-semibold tracking-tight">
              {{ displayName }}
            </p>
            <p
              v-if="username"
              class="profile-page__username mt-0.5 truncate text-sm text-muted-foreground"
            >
              @{{ username }}
            </p>
            <p class="profile-page__email mt-0.5 truncate text-sm text-muted-foreground">
            {{ user?.email }}
          </p>
          <p
            v-if="memberSince"
            class="profile-page__member-since mt-2 text-xs text-muted-foreground/80"
          >
            Member since {{ memberSince }}
          </p>
        </div>

        <button
          v-if="hasAvatar"
          type="button"
          class="profile-page__remove-photo mt-3 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
          :disabled="isUploadingAvatar || cropDialogOpen"
          @click="removeAvatar"
        >
          Remove photo
        </button>
      </aside>

      <div class="profile-page__panels space-y-4">
        <form
          class="profile-page__form flex flex-col surface"
          @submit.prevent="onSubmit"
        >
          <div class="profile-page__form-header border-b border-border/60 px-5 py-4 md:px-6">
            <h2 class="profile-page__form-title text-sm font-medium">Personal information</h2>
            <p class="profile-page__form-description mt-0.5 text-xs text-muted-foreground">
              How others see you in rooms.
            </p>
          </div>

          <div class="profile-page__form-body space-y-5 p-5 md:p-6">
            <div class="profile-page__field profile-page__field--username space-y-2">
              <Label class="profile-page__label text-muted-foreground" for="profile-handle">
                Username
              </Label>
              <Input
                id="profile-handle"
                v-model="username"
                class="profile-page__input profile-page__input--username"
                type="text"
                name="profile-handle"
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                placeholder="yourname"
                :disabled="isSaving"
              />
              <p class="profile-page__username-hint text-xs text-muted-foreground">
                Letters, numbers, underscores. 3–30 characters.
              </p>
            </div>

            <div class="profile-page__row profile-page__row--name grid gap-4 sm:grid-cols-2">
              <div class="profile-page__field profile-page__field--first-name space-y-2">
                <Label class="profile-page__label text-muted-foreground" for="first-name">
                  First name
                </Label>
                <Input
                  id="first-name"
                  v-model="firstName"
                  class="profile-page__input profile-page__input--first-name"
                  type="text"
                  autocomplete="given-name"
                  placeholder="Alex"
                  :disabled="isSaving"
                />
              </div>
              <div class="profile-page__field profile-page__field--last-name space-y-2">
                <Label class="profile-page__label text-muted-foreground" for="last-name">
                  Last name
                </Label>
                <Input
                  id="last-name"
                  v-model="lastName"
                  class="profile-page__input profile-page__input--last-name"
                  type="text"
                  autocomplete="family-name"
                  placeholder="Johnson"
                  :disabled="isSaving"
                />
              </div>
            </div>

            <div class="profile-page__row profile-page__row--details grid gap-4 sm:grid-cols-2">
              <div class="profile-page__field profile-page__field--birth-date space-y-2">
                <Label class="profile-page__label text-muted-foreground" for="birth-date">
                  Birth date
                </Label>
                <Input
                  id="birth-date"
                  v-model="birthDate"
                  class="profile-page__input profile-page__input--birth-date"
                  type="date"
                  :disabled="isSaving"
                />
              </div>
              <div class="profile-page__field profile-page__field--sex space-y-2">
                <Label class="profile-page__label text-muted-foreground" for="sex">Sex</Label>
                <select
                  id="sex"
                  v-model="sex"
                  class="profile-page__select profile-page__select--sex"
                  :class="selectClass"
                  :disabled="isSaving"
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div
            class="profile-page__form-footer mt-auto flex items-center justify-end border-t border-border/60 px-5 py-4 md:px-6"
          >
            <Button
              type="submit"
              class="profile-page__submit min-w-28"
              :disabled="isSaving || isUploadingAvatar"
            >
              {{ isSaving ? 'Saving…' : 'Save changes' }}
            </Button>
          </div>
        </form>

        <section
          class="profile-page__settings surface p-5 md:p-6"
        >
          <h2 class="profile-page__settings-title text-sm font-medium">Settings</h2>
          <p class="profile-page__settings-description mt-0.5 text-xs text-muted-foreground">
            App preferences.
          </p>

          <div
            class="profile-page__settings-row mt-4 flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-background/40 px-4 py-3"
          >
            <div class="profile-page__settings-row-body flex min-w-0 items-center gap-3">
              <span
                class="profile-page__settings-icon flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50"
              >
                <PhSun v-if="colorMode === 'dark'" class="size-4 text-muted-foreground" />
                <PhMoon v-else class="size-4 text-muted-foreground" />
              </span>
              <div class="min-w-0">
                <p class="profile-page__settings-row-title text-sm font-medium">Theme</p>
                <p class="profile-page__settings-row-description text-xs text-muted-foreground">
                  {{ themeLabel }} mode
                </p>
              </div>
            </div>
            <ThemeToggle class="profile-page__theme-toggle shrink-0" />
          </div>

          <div
            class="profile-page__settings-row mt-3 flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-background/40 px-4 py-3"
          >
            <div class="profile-page__settings-row-body flex min-w-0 items-center gap-3">
              <span
                class="profile-page__settings-icon flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50"
              >
                <PhSignOut class="size-4 text-muted-foreground" />
              </span>
              <div class="min-w-0">
                <p class="profile-page__settings-row-title text-sm font-medium">Log out</p>
                <p class="profile-page__settings-row-description text-xs text-muted-foreground">
                  Sign out of your account
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              class="profile-page__logout shrink-0"
              :disabled="isLoggingOut"
              @click="logout"
            >
              {{ isLoggingOut ? 'Logging out…' : 'Log out' }}
            </Button>
          </div>
        </section>
      </div>
    </div>

    <AvatarCropDialog
      v-model:open="cropDialogOpen"
      :file="pendingCropFile"
      @confirm="onAvatarCropConfirm"
    />
  </div>
</template>
