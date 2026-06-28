<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { roomAPI } from "@/shared/api/room.api";
import type { VideoRoom, VideoState } from "@/shared/api/room.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { SoundPlayerBar } from "@/features/room-player";
import { socketService } from "@/shared/api/socket.service";
import { useChat, RoomChatPanel } from "@/features/room-chat";
import {
  soundCloudAPI,
  type SoundCloudTrack,
  type SoundCloudPlaylist,
} from "@/shared/api/soundcloud.api";
import { toast } from "vue-sonner";

const route = useRoute();
const router = useRouter();

const roomId = route.params.id as string;
const room = ref<VideoRoom | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const participants = ref(0);
const { messages, newMessage, send, sendFile, currentUserName } =
  useChat(roomId);

const searchQuery = ref("");
const searchType = ref<"track" | "album">("track");
const currentTrackUrl = ref<string | null>(null);
const currentTrackTitle = ref<string | null>(null);
const currentTrackArtist = ref<string | null>(null);
const currentArtworkUrl = ref<string | null>(null);
const audioRef = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(100);
const muted = ref(false);
const isSearching = ref(false);
const suggestions = ref<(SoundCloudTrack | SoundCloudPlaylist)[]>([]);

type SoundTrack = SoundCloudTrack;

// Очередь треков: текущий + следующие
const trackQueue = ref<SoundTrack[]>([]);
const currentQueueIndex = ref<number | null>(null);

// Флаг, чтобы отличать локальные действия от действий, инициированных сервером
const isLocalAction = ref(false);
function loadTrack() {
  if (!searchQuery.value.trim()) {
    toast.error("Please enter a SoundCloud track URL");
    return;
  }

  const value = searchQuery.value.trim();

  // Простая логика: если это URL — встраиваем, иначе игнорируем.
  if (value.startsWith("http://") || value.startsWith("https://")) {
    currentTrackUrl.value = value;
    currentTrackTitle.value = "Custom URL";
    currentTrackArtist.value = null;
    toast.success("Track loaded. You can control playback in the player.");
  } else {
    toast.error("Right now only direct SoundCloud track URLs are supported.");
  }
}

async function loadTrackFromChat(url: string) {
  if (!url) return;
  searchQuery.value = url;
  currentTrackUrl.value = url;
  currentTrackTitle.value = "Shared track";
  currentTrackArtist.value = null;
  toast.success("Track from chat loaded to player");

  // Обновляем очередь: только этот трек
  trackQueue.value = [
    {
      id: url,
      permalinkUrl: url,
      streamUrl: url,
      title: currentTrackTitle.value ?? undefined,
      username: currentTrackArtist.value ?? undefined,
      artworkUrl: currentArtworkUrl.value ?? undefined,
    } as any as SoundTrack,
  ];
  currentQueueIndex.value = 0;

  emitTrackChange();
  await nextTick();
  const audio = audioRef.value;
  if (audio) {
    try {
      await audio.play();
    } catch (e) {
      console.error("Failed to autoplay", e);
    }
  }
}

async function searchSuggestions(query: string) {
  if (!query.trim()) {
    suggestions.value = [];
    return;
  }

  try {
    isSearching.value = true;
    const filter = searchType.value === "album" ? "playlists" : "tracks";
    const limit = searchType.value === "album" ? 5 : 20;
    const items = await soundCloudAPI.searchTracks(query, limit, filter);
    suggestions.value = items;
  } catch (e: any) {
    console.error(e);
    toast.error(e.message || "Failed to search");
  } finally {
    isSearching.value = false;
  }
}

let searchDebounce: number | undefined;
watch([searchQuery, searchType], ([val]) => {
  if (searchDebounce) {
    clearTimeout(searchDebounce);
  }

  if (!val || !String(val).trim()) {
    suggestions.value = [];
    return;
  }

  searchDebounce = window.setTimeout(() => {
    searchSuggestions(String(val));
  }, 500);
});

