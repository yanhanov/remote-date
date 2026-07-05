<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  PhCalendarBlank,
  PhChatCircle,
  PhGenderIntersex,
  PhHeart,
  PhPencilSimple,
  PhSpinner,
  PhUser,
  PhUserPlus,
  PhUsersThree,
} from '@phosphor-icons/vue'
import { UserAvatar } from '@/entities/user'
import { socialAPI } from '@/shared/api/social.api'
import type { PublicUserProfile, RelationshipStatus } from '@/shared/api/social.types'
import { computeAge, formatBirthDate } from '@/shared/lib/birth-date'
import { Button } from '@/shared/ui/button'

const route = useRoute()
const router = useRouter()

const profile = ref<PublicUserProfile | null>(null)
const isLoading = ref(true)
const isActing = ref(false)

const userId = computed(() => route.params.id as string)

const age = computed(() => computeAge(profile.value?.birthDate))
const birthDateFormatted = computed(() => formatBirthDate(profile.value?.birthDate))

const memberSince = computed(() => {
  if (!profile.value?.createdAt) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.value.createdAt))
})

const friendsSinceFormatted = computed(() => {
  if (!profile.value?.friendsSince) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(profile.value.friendsSince))
})

const sexLabel = computed(() => {
  const sex = profile.value?.sex
  if (!sex) return null
  return { male: 'Male', female: 'Female', other: 'Other' }[sex]
})

const relationshipLabel = computed(() => {
  const map: Record<RelationshipStatus, string | null> = {
    self: null,
    none: null,
    friend: 'Friends',
    pending_outgoing: 'Request sent',
    pending_incoming: 'Wants to be friends',
  }
  return profile.value ? map[profile.value.relationship] : null
})

const relationshipBadgeClass = computed(() => {
  const rel = profile.value?.relationship
  if (rel === 'friend') {
    return 'bg-primary/15 text-primary border-primary/25'
  }
  if (rel === 'pending_incoming') {
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25'
  }
  if (rel === 'pending_outgoing') {
    return 'bg-muted text-muted-foreground border-border/60'
  }
  return ''
})

const hasAboutInfo = computed(
  () =>
    age.value != null ||
    Boolean(sexLabel.value) ||
    Boolean(birthDateFormatted.value) ||
    Boolean(memberSince.value),
)

const infoItems = computed(() => {
  const items: { icon: typeof PhUser; label: string; value: string }[] = []

  if (age.value != null) {
    items.push({
      icon: PhUser,
      label: 'Age',
      value: `${age.value} years old`,
    })
  }

  if (sexLabel.value) {
    items.push({
      icon: PhGenderIntersex,
      label: 'Sex',
      value: sexLabel.value,
    })
  }

  if (birthDateFormatted.value) {
    items.push({
      icon: PhCalendarBlank,
      label: 'Birthday',
      value: birthDateFormatted.value,
    })
  }

  if (memberSince.value) {
    items.push({
      icon: PhUsersThree,
      label: 'Member since',
      value: memberSince.value,
    })
  }

  return items
})

async function loadProfile() {
  isLoading.value = true
  try {
    profile.value = await socialAPI.getUserProfile(userId.value)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load profile'
    toast.error(message)
    profile.value = null
  } finally {
    isLoading.value = false
  }
}

async function sendRequest() {
  if (!profile.value) return
  isActing.value = true
  try {
    await socialAPI.sendFriendRequest(profile.value.userId)
    toast.success('Friend request sent')
    await loadProfile()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Failed to send request')
  } finally {
    isActing.value = false
  }
}

async function acceptRequest() {
  if (!profile.value?.incomingRequestId) return
  isActing.value = true
  try {
    await socialAPI.acceptFriendRequest(profile.value.incomingRequestId)
    toast.success('Friend request accepted')
    await loadProfile()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Failed to accept request')
  } finally {
    isActing.value = false
  }
}

