<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import { PhMagnifyingGlass, PhSpinner, PhUserPlus, PhChatCircle } from '@phosphor-icons/vue'
import { UserAvatar } from '@/entities/user'
import { socialAPI } from '@/shared/api/social.api'
import type {
  FriendItem,
  FriendRequestItem,
  PublicUserSummary,
} from '@/shared/api/social.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const friends = ref<FriendItem[]>([])
const incoming = ref<FriendRequestItem[]>([])
const outgoing = ref<FriendRequestItem[]>([])
const searchQuery = ref('')
const searchResults = ref<PublicUserSummary[]>([])
const isLoading = ref(true)
const isSearching = ref(false)
const actingRequestId = ref<string | null>(null)

async function loadAll() {
  isLoading.value = true
  try {
    const [friendsList, requests] = await Promise.all([
      socialAPI.getFriends(),
      socialAPI.getFriendRequests(),
    ])
    friends.value = friendsList
    incoming.value = requests.incoming
    outgoing.value = requests.outgoing
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Failed to load friends')
  } finally {
    isLoading.value = false
  }
}

async function searchUsers() {
  const query = searchQuery.value.trim()
  if (!query) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  try {
    searchResults.value = await socialAPI.searchUsers(query)
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Search failed')
  } finally {
    isSearching.value = false
  }
}

async function sendRequest(userId: string) {
  try {
    await socialAPI.sendFriendRequest(userId)
    toast.success('Friend request sent')
    await loadAll()
    await searchUsers()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Failed to send request')
  }
}

async function acceptRequest(requestId: string) {
  actingRequestId.value = requestId
  try {
    await socialAPI.acceptFriendRequest(requestId)
    toast.success('Friend request accepted')
    await loadAll()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Failed to accept request')
  } finally {
    actingRequestId.value = null
  }
}

async function rejectRequest(requestId: string) {
  actingRequestId.value = requestId
  try {
    await socialAPI.rejectFriendRequest(requestId)
    toast.success('Request declined')
    await loadAll()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Failed to decline request')
  } finally {
    actingRequestId.value = null
  }
}

onMounted(loadAll)
</script>

<template>
  <div class="friends-page w-full max-w-2xl flex-1 p-6 md:p-8 lg:p-10">
    <header class="friends-page__header mb-6">
      <h1 class="friends-page__title page-title">Friends</h1>
      <p class="friends-page__subtitle page-subtitle mt-1">
        Find people, manage requests, and watch together.
      </p>
    </header>

    <section class="friends-page__search mb-6 space-y-3">
      <form class="friends-page__search-form flex gap-2" @submit.prevent="searchUsers">
        <Input
          v-model="searchQuery"
          class="friends-page__search-input"
          placeholder="Search by username, name or email"
        />
        <Button type="submit" variant="outline" :disabled="isSearching">
          <PhMagnifyingGlass class="size-4" />
        </Button>
      </form>

      <div v-if="searchResults.length" class="friends-page__search-results space-y-2">
        <RouterLink
          v-for="user in searchResults"
          :key="user.userId"
          :to="`/users/${user.userId}`"
          class="friends-page__search-item group flex items-center gap-3 surface p-3 transition-colors hover:bg-muted/30"
        >
          <UserAvatar :user="user" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ user.displayName }}</p>
            <p class="text-xs text-muted-foreground">
              <span v-if="user.username">@{{ user.username }}</span>
              <span v-else class="capitalize">{{ user.relationship?.replace('_', ' ') || 'none' }}</span>
            </p>
          </div>
          <Button
            v-if="user.relationship === 'none'"
            type="button"
            size="sm"
            variant="outline"
            class="shrink-0"
            @click.prevent="sendRequest(user.userId)"
          >
            <PhUserPlus class="size-3.5" />
            Add
          </Button>
        </RouterLink>
      </div>
    </section>

    <div v-if="isLoading" class="flex justify-center py-12">
      <PhSpinner class="size-6 animate-spin text-muted-foreground" />
    </div>

    <div v-else class="friends-page__sections space-y-6">
      <section v-if="incoming.length" class="friends-page__requests-in space-y-2">
        <h2 class="text-sm font-medium">Incoming requests</h2>
        <div
          v-for="request in incoming"
          :key="request.requestId"
          class="flex items-center gap-3 surface p-3"
        >
          <RouterLink :to="`/users/${request.userId}`" class="flex min-w-0 flex-1 items-center gap-3">
            <UserAvatar :user="request" />
            <p class="truncate text-sm font-medium">{{ request.displayName }}</p>
          </RouterLink>
          <div class="flex shrink-0 gap-2">
            <Button
              size="sm"
              :disabled="actingRequestId === request.requestId"
              @click="acceptRequest(request.requestId)"
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="actingRequestId === request.requestId"
              @click="rejectRequest(request.requestId)"
            >
              Decline
            </Button>
          </div>
        </div>
      </section>

      <section v-if="outgoing.length" class="friends-page__requests-out space-y-2">
        <h2 class="text-sm font-medium">Sent requests</h2>
        <div
          v-for="request in outgoing"
          :key="request.requestId"
          class="flex items-center gap-3 surface p-3"
        >
          <RouterLink :to="`/users/${request.userId}`" class="flex min-w-0 flex-1 items-center gap-3">
            <UserAvatar :user="request" />
            <p class="truncate text-sm font-medium">{{ request.displayName }}</p>
          </RouterLink>
          <Button
            size="sm"
            variant="ghost"
            :disabled="actingRequestId === request.requestId"
            @click="rejectRequest(request.requestId)"
          >
            Cancel
          </Button>
        </div>
      </section>

      <section class="friends-page__list space-y-2">
        <h2 class="text-sm font-medium">Your friends</h2>
        <p v-if="!friends.length" class="text-sm text-muted-foreground">
          No friends yet. Search for people above.
        </p>
        <div
          v-for="friend in friends"
          :key="friend.userId"
          class="friends-page__friend flex items-center gap-3 surface p-3"
        >
          <RouterLink
            :to="`/users/${friend.userId}`"
            class="group flex min-w-0 flex-1 items-center gap-3 transition-colors hover:opacity-90"
          >
            <UserAvatar :user="friend" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ friend.displayName }}</p>
              <p class="text-xs text-muted-foreground">View profile</p>
            </div>
          </RouterLink>
          <RouterLink
            :to="`/messages/${friend.userId}`"
            class="friends-page__friend-message flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label="Message"
          >
            <PhChatCircle class="size-4" />
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>
