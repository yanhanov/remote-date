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
  <div class="user-profile-page mx-auto w-full max-w-2xl flex-1 p-6 md:p-8 lg:p-10">
    <div v-if="isLoading" class="user-profile-page__loading flex justify-center py-24">
      <PhSpinner class="size-7 animate-spin text-muted-foreground" />
    </div>

    <div
      v-else-if="!profile"
      class="user-profile-page__not-found flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-20 text-center"
    >
      <PhUser class="size-10 text-muted-foreground/60" />
      <h1 class="user-profile-page__not-found-title mt-4 text-lg font-semibold">User not found</h1>
      <p class="user-profile-page__not-found-text mt-1 text-sm text-muted-foreground">
        This profile doesn't exist or was removed.
      </p>
      <Button as-child variant="outline" class="user-profile-page__not-found-back mt-6">
        <RouterLink to="/friends">Back to friends</RouterLink>
      </Button>
    </div>

    <article
      v-else
      class="user-profile-page__card surface overflow-hidden"
    >
      <div
        class="user-profile-page__banner relative h-28 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent md:h-36"
      />

      <div class="user-profile-page__body px-5 pb-6 md:px-8 md:pb-8">
        <div class="user-profile-page__hero -mt-14 flex flex-col items-center text-center md:-mt-16">
          <UserAvatar
            :user="profile"
            size="xl"
            class="user-profile-page__avatar ring-4 ring-background shadow-md"
          />

          <div class="user-profile-page__identity mt-4 min-w-0 max-w-full">
            <div class="user-profile-page__name-row flex flex-wrap items-center justify-center gap-2">
              <h1 class="user-profile-page__name truncate text-2xl font-semibold tracking-tight md:text-3xl">
                {{ profile.displayName }}
              </h1>
              <span
                v-if="relationshipLabel"
                class="user-profile-page__badge inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                :class="relationshipBadgeClass"
              >
                {{ relationshipLabel }}
              </span>
            </div>

            <p
              v-if="profile.username"
              class="user-profile-page__username mt-1 text-sm text-muted-foreground"
            >
              @{{ profile.username }}
            </p>
          </div>
        </div>

        <div
          v-if="profile.relationship !== 'self'"
          class="user-profile-page__actions mt-6 flex flex-wrap justify-center gap-2"
        >
          <Button
            v-if="profile.relationship === 'none'"
            class="user-profile-page__add-friend min-w-[9rem]"
            :disabled="isActing"
            @click="sendRequest"
          >
            <PhUserPlus class="size-4" />
            Add friend
          </Button>

          <template v-else-if="profile.relationship === 'pending_incoming'">
            <Button
              class="user-profile-page__accept min-w-[9rem]"
              :disabled="isActing"
              @click="acceptRequest"
            >
              <PhHeart class="size-4" />
              Accept
            </Button>
            <Button
              variant="outline"
              class="user-profile-page__decline min-w-[9rem]"
              :disabled="isActing"
              @click="rejectRequest"
            >
              Decline
            </Button>
          </template>

          <Button
            v-else-if="profile.relationship === 'pending_outgoing'"
            variant="outline"
            class="user-profile-page__pending min-w-[9rem]"
            disabled
          >
            Request sent
          </Button>

          <Button
            v-if="profile.relationship === 'friend'"
            class="user-profile-page__message min-w-[9rem]"
            @click="openChat"
          >
            <PhChatCircle class="size-4" />
            Message
          </Button>
        </div>

        <div
          v-else
          class="user-profile-page__self-note mt-6 flex justify-center"
        >
          <Button as-child variant="outline" class="user-profile-page__edit">
            <RouterLink to="/profile">
              <PhPencilSimple class="size-4" />
              Edit your profile
            </RouterLink>
          </Button>
        </div>

        <section class="user-profile-page__about mt-8">
          <h2 class="user-profile-page__about-title text-sm font-medium text-foreground">
            About
          </h2>

          <div
            v-if="hasAboutInfo"
            class="user-profile-page__info-grid mt-4 grid gap-3 sm:grid-cols-2"
          >
            <div
              v-for="item in infoItems"
              :key="item.label"
              class="user-profile-page__info-item surface-inset flex items-start gap-3 p-4"
            >
              <span
                class="user-profile-page__info-icon flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
              >
                <component :is="item.icon" class="size-4" weight="duotone" />
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
            class="user-profile-page__about-empty mt-4 rounded-xl border border-dashed border-border/60 bg-background/20 px-4 py-8 text-center text-sm text-muted-foreground"
          >
            No public details yet.
          </p>
        </section>

        <section
          v-if="profile.relationship === 'friend' && friendsSinceFormatted"
          class="user-profile-page__friends-since mt-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center text-sm text-muted-foreground"
        >
          Friends since
          <span class="font-medium text-foreground">{{ friendsSinceFormatted }}</span>
        </section>
      </div>
    </article>
  </div>
</template>