async function rejectRequest() {
  if (!profile.value?.incomingRequestId) return
  isActing.value = true
  try {
    await socialAPI.rejectFriendRequest(profile.value.incomingRequestId)
    toast.success('Request declined')
    await loadProfile()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Failed to decline request')
  } finally {
    isActing.value = false
  }
}

function openChat() {
  if (!profile.value) return
  router.push(`/messages/${profile.value.userId}`)
}

watch(userId, loadProfile)
onMounted(loadProfile)
</script>

<template>
  <div class="user-profile-page flex min-h-full flex-1 flex-col">
    <div
      class="user-profile-page__center flex flex-1 flex-col items-center justify-start p-6 md:p-10"
    >
      <div class="user-profile-page__container w-full max-w-md space-y-8 lg:max-w-4xl">
        <div v-if="isLoading" class="user-profile-page__loading flex justify-center py-24">
          <PhSpinner class="size-6 animate-spin text-muted-foreground" />
        </div>

        <template v-else-if="!profile">
          <header class="user-profile-page__header space-y-3">
            <p
              class="user-profile-page__eyebrow text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
            >
              Social
            </p>
            <div class="user-profile-page__brand flex items-center gap-4">
              <span
                class="user-profile-page__icon flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20"
              >
                <PhUser class="size-7 text-primary" weight="duotone" />
              </span>
              <div class="min-w-0">
                <h1 class="user-profile-page__title page-title text-3xl md:text-[2rem]">
                  User profile
                </h1>
                <p class="user-profile-page__subtitle page-subtitle mt-1">
                  This profile is unavailable.
                </p>
              </div>
            </div>
          </header>

          <div
            class="user-profile-page__not-found rounded-xl border border-border/70 bg-card/50 px-6 py-12 text-center backdrop-blur-sm"
          >
            <PhUser class="mx-auto size-10 text-muted-foreground/60" />
            <h2 class="user-profile-page__not-found-title mt-4 text-base font-semibold">
              User not found
            </h2>
            <p class="user-profile-page__not-found-text mt-1 text-sm text-muted-foreground">
              This profile doesn't exist or was removed.
            </p>
            <Button
              as-child
              variant="outline"
              class="user-profile-page__not-found-back mt-6 h-9 rounded-xl border-2 px-4 font-medium"
            >
              <RouterLink to="/friends">Back to friends</RouterLink>
            </Button>
          </div>
        </template>

        <template v-else>
          <header class="user-profile-page__header space-y-3">
            <p
              class="user-profile-page__eyebrow text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
            >
              Social
            </p>
            <div class="user-profile-page__brand flex items-center gap-4">
              <span
                class="user-profile-page__icon flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20"
              >
                <PhUser class="size-7 text-primary" weight="duotone" />
              </span>
              <div class="min-w-0">
                <h1 class="user-profile-page__title page-title truncate text-3xl md:text-[2rem]">
                  {{ profile.displayName }}
                </h1>
                <p class="user-profile-page__subtitle page-subtitle mt-1 truncate">
                  <template v-if="profile.username">@{{ profile.username }}</template>
                  <template v-else>Public profile</template>
                </p>
              </div>
            </div>
          </header>

          <article
            class="user-profile-page__content grid gap-5 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:items-start lg:gap-8"
          >
            <section
              class="user-profile-page__identity-card rounded-xl border border-border/70 bg-card/50 p-5 backdrop-blur-sm lg:sticky lg:top-6"
            >
              <div class="user-profile-page__hero flex flex-col items-center lg:items-start">
                <UserAvatar
                  :user="profile"
                  size="xl"
                  class="user-profile-page__avatar ring-2 ring-background"
                />

                <div class="user-profile-page__identity mt-4 min-w-0 max-w-full text-center lg:text-left">
                  <div
                    class="user-profile-page__name-row flex flex-wrap items-center justify-center gap-2 lg:justify-start"
                  >
                    <p class="user-profile-page__name truncate text-base font-semibold tracking-tight">
                      {{ profile.displayName }}
                    </p>
                    <span
                      v-if="relationshipLabel"
                      class="user-profile-page__badge inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                      :class="relationshipBadgeClass"
                    >
                      {{ relationshipLabel }}
                    </span>
                  </div>

                  <p
                    v-if="profile.username"
                    class="user-profile-page__username mt-0.5 truncate text-sm text-muted-foreground"
                  >
                    @{{ profile.username }}
                  </p>
                </div>
              </div>

              <div
                v-if="profile.relationship !== 'self'"
                class="user-profile-page__actions mt-5 flex flex-col gap-2"
              >
                <Button
                  v-if="profile.relationship === 'none'"
                  class="user-profile-page__add-friend h-11 w-full rounded-xl"
                  :disabled="isActing"
                  @click="sendRequest"
                >
                  <PhUserPlus class="size-4" />
                  Add friend
                </Button>

                <template v-else-if="profile.relationship === 'pending_incoming'">
                  <Button
                    class="user-profile-page__accept h-11 w-full rounded-xl"
                    :disabled="isActing"
                    @click="acceptRequest"
                  >
                    <PhHeart class="size-4" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    class="user-profile-page__decline h-11 w-full rounded-xl border-2 font-medium"
                    :disabled="isActing"
                    @click="rejectRequest"
                  >
                    Decline
                  </Button>
                </template>

                <Button
                  v-else-if="profile.relationship === 'pending_outgoing'"
                  variant="outline"
                  class="user-profile-page__pending h-11 w-full rounded-xl border-2 font-medium"
                  disabled
                >
                  Request sent
                </Button>

                <Button
                  v-if="profile.relationship === 'friend'"
                  class="user-profile-page__message h-11 w-full rounded-xl"
                  @click="openChat"
                >
                  <PhChatCircle class="size-4" />
                  Message
                </Button>
              </div>

              <div v-else class="user-profile-page__self-note mt-5">
                <Button
                  as-child
                  variant="outline"
                  class="user-profile-page__edit h-11 w-full rounded-xl border-2 font-medium"
                >
                  <RouterLink to="/profile">
                    <PhPencilSimple class="size-4" />
                    Edit your profile
                  </RouterLink>
                </Button>
              </div>
            </section>

            <div class="user-profile-page__panels flex min-w-0 flex-col gap-5">
              <section
                class="user-profile-page__about overflow-hidden rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm"
              >
                <div class="user-profile-page__about-header border-b border-border/60 px-5 py-4">
                  <p
                    class="user-profile-page__about-label text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    About
                  </p>
                  <p class="user-profile-page__about-description mt-1 text-xs text-muted-foreground">
                    Public profile details.
                  </p>
                </div>

                <div class="user-profile-page__about-body p-5">
                  <div
                    v-if="hasAboutInfo"
                    class="user-profile-page__info-grid grid gap-3 sm:grid-cols-2"
                  >
                    <div
                      v-for="item in infoItems"
                      :key="item.label"
                      class="user-profile-page__info-item flex items-start gap-3 rounded-xl border border-border/70 bg-background/40 p-4"
                    >
                      <span
                        class="user-profile-page__info-icon flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15"
                      >
                        <component :is="item.icon" class="size-4 text-primary" weight="duotone" />
                      </span>
                      <div class="user-profile-page__info-text min-w-0">
                        <p class="user-profile-page__info-label text-xs text-muted-foreground">
                          {{ item.label }}
                        </p>
                        <p class="user-profile-page__info-value mt-0.5 text-sm font-medium">
                          {{ item.value }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p
                    v-else
                    class="user-profile-page__about-empty rounded-xl border border-border/70 bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No public details yet.
                  </p>
                </div>
              </section>

              <section
                v-if="profile.relationship === 'friend' && friendsSinceFormatted"
                class="user-profile-page__friends-since rounded-xl border border-primary/25 bg-primary/8 px-5 py-4 text-center text-sm text-muted-foreground backdrop-blur-sm"
              >
                Friends since
                <span class="font-medium text-foreground">{{ friendsSinceFormatted }}</span>
              </section>
            </div>
          </article>
        </template>
      </div>
    </div>
  </div>
</template>