async function selectTrack(track: SoundCloudTrack) {
  if (!track.streamUrl) {
    toast.error(
      "This track cannot be played with custom player (no stream URL).",
    );
    return;
  }

  const trackItems = suggestions.value.filter(
    (s): s is SoundCloudTrack => "streamUrl" in s && s.streamUrl != null,
  );
  const selectedIndex = trackItems.findIndex(
    (t) => t.permalinkUrl === track.permalinkUrl,
  );

  currentTrackUrl.value = track.streamUrl;
  currentTrackTitle.value = track.title ?? null;
  currentTrackArtist.value = track.username ?? null;
  currentArtworkUrl.value = track.artworkUrl ?? null;
  suggestions.value = [];
  toast.success("Track selected.");

  // Добавляем в очередь: выбранный трек + все следующие из результатов поиска
  const queueSlice =
    selectedIndex !== -1 ? trackItems.slice(selectedIndex) : [track];
  trackQueue.value = queueSlice.length ? queueSlice : [track];
  currentQueueIndex.value = 0;

  emitTrackChange();
  await nextTick();
  const audio = audioRef.value;
  if (audio) {
    try {
      await audio.play();
    } catch (e) {
      console.error("Failed to autoplay", e);
    }
  }
}

function emitTrackChange() {
  socketService.emit("audio:track_change", {
    roomId,
    trackUrl: currentTrackUrl.value ?? "",
    title: currentTrackTitle.value,
    artist: currentTrackArtist.value,
    artworkUrl: currentArtworkUrl.value,
    queue: trackQueue.value.map((t) => ({
      id: t.id,
      streamUrl: t.streamUrl ?? "",
      title: t.title ?? null,
      username: t.username ?? null,
      artworkUrl: t.artworkUrl ?? null,
      permalinkUrl: t.permalinkUrl,
      durationMs: t.durationMs,
    })),
    queueIndex: currentQueueIndex.value ?? 0,
  });
}

async function selectPlaylist(playlist: SoundCloudPlaylist) {
  try {
    isSearching.value = true;
    const tracks = await soundCloudAPI.getPlaylistTracks(playlist.id);
    const playable = tracks.filter((t) => t.streamUrl);

    if (!playable.length) {
      toast.error("No playable tracks in this album.");
      return;
    }

    suggestions.value = [];
    trackQueue.value = playable;
    currentQueueIndex.value = 0;

    const first = playable[0]!;
    currentTrackUrl.value = first.streamUrl!;
    currentTrackTitle.value = first.title ?? null;
    currentTrackArtist.value = first.username ?? null;
    currentArtworkUrl.value = first.artworkUrl ?? null;

    emitTrackChange();
    toast.success(`Album loaded: ${playable.length} tracks`);

    await nextTick();
    const audio = audioRef.value;
    if (audio) {
      try {
        await audio.play();
      } catch (e) {
        console.error("Failed to autoplay", e);
      }
    }
  } catch (e: any) {
    console.error(e);
    toast.error(e.message || "Failed to load album");
  } finally {
    isSearching.value = false;
  }
}

