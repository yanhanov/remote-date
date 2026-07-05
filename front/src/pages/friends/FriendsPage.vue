<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import { toast } from 'vue-sonner'
import {
  PhMagnifyingGlass,
  PhSpinner,
  PhUserPlus,
  PhChatCircle,
  PhUsers,
} from '@phosphor-icons/vue'
import { FriendsMemberCard } from '@/features/friends'
import { socialAPI } from '@/shared/api/social.api'
import type {
  FriendItem,
  FriendRequestItem,
  PublicUserSummary,
} from '@/shared/api/social.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type FriendsTab = 'network' | 'search'

const friends = ref<FriendItem[]>([])
const incoming = ref<FriendRequestItem[]>([])
const outgoing = ref<FriendRequestItem[]>([])
const searchQuery = ref('')
const searchResults = ref<PublicUserSummary[]>([])
const isLoading = ref(true)
const isSearching = ref(false)
const actingRequestId = ref<string | null>(null)
const activeTab = ref<FriendsTab>('network')

const pendingCount = computed(() => incoming.value.length + outgoing.value.length)

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

function relationshipLabel(relationship?: string) {
  if (!relationship || relationship === 'none') return 'Not connected'
  return relationship.replace('_', ' ')
}

async function switchTab(tab: FriendsTab) {
  activeTab.value = tab

  if (tab === 'search') {
    await nextTick()
    document.getElementById('friends-search')?.focus()
  }
}

onMounted(loadAll)

watchDebounced(searchQuery, searchUsers, { debounce: 350 })
</script>

