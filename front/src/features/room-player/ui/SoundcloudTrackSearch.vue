<script setup lang="ts">
import { ref, watch } from 'vue'
import { PhMagnifyingGlass, PhSpinner } from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import SoundCloudIcon from '@/shared/ui/icons/SoundCloudIcon.vue'
import {
  soundCloudAPI,
  type SoundCloudTrack,
  type SoundCloudPlaylist,
} from '@/shared/api/soundcloud.api'
import type { SoundTrack } from '../model/soundcloud.types'

defineProps<{
  roomId: string
  participants: number
  isSelectingTrack?: boolean
}>()

const emit = defineEmits<{
  'select-track': [track: SoundCloudTrack, queue: SoundTrack[]]
  'select-playlist': [playlist: SoundCloudPlaylist]
  'submit-url': [url: string]
}>()

const searchQuery = ref('')
const searchType = ref<'track' | 'album'>('track')
const isSearching = ref(false)
const suggestions = ref<(SoundCloudTrack | SoundCloudPlaylist)[]>([])

async function searchSuggestions(query: string) {
  if (!query.trim()) {
    suggestions.value = []
    return
  }

  try {
    isSearching.value = true
    const filter = searchType.value === 'album' ? 'playlists' : 'tracks'
    const limit = searchType.value === 'album' ? 5 : 20
    const items = await soundCloudAPI.searchTracks(query, limit, filter)
    suggestions.value = [...items].sort((a, b) => {
      const playable = (item: SoundCloudTrack | SoundCloudPlaylist) =>
        'streamUrl' in item && item.streamUrl ? 0 : 1
      return playable(a) - playable(b)
    })
  } catch (e: unknown) {
    console.error(e)
    toast.error(e instanceof Error ? e.message : 'Failed to search')
  } finally {
    isSearching.value = false
  }
}

let searchDebounce: number | undefined

watch([searchQuery, searchType], ([val]) => {
  if (searchDebounce) clearTimeout(searchDebounce)

  if (!val || !String(val).trim()) {
    suggestions.value = []
    isSearching.value = false
    return
  }

  searchDebounce = window.setTimeout(() => {
    searchSuggestions(String(val))
  }, 500)
})

function handleItemClick(item: SoundCloudTrack | SoundCloudPlaylist) {
  const isPlaylist = 'kind' in item && item.kind === 'playlist'
  if (isPlaylist) {
    pickPlaylist(item)
  } else {
    pickTrack(item as SoundCloudTrack)
  }
}

function pickTrack(track: SoundCloudTrack) {
  const trackItems = suggestions.value.filter(
    (s): s is SoundCloudTrack => !('kind' in s && s.kind === 'playlist'),
  )
  const selectedIndex = trackItems.findIndex((t) => t.id === track.id)
  const queue = selectedIndex !== -1 ? trackItems.slice(selectedIndex) : [track]

  suggestions.value = []
  searchQuery.value = ''
  emit('select-track', track, queue)
}

function pickPlaylist(playlist: SoundCloudPlaylist) {
  suggestions.value = []
  emit('select-playlist', playlist)
}

function submitSearch() {
  emit('submit-url', searchQuery.value.trim())
}
</script>

<template>
  <section
    class="soundcloud-track-search relative shrink-0 surface p-4"
    :class="{ 'soundcloud-track-search--open z-30': suggestions.length }"
  >
    <header
      class="soundcloud-track-search__header mb-4 flex items-center justify-between gap-3"
    >
      <div class="soundcloud-track-search__meta flex min-w-0 items-center gap-2.5">
        <span
          class="soundcloud-track-search__icon flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ff5500]/15"
        >
          <SoundCloudIcon class="soundcloud-track-search__icon-svg size-5" />
        </span>
        <div class="min-w-0">
          <h1 class="soundcloud-track-search__title truncate text-sm font-medium">
            SoundCloud Room
          </h1>
          <p class="soundcloud-track-search__room-id truncate text-xs text-muted-foreground">
            {{ roomId.slice(0, 8) }} · {{ participants }} online
          </p>
        </div>
      </div>

      <div class="soundcloud-track-search__filters flex shrink-0 gap-1 rounded-lg bg-muted/40 p-1">
        <Button
          :variant="searchType === 'track' ? 'secondary' : 'ghost'"
          size="sm"
          class="soundcloud-track-search__filter soundcloud-track-search__filter--track h-7 px-2.5 text-xs"
          @click="searchType = 'track'"
        >
          Track
        </Button>
        <Button
          :variant="searchType === 'album' ? 'secondary' : 'ghost'"
          size="sm"
          class="soundcloud-track-search__filter soundcloud-track-search__filter--album h-7 px-2.5 text-xs"
          @click="searchType = 'album'"
        >
          Album
        </Button>
      </div>
    </header>

    <div class="soundcloud-track-search__field relative">
      <div class="soundcloud-track-search__input-wrap relative">
        <span
          class="soundcloud-track-search__icon-wrap input-adornment input-adornment--leading flex items-center justify-center"
        >
          <PhSpinner
            v-if="isSearching || isSelectingTrack"
            class="soundcloud-track-search__search-icon soundcloud-track-search__search-icon--loading size-4 animate-spin"
          />
          <PhMagnifyingGlass v-else class="soundcloud-track-search__search-icon size-4" />
        </span>
        <Input
          v-model="searchQuery"
          class="soundcloud-track-search__input h-10 border-border/60 bg-background/60 pl-9 shadow-none"
          type="text"
          :placeholder="
            searchType === 'track'
              ? 'Search tracks or paste SoundCloud URL'
              : 'Search albums'
          "
          @keyup.enter="submitSearch"
        />
      </div>

      <ul
        v-if="suggestions.length"
        class="soundcloud-track-search__suggestions absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-card/95 p-1 shadow-lg backdrop-blur-sm"
      >
        <li
          v-for="item in suggestions"
          :key="item.id"
          class="soundcloud-track-search__suggestion flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
          @click="handleItemClick(item)"
        >
          <img
            v-if="item.artworkUrl"
            :src="item.artworkUrl"
            alt=""
            class="soundcloud-track-search__suggestion-art size-10 shrink-0 rounded-md object-cover"
          />
          <div class="soundcloud-track-search__suggestion-meta min-w-0 flex-1">
            <p class="soundcloud-track-search__suggestion-title truncate text-sm font-medium">
              {{ item.title }}
            </p>
            <p
              class="soundcloud-track-search__suggestion-subtitle truncate text-xs text-muted-foreground"
            >
              {{ item.username }}
              <span v-if="'trackCount' in item && item.trackCount">
                · {{ item.trackCount }} tracks
              </span>
            </p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