function togglePlay() {
  const audio = audioRef.value;
  if (!audio || !currentTrackUrl.value) return;

  // Если действие пришло с сервера — просто меняем локальное состояние без повторной отправки
  if (isLocalAction.value) {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
    return;
  }

  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

function onLoadedMetadata() {
  const audio = audioRef.value;
  if (!audio) return;
  duration.value = audio.duration || 0;
  // Sync initial volume state with the audio element
  volume.value = (audio.volume ?? 1) * 100;
  muted.value = audio.muted;
}

function onTimeUpdate() {
  const audio = audioRef.value;
  if (!audio) return;
  currentTime.value = audio.currentTime || 0;
}

function onPlay() {
  isPlaying.value = true;

  const audio = audioRef.value;
  if (!audio || !currentTrackUrl.value) return;

  // Не рассылаем событие, если воспроизведение запущено по сигналу сервера
  if (isLocalAction.value) return;

  socketService.emit("video:play", {
    roomId,
    currentTime: audio.currentTime || 0,
  });
}

function onPause() {
  isPlaying.value = false;

  const audio = audioRef.value;
  if (!audio || !currentTrackUrl.value) return;

  // Не рассылаем событие, если пауза пришла с сервера
  if (isLocalAction.value) return;

  socketService.emit("video:pause", {
    roomId,
    currentTime: audio.currentTime || 0,
  });
}

function seek(e: Event) {
  const audio = audioRef.value;
  if (!audio) return;
  const target = e.target as HTMLInputElement;
  const value = Number(target.value);
  audio.currentTime = (value / 100) * (duration.value || 1);

  // Не отправляем событие, если это синхронизация с сервера
  if (isLocalAction.value) return;

  socketService.emit("video:seek", {
    roomId,
    currentTime: audio.currentTime || 0,
  });
}

function toggleMute() {
  const audio = audioRef.value;
  if (!audio) return;

  const nextMuted = !audio.muted;
  audio.muted = nextMuted;
  muted.value = nextMuted;
}

function changeVolume(value: number) {
  const audio = audioRef.value;
  if (!audio) return;

  const clamped = Math.max(0, Math.min(100, value));
  volume.value = clamped;
  audio.volume = clamped / 100;

  if (clamped === 0) {
    audio.muted = true;
    muted.value = true;
  } else if (muted.value && audio.muted) {
    audio.muted = false;
    muted.value = false;
  }
}

// --- Обработчики событий синхронизации от других участников ---

let audioStateRetryCount = 0;
const MAX_AUDIO_STATE_RETRIES = 20;
let lastRemoteSeekAt = 0;

function applyRemoteState(targetTime: number, playing: boolean) {
  const audio = audioRef.value;
  if (!audio || !currentTrackUrl.value) return;

  try {
    isLocalAction.value = true;

    // Устанавливаем позицию
    audio.currentTime = Math.max(0, targetTime);

    if (playing) {
      audio.play();
    } else {
      audio.pause();
    }

    setTimeout(() => {
      isLocalAction.value = false;
    }, 500);
  } catch (e) {
    console.error("Error applying remote audio state:", e);
    setTimeout(() => {
      isLocalAction.value = false;
    }, 500);
  }
}

function handleAudioState(state: VideoState) {
  const audio = audioRef.value;
  if (!audio || !currentTrackUrl.value) {
    audioStateRetryCount++;
    if (audioStateRetryCount >= MAX_AUDIO_STATE_RETRIES) {
      console.warn(
        "Audio not ready after maximum retries, skipping state sync",
      );
      audioStateRetryCount = 0;
      return;
    }
    setTimeout(() => handleAudioState(state), 500);
    return;
  }

  audioStateRetryCount = 0;

  const delay = (Date.now() - state.timestamp) / 1000;
  const targetTime = Math.max(0, state.currentTime + delay);

  applyRemoteState(targetTime, state.isPlaying);
}

function handleAudioPlay(data: { currentTime: number; timestamp: number }) {
  const audio = audioRef.value;
  if (!audio || !currentTrackUrl.value || isLocalAction.value) return;

  const networkDelay = (Date.now() - data.timestamp) / 1000;
  const targetTime = Math.max(0, data.currentTime + networkDelay);

  applyRemoteState(targetTime, true);
}

function handleAudioPause(data: { currentTime: number; timestamp: number }) {
  const audio = audioRef.value;
  if (!audio || !currentTrackUrl.value || isLocalAction.value) return;

  // Если сразу после перемотки пришла пауза — игнорируем её,
  // чтобы не останавливать воспроизведение у других пользователей.
  if (Date.now() - lastRemoteSeekAt < 400) {
    return;
  }

  const networkDelay = (Date.now() - data.timestamp) / 1000;
  const targetTime = Math.max(0, data.currentTime + networkDelay);

  applyRemoteState(targetTime, false);
}

function handleAudioSeek(data: { currentTime: number; timestamp: number }) {
  const audio = audioRef.value;
  if (!audio || !currentTrackUrl.value || isLocalAction.value) return;

  lastRemoteSeekAt = Date.now();

  const networkDelay = (Date.now() - data.timestamp) / 1000;
  const targetTime = Math.max(0, data.currentTime + networkDelay);

  // После перемотки оставляем текущее локальное состояние (играет/пауза),
  // чтобы не ломать синхронное прослушивание.
  applyRemoteState(targetTime, isPlaying.value);
}

function handleTrackChange(data: {
  trackUrl: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
  queue?: {
    id: string | number;
    streamUrl: string;
    title?: string | null;
    username?: string | null;
    artworkUrl?: string | null;
    permalinkUrl?: string;
    durationMs?: number;
  }[];
  queueIndex?: number;
}) {
  if (!data.trackUrl) return;

  currentTrackUrl.value = data.trackUrl;
  currentTrackTitle.value = data.title ?? "Shared track";
  currentTrackArtist.value = data.artist ?? null;
  currentArtworkUrl.value = data.artworkUrl ?? null;

  if (data.queue?.length) {
    trackQueue.value = data.queue.map((t) => ({
      id: t.id,
      title: t.title ?? undefined,
      username: t.username ?? undefined,
      artworkUrl: t.artworkUrl ?? undefined,
      permalinkUrl: t.permalinkUrl ?? "",
      durationMs: t.durationMs ?? 0,
      streamUrl: t.streamUrl,
    })) as SoundTrack[];
    currentQueueIndex.value = data.queueIndex ?? 0;
  }
}

// Перейти к треку в очереди по индексу
async function goToQueueIndex(index: number, autoplay = true) {
  if (!trackQueue.value.length || index < 0 || index >= trackQueue.value.length)
    return;

  const track = trackQueue.value[index];
  if (!track?.streamUrl) return;

  currentQueueIndex.value = index;
  currentTrackUrl.value = track.streamUrl;
  currentTrackTitle.value = track.title ?? null;
  currentTrackArtist.value = track.username ?? null;
  currentArtworkUrl.value = track.artworkUrl ?? null;

  emitTrackChange();
  if (autoplay) {
    await nextTick();
    const audio = audioRef.value;
    if (audio) {
      try {
        await audio.play();
      } catch (e) {
        console.error("Failed to autoplay", e);
      }
    }
  }
}

async function playNextInQueue() {
  if (!trackQueue.value.length || currentQueueIndex.value === null) return;

  const nextIndex = currentQueueIndex.value + 1;
  if (nextIndex >= trackQueue.value.length) {
    isPlaying.value = false;
    return;
  }

  await goToQueueIndex(nextIndex);
}

async function playPrevInQueue() {
  if (!trackQueue.value.length || currentQueueIndex.value === null) return;

  const prevIndex = currentQueueIndex.value - 1;
  if (prevIndex < 0) return;

  await goToQueueIndex(prevIndex);
}

function reorderQueue(newOrderIds: (string | number)[]) {
  const byId = new Map<string | number, SoundTrack>(
    trackQueue.value.map((t) => [t.id, t]),
  );
  const reordered = newOrderIds
    .map((id) => byId.get(id))
    .filter((t): t is SoundTrack => t != null);

  if (reordered.length !== trackQueue.value.length) return;

  const currentId = trackQueue.value[currentQueueIndex.value ?? 0]?.id;
  trackQueue.value = reordered;
  const newIndex = reordered.findIndex((t) => t.id === currentId);
  currentQueueIndex.value = newIndex >= 0 ? newIndex : 0;

  emitTrackChange();
}

onMounted(async () => {
  try {
    room.value = await roomAPI.getRoom(roomId);

    if (!room.value || room.value.type !== "soundcloud") {
      error.value = "SoundCloud room not found";
      loading.value = false;
      return;
    }

    participants.value = room.value.participants;

    // Если в комнате уже есть выбранный SoundCloud трек – подхватываем его и метаданные
    if (room.value.soundcloudUrl) {
      currentTrackUrl.value = room.value.soundcloudUrl;
      currentTrackTitle.value = room.value.soundcloudTitle ?? "Current track";
      currentTrackArtist.value = room.value.soundcloudArtist ?? null;
      currentArtworkUrl.value = room.value.soundcloudArtworkUrl ?? null;
    }

    socketService.connect();
    socketService.emit("room:join", roomId);

    socketService.on("room:user_joined", (data) => {
      if (data.roomId === roomId) {
        participants.value = data.participants;
      }
    });

    socketService.on("room:user_left", (data) => {
      if (data.roomId === roomId) {
        participants.value = data.participants;
      }
    });

    // События синхронизации аудио (переиспользуем видео-события комнат)
    socketService.on("video:state", handleAudioState);
    socketService.on("video:play", handleAudioPlay);
    socketService.on("video:pause", handleAudioPause);
    socketService.on("video:seek", handleAudioSeek);
    socketService.on("video:sync", handleAudioState);

    // Смена трека в SoundCloud комнате
    socketService.on("audio:track_change", handleTrackChange);

    // Просим сервер отдать актуальное состояние (время/плей) для только что вошедшего
    socketService.emit("video:sync_request", roomId);

    loading.value = false;
  } catch (err: any) {
    console.error(err);
    error.value = err.message || "Failed to load SoundCloud room";
    loading.value = false;
  }
});

onUnmounted(() => {
  // Отключаемся от комнаты и убираем слушателей
  if (roomId) {
    socketService.emit("room:leave", roomId);
  }

  socketService.off("video:state");
  socketService.off("video:play");
  socketService.off("video:pause");
  socketService.off("video:seek");
  socketService.off("video:sync");
  socketService.off("audio:track_change");
  socketService.off("room:user_joined");
  socketService.off("room:user_left");
});
</script>

<template>
  <div class="p-6 py-0 space-y-4 relative">
    <Card v-if="loading">
      <CardContent class="p-6">
        <Skeleton class="w-full h-96" />
      </CardContent>
    </Card>

    <div v-else-if="error" class="text-center space-y-4">
      <p class="text-red-500">{{ error }}</p>
      <Button @click="router.push('/')">Go Home</Button>
    </div>

    <div v-else-if="room" class="grid gap-4 md:grid-cols-[2fr,1fr] relative">
      <!-- Left column: player & search -->
      <div class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>SoundCloud Room: {{ room.id.slice(0, 8) }}...</span>
              <span class="text-sm font-normal">
                Participants: {{ participants }}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <div class="flex gap-1 mb-1">
                <Button
                  :variant="searchType === 'track' ? 'secondary' : 'ghost'"
                  size="sm"
                  class="text-xs"
                  @click="searchType = 'track'"
                >
                  Track
                </Button>
                <Button
                  :variant="searchType === 'album' ? 'secondary' : 'ghost'"
                  size="sm"
                  class="text-xs"
                  @click="searchType = 'album'"
                >
                  Album
                </Button>
              </div>
              <input
                v-model="searchQuery"
                type="text"
                class="w-full px-3 py-2 border rounded-md text-sm"
                :placeholder="
                  searchType === 'track'
                    ? 'Search tracks or paste SoundCloud URL'
                    : 'Search albums'
                "
                @keyup.enter="loadTrack"
              />
              <div
                v-if="suggestions.length"
                class="absolute z-10 mt-1 w-full border rounded-md bg-background shadow-lg max-h-64 overflow-y-auto"
              >
                <div
                  v-for="item in suggestions"
                  :key="item.id"
                  class="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent"
                  @click="
                    'kind' in item && item.kind === 'playlist'
                      ? selectPlaylist(item)
                      : selectTrack(item as SoundCloudTrack)
                  "
                >
                  <img
                    v-if="item.artworkUrl"
                    :src="item.artworkUrl"
                    alt=""
                    class="w-8 h-8 rounded object-cover"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate">{{ item.title }}</p>
                    <p class="text-[10px] text-muted-foreground truncate">
                      {{ item.username }}
                      <span v-if="'trackCount' in item && item.trackCount">
                        · {{ item.trackCount }} tracks
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Right column: chat -->
      <RoomChatPanel
        :messages="messages"
        :new-message="newMessage"
        :current-user-name="currentUserName"
        @update:new-message="(v) => (newMessage = v)"
        @send="send"
        @playTrack="loadTrackFromChat"
        @sendFile="sendFile"
      />
    </div>
    <SoundPlayerBar
      :title="currentTrackTitle || 'No track selected'"
      :artist="currentTrackArtist || ''"
      :artwork-url="currentArtworkUrl || suggestions[0]?.artworkUrl || ''"
      :is-playing="isPlaying"
      :current-time="currentTime"
      :duration="duration"
      :can-play="!!currentTrackUrl"
      :volume="volume"
      :muted="muted"
      :queue="
        trackQueue.map((t) => ({
          id: t.id,
          title: t.title ?? null,
          artist: t.username ?? null,
        }))
      "
      :current-queue-index="currentQueueIndex ?? -1"
      @togglePlay="togglePlay"
      @seek="(value) => seek({ target: { value: String(value) } } as any)"
      @toggleMute="toggleMute"
      @changeVolume="changeVolume"
      :can-go-prev="(currentQueueIndex ?? 0) > 0 && trackQueue.length > 1"
      :can-go-next="
        (currentQueueIndex ?? -1) >= 0 &&
        (currentQueueIndex ?? 0) < trackQueue.length - 1
      "
      @prev="playPrevInQueue"
      @next="playNextInQueue"
      @selectQueueIndex="(index) => goToQueueIndex(index)"
      @reorderQueue="reorderQueue"
    />
    <audio
      ref="audioRef"
      :src="currentTrackUrl || undefined"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="playNextInQueue"
    />
  </div>
</template>