<template>
  <div class="friends-page flex min-h-full flex-1 flex-col">
    <div
      class="friends-page__center flex flex-1 flex-col items-center justify-start p-6 md:p-10"
    >
      <div class="friends-page__container w-full max-w-md space-y-8">
        <header class="friends-page__header space-y-3">
          <p
            class="friends-page__eyebrow text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            Social
          </p>
          <div class="friends-page__brand flex items-center gap-4">
            <span
              class="friends-page__icon flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20"
            >
              <PhUsers class="size-7 text-primary" weight="duotone" />
            </span>
            <div class="min-w-0">
              <h1 class="friends-page__title page-title text-3xl md:text-[2rem]">Friends</h1>
              <p class="friends-page__subtitle page-subtitle mt-1">
                Manage your network or find someone new to watch with.
              </p>
            </div>
          </div>
        </header>

        <div class="friends-page__content space-y-5">
          <nav
            class="friends-page__tabs flex rounded-xl border border-border/70 bg-card/50 p-1 backdrop-blur-sm"
            aria-label="Friends sections"
          >
            <button
              type="button"
              class="friends-page__tab friends-page__tab--network relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors"
              :class="
                activeTab === 'network'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="switchTab('network')"
            >
              My network
              <span
                v-if="pendingCount"
                class="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold leading-none text-primary-foreground"
              >
                {{ pendingCount }}
              </span>
            </button>
            <button
              type="button"
              class="friends-page__tab friends-page__tab--search flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors"
              :class="
                activeTab === 'search'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="switchTab('search')"
            >
              <PhMagnifyingGlass class="size-4" />
              Find people
            </button>
          </nav>

          <section v-if="activeTab === 'search'" class="friends-page__search space-y-3">
            <div class="friends-page__search-field relative">
              <PhMagnifyingGlass class="input-adornment input-adornment--leading" />
              <Input
                id="friends-search"
                v-model="searchQuery"
                class="friends-page__search-input h-11 rounded-xl border-border/80 bg-background pl-9 pr-10 shadow-none"
                placeholder="Username, name or email"
                autocomplete="off"
              />
              <PhSpinner
                v-if="isSearching"
                class="input-adornment input-adornment--trailing animate-spin"
              />
            </div>

            <p
              v-if="!searchQuery.trim()"
              class="friends-page__search-hint text-center text-xs text-muted-foreground"
            >
              Start typing to discover people on Remote Date.
            </p>

            <div
              v-else-if="!isSearching && !searchResults.length"
              class="friends-page__search-empty rounded-xl border border-border/70 bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground backdrop-blur-sm"
            >
              No users found for «{{ searchQuery.trim() }}».
            </div>

            <div v-else class="friends-page__search-results flex flex-col gap-2">
              <FriendsMemberCard
                v-for="user in searchResults"
                :key="user.userId"
                class="friends-page__search-item"
                :user="user"
                :subtitle="
                  user.username ? `@${user.username}` : relationshipLabel(user.relationship)
                "
              >
                <template v-if="user.relationship === 'none'" #actions>
                  <Button
                    type="button"
                    size="sm"
                    class="h-9 rounded-xl px-3"
                    @click="sendRequest(user.userId)"
                  >
                    <PhUserPlus class="size-3.5" />
                    Add
                  </Button>
                </template>
              </FriendsMemberCard>
            </div>
          </section>

          <section v-else class="friends-page__network">
            <div v-if="isLoading" class="friends-page__loading flex justify-center py-12">
              <PhSpinner class="size-6 animate-spin text-muted-foreground" />
            </div>

            <div v-else class="friends-page__sections flex flex-col gap-2">
              <template v-if="incoming.length">
                <p
                  class="friends-page__section-label mb-1 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Incoming requests
                </p>
                <FriendsMemberCard
                  v-for="request in incoming"
                  :key="request.requestId"
                  class="friends-page__request-in"
                  :user="request"
                  variant="incoming"
                  subtitle="Wants to be friends"
                >
                  <template #actions>
                    <Button
                      size="sm"
                      class="h-9 rounded-xl px-3"
                      :disabled="actingRequestId === request.requestId"
                      @click="acceptRequest(request.requestId)"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      class="h-9 rounded-xl border-2 px-3 font-medium"
                      :disabled="actingRequestId === request.requestId"
                      @click="rejectRequest(request.requestId)"
                    >
                      Decline
                    </Button>
                  </template>
                </FriendsMemberCard>
              </template>

              <template v-if="outgoing.length">
                <p
                  class="friends-page__section-label mb-1 mt-4 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Sent requests
                </p>
                <FriendsMemberCard
                  v-for="request in outgoing"
                  :key="request.requestId"
                  class="friends-page__request-out"
                  :user="request"
                  variant="pending"
                  subtitle="Request sent"
                >
                  <template #actions>
                    <Button
                      size="sm"
                      variant="outline"
                      class="h-9 rounded-xl border-2 px-3 font-medium"
                      :disabled="actingRequestId === request.requestId"
                      @click="rejectRequest(request.requestId)"
                    >
                      Cancel
                    </Button>
                  </template>
                </FriendsMemberCard>
              </template>

              <p
                class="friends-page__section-label mb-1 mt-4 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                Your friends
                <span v-if="friends.length" class="normal-case text-muted-foreground/80">
                  · {{ friends.length }}
                </span>
              </p>

              <p
                v-if="!friends.length"
                class="friends-page__empty rounded-xl border border-border/70 bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground backdrop-blur-sm"
              >
                No friends yet.
                <button
                  type="button"
                  class="mt-2 block w-full font-medium text-primary hover:underline"
                  @click="switchTab('search')"
                >
                  Find people to add
                </button>
              </p>

              <FriendsMemberCard
                v-for="friend in friends"
                :key="friend.userId"
                class="friends-page__friend"
                :user="friend"
                :subtitle="friend.username ? `@${friend.username}` : 'Tap to view profile'"
              >
                <template #actions>
                  <RouterLink
                    :to="`/messages/${friend.userId}`"
                    class="friends-page__friend-message flex size-9 items-center justify-center rounded-xl border border-border bg-background/80 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                    aria-label="Message"
                  >
                    <PhChatCircle class="size-4" />
                  </RouterLink>
                </template>
              </FriendsMemberCard>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
