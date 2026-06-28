<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search } from 'lucide-vue-next'
import { Input } from '@/shared/ui/input'
import { youtubeAPI, type YoutubeVideo } from '@/shared/api/youtube.api'
import { extractYoutubeVideoId } from '../model/youtube.utils'

const emit = defineEmits<{
  select: [video: YoutubeVideo]
}>()

const searchQuery = ref('')
const suggestions = ref<YoutubeVideo[]>([])
const isSearching = ref(false)
const searchError = ref<string | null>(null)

async function searchVideos(query: string) {
  if (!query.trim()) {
    suggestions.value = []
    return
  }

  const videoId = extractYoutubeVideoId(query)
  if (videoId) {
    suggestions.value = [{ videoId, title: 'YouTube video' }]
    return
  }

  try {
    isSearching.value = true
    searchError.value = null
    suggestions.value = await youtubeAPI.searchVideos(query, 10)
  } catch (err: unknown) {
    searchError.value = err instanceof Error ? err.message : 'Failed to search'
    suggestions.value = []
  } finally {
    isSearching.value = false
  }
}

let searchDebounce: number | undefined
watch(searchQuery, (value) => {
  if (searchDebounce) clearTimeout(searchDebounce)

  if (!value.trim()) {
    suggestions.value = []
    searchError.value = null
    return
  }

  searchDebounce = window.setTimeout(() => {
    searchVideos(value)
  }, 400)
})

function selectVideo(video: YoutubeVideo) {
  suggestions.value = []
  searchQuery.value = ''
  searchError.value = null
  emit('select', video)
}

function submitSearch() {
  const videoId = extractYoutubeVideoId(searchQuery.value)
  if (videoId) {
    selectVideo({ videoId, title: 'YouTube video' })
    return
  }

  if (suggestions.value.length === 1) {
    selectVideo(suggestions.value[0]!)
  }
}
</script>

<template>
  <div class="youtube-video-search relative">
    <div class="youtube-video-search__field relative">
      <Search
        class="youtube-video-search__icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        v-model="searchQuery"
        class="youtube-video-search__input h-10 border-border/60 bg-background/60 pl-9 shadow-none"
        type="text"
        placeholder="Search or paste YouTube link"
        @keyup.enter="submitSearch"
      />
    </div>

    <p v-if="searchError" class="youtube-video-search__error mt-2 text-xs text-destructive">
      {{ searchError }}
    </p>

    <p
      v-else-if="isSearching"
      class="youtube-video-search__status mt-2 text-xs text-muted-foreground"
    >
      Searching...
    </p>

    <ul
      v-if="suggestions.length"
      class="youtube-video-search__suggestions absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-border/60 bg-card/95 p-1 shadow-lg backdrop-blur-sm"
    >
      <li
        v-for="video in suggestions"
        :key="video.videoId"
        class="youtube-video-search__item flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
        @click="selectVideo(video)"
      >
        <img
          v-if="video.thumbnailUrl"
          :src="video.thumbnailUrl"
          alt=""
          class="youtube-video-search__thumbnail size-10 shrink-0 rounded-md object-cover"
        />
        <div class="youtube-video-search__meta min-w-0 flex-1">
          <p class="youtube-video-search__title truncate text-sm font-medium">
            {{ video.title }}
          </p>
          <p
            v-if="video.channelTitle"
            class="youtube-video-search__channel truncate text-xs text-muted-foreground"
          >
            {{ video.channelTitle }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>
