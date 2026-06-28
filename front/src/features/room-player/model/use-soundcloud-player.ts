import { ref, nextTick, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import { socketService } from '@/shared/api/socket.service'
import type { VideoRoom, VideoState, SoundcloudQueueItem } from '@/shared/api/room.types'
import {
  soundCloudAPI,
  type SoundCloudTrack,
  type SoundCloudPlaylist,
} from '@/shared/api/soundcloud.api'
import type { SoundTrack, SoundcloudTrackChangePayload } from './soundcloud.types'

const MAX_AUDIO_STATE_RETRIES = 20
const LOCAL_ACTION_MS = 500
const SEEK_PAUSE_DEBOUNCE_MS = 400
const SYNC_TIME_THRESHOLD_SEC = 1.5

function mapQueueItem(t: SoundcloudQueueItem): SoundTrack {
  return {
    id: t.id,
    title: t.title ?? 'Untitled',
    username: t.username ?? undefined,
    artworkUrl: t.artworkUrl ?? undefined,
    permalinkUrl: t.permalinkUrl ?? '',
    durationMs: t.durationMs ?? 0,
    streamUrl: t.streamUrl,
  }
}

function mapQueueToPayload(queue: SoundTrack[]) {
  return queue.map((t) => ({
    id: t.id,
    streamUrl: t.streamUrl ?? '',
    title: t.title ?? null,
    username: t.username ?? null,
    artworkUrl: t.artworkUrl ?? null,
    permalinkUrl: t.permalinkUrl,
    durationMs: t.durationMs,
  }))
}

export function useSoundcloudPlayer(
  roomId: string,
  room: Ref<VideoRoom | null>,
  roomLoadedAt: Ref<number>,
) {
  const currentTrackUrl = ref<string | null>(null)
  const currentTrackTitle = ref<string | null>(null)
  const currentTrackArtist = ref<string | null>(null)
  const currentArtworkUrl = ref<string | null>(null)
  const audioRef = ref<HTMLAudioElement | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(100)
  const muted = ref(false)
  const trackQueue = ref<SoundTrack[]>([])
  const currentQueueIndex = ref<number | null>(null)
  const isSelectingTrack = ref(false)
  const isLocalAction = ref(false)

  let audioStateRetryCount = 0
  let lastRemoteSeekAt = 0
  let lastAppliedStateTs = 0
  let pendingApplyTs = 0
  let initialSyncApplied = false
  let pendingRemoteAutoplay = false
  let listenersBound = false

  function setLocalActionFlag() {
    isLocalAction.value = true
    setTimeout(() => {
      isLocalAction.value = false
    }, LOCAL_ACTION_MS)
  }

  function applyQueueFromPayload(
    queue: SoundcloudTrackChangePayload['queue'],
    queueIndex?: number,
  ) {
    if (!queue?.length) return

    trackQueue.value = queue.map(mapQueueItem)
    currentQueueIndex.value = queueIndex ?? 0
  }

  function initFromRoom() {
    if (!room.value?.soundcloudUrl) return

    currentTrackUrl.value = room.value.soundcloudUrl
    currentTrackTitle.value = room.value.soundcloudTitle ?? 'Current track'
    currentTrackArtist.value = room.value.soundcloudArtist ?? null
    currentArtworkUrl.value = room.value.soundcloudArtworkUrl ?? null

    if (room.value.soundcloudQueue?.length) {
      trackQueue.value = room.value.soundcloudQueue.map(mapQueueItem)
      currentQueueIndex.value = room.value.soundcloudQueueIndex ?? 0
    } else {
      trackQueue.value = [
        {
          id: room.value.soundcloudUrl,
          permalinkUrl: room.value.soundcloudUrl,
          streamUrl: room.value.soundcloudUrl,
          title: currentTrackTitle.value ?? undefined,
          username: currentTrackArtist.value ?? undefined,
          artworkUrl: currentArtworkUrl.value ?? undefined,
          durationMs: 0,
        },
      ]
      currentQueueIndex.value = 0
    }

    if ((room.value.currentTime ?? 0) > 0) {
      initialSyncApplied = true
      lastAppliedStateTs = roomLoadedAt.value
    }
  }

  function emitTrackChange() {
    socketService.emit('audio:track_change', {
      roomId,
      trackUrl: currentTrackUrl.value ?? '',
      title: currentTrackTitle.value,
      artist: currentTrackArtist.value,
      artworkUrl: currentArtworkUrl.value,
      queue: mapQueueToPayload(trackQueue.value),
      queueIndex: currentQueueIndex.value ?? 0,
    })
  }

  async function autoplay() {
    await nextTick()
    const audio = audioRef.value
    if (!audio) return

    try {
      await audio.play()
    } catch (e) {
      console.error('Failed to autoplay', e)
    }
  }

  function applyInitialRoomState() {
    if (!room.value || initialSyncApplied || !audioRef.value || !currentTrackUrl.value) return

    const audio = audioRef.value
    const targetTime = Math.max(0, room.value.currentTime ?? 0)
    const playing = room.value.isPlaying ?? false

    setLocalActionFlag()
    audio.currentTime = targetTime

    if (playing) {
      void audio.play()
    } else {
      audio.pause()
    }

    initialSyncApplied = true
    lastAppliedStateTs = roomLoadedAt.value
  }

  async function selectTrack(track: SoundCloudTrack, queue: SoundTrack[]) {
    isSelectingTrack.value = true
    try {
      let playable = track

      if (!playable.streamUrl) {
        try {
          playable = await soundCloudAPI.getTrack(track.id)
        } catch (e: unknown) {
          console.error(e)
          toast.error(e instanceof Error ? e.message : 'Failed to resolve track stream')
          return
        }
      }

      currentTrackTitle.value = playable.title ?? null
      currentTrackArtist.value = playable.username ?? null
      currentArtworkUrl.value = playable.artworkUrl ?? null
      trackQueue.value = (queue.length ? queue : [playable]).map((t) =>
        t.id === playable.id ? { ...t, streamUrl: playable.streamUrl } : t,
      )
      currentQueueIndex.value = 0

      if (!playable.streamUrl) {
        currentTrackUrl.value = null
        isPlaying.value = false
        toast.error('This track cannot be played (no stream URL from SoundCloud).')
        return
      }

      currentTrackUrl.value = playable.streamUrl
      emitTrackChange()
      toast.success('Track selected.')
      await autoplay()
    } finally {
      isSelectingTrack.value = false
    }
  }

  async function selectPlaylist(playlist: SoundCloudPlaylist) {
    try {
      const tracks = await soundCloudAPI.getPlaylistTracks(playlist.id)
      const playable = tracks.filter((t) => t.streamUrl)

      if (!playable.length) {
        toast.error('No playable tracks in this album.')
        return
      }

      trackQueue.value = playable
      currentQueueIndex.value = 0

      const first = playable[0]!
      currentTrackUrl.value = first.streamUrl!
      currentTrackTitle.value = first.title ?? null
      currentTrackArtist.value = first.username ?? null
      currentArtworkUrl.value = first.artworkUrl ?? null

      emitTrackChange()
      toast.success(`Album loaded: ${playable.length} tracks`)
      await autoplay()
    } catch (e: unknown) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Failed to load album')
    }
  }

  async function loadFromUrl(url: string) {
    if (!url.trim()) {
      toast.error('Please enter a SoundCloud track URL')
      return
    }

    const value = url.trim()

    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      toast.error('Right now only direct SoundCloud track URLs are supported.')
      return
    }

    currentTrackUrl.value = value
    currentTrackTitle.value = 'Custom URL'
    currentTrackArtist.value = null
    currentArtworkUrl.value = null
    trackQueue.value = [
      {
        id: value,
        permalinkUrl: value,
        streamUrl: value,
        title: currentTrackTitle.value ?? undefined,
        durationMs: 0,
      },
    ]
    currentQueueIndex.value = 0

    emitTrackChange()
    toast.success('Track loaded. You can control playback in the player.')
    await autoplay()
  }

  async function loadFromChat(url: string) {
    if (!url) return

    currentTrackUrl.value = url
    currentTrackTitle.value = 'Shared track'
    currentTrackArtist.value = null
    toast.success('Track from chat loaded to player')

    trackQueue.value = [
      {
        id: url,
        permalinkUrl: url,
        streamUrl: url,
        title: currentTrackTitle.value ?? undefined,
        username: currentTrackArtist.value ?? undefined,
        artworkUrl: currentArtworkUrl.value ?? undefined,
        durationMs: 0,
      },
    ]
    currentQueueIndex.value = 0

    emitTrackChange()
    await autoplay()
  }

  function togglePlay() {
    const audio = audioRef.value
    if (!audio || !currentTrackUrl.value) return

    if (audio.paused) {
      void audio.play()
    } else {
      audio.pause()
    }
  }

  function onLoadedMetadata() {
    const audio = audioRef.value
    if (!audio) return

    duration.value = audio.duration || 0
    volume.value = (audio.volume ?? 1) * 100
    muted.value = audio.muted

    applyInitialRoomState()
  }

  function onCanPlay() {
    if (pendingRemoteAutoplay) {
      pendingRemoteAutoplay = false
      void autoplay()
    } else {
      applyInitialRoomState()
    }
  }

  function onTimeUpdate() {
    const audio = audioRef.value
    if (!audio) return

    currentTime.value = audio.currentTime || 0
  }

  function onPlay() {
    isPlaying.value = true

    const audio = audioRef.value
    if (!audio || !currentTrackUrl.value || isLocalAction.value) return

    socketService.emit('video:play', {
      roomId,
      currentTime: audio.currentTime || 0,
    })
  }

  function onPause() {
    isPlaying.value = false

    const audio = audioRef.value
    if (!audio || !currentTrackUrl.value || isLocalAction.value) return

    socketService.emit('video:pause', {
      roomId,
      currentTime: audio.currentTime || 0,
    })
  }

  function seek(value: number) {
    const audio = audioRef.value
    if (!audio) return

    audio.currentTime = (value / 100) * (duration.value || 1)

    if (isLocalAction.value) return

    socketService.emit('video:seek', {
      roomId,
      currentTime: audio.currentTime || 0,
    })
  }

  function toggleMute() {
    const audio = audioRef.value
    if (!audio) return

    const nextMuted = !audio.muted
    audio.muted = nextMuted
    muted.value = nextMuted
  }

  function changeVolume(value: number) {
    const audio = audioRef.value
    if (!audio) return

    const clamped = Math.max(0, Math.min(100, value))
    volume.value = clamped
    audio.volume = clamped / 100

    if (clamped === 0) {
      audio.muted = true
      muted.value = true
    } else if (muted.value && audio.muted) {
      audio.muted = false
      muted.value = false
    }
  }

  function applyRemoteState(targetTime: number, playing: boolean) {
    const audio = audioRef.value
    if (!audio || !currentTrackUrl.value) return

    try {
      setLocalActionFlag()

      const timeDiff = Math.abs((audio.currentTime || 0) - targetTime)
      if (timeDiff > SYNC_TIME_THRESHOLD_SEC) {
        audio.currentTime = Math.max(0, targetTime)
      }

      if (playing) {
        void audio.play()
      } else {
        audio.pause()
      }
    } catch (e) {
      console.error('Error applying remote audio state:', e)
    }
  }

  function handleAudioState(state: VideoState) {
    if (state.timestamp < roomLoadedAt.value - 2000) return

    const audio = audioRef.value
    if (!audio || !currentTrackUrl.value) {
      audioStateRetryCount++
      if (audioStateRetryCount >= MAX_AUDIO_STATE_RETRIES) {
        console.warn('Audio not ready after maximum retries, skipping state sync')
        audioStateRetryCount = 0
        return
      }
      setTimeout(() => handleAudioState(state), 500)
      return
    }

    if (state.timestamp <= lastAppliedStateTs) return
    if (pendingApplyTs === state.timestamp) return

    audioStateRetryCount = 0
    pendingApplyTs = state.timestamp

    const ageSec = (Date.now() - state.timestamp) / 1000
    const delay = state.isPlaying ? Math.min(ageSec, 5) : Math.min(ageSec, 1)
    const targetTime = Math.max(0, state.currentTime + delay)

    applyRemoteState(targetTime, state.isPlaying)
    lastAppliedStateTs = state.timestamp
    initialSyncApplied = true
    pendingApplyTs = 0
  }

  function handleAudioPlay(data: { currentTime: number; timestamp: number }) {
    const audio = audioRef.value
    if (!audio || !currentTrackUrl.value || isLocalAction.value) return

    const networkDelay = (Date.now() - data.timestamp) / 1000
    const targetTime = Math.max(0, data.currentTime + networkDelay)

    applyRemoteState(targetTime, true)
  }

  function handleAudioPause(data: { currentTime: number; timestamp: number }) {
    const audio = audioRef.value
    if (!audio || !currentTrackUrl.value || isLocalAction.value) return

    if (Date.now() - lastRemoteSeekAt < SEEK_PAUSE_DEBOUNCE_MS) return

    const networkDelay = (Date.now() - data.timestamp) / 1000
    const targetTime = Math.max(0, data.currentTime + networkDelay)

    applyRemoteState(targetTime, false)
  }

  function handleAudioSeek(data: { currentTime: number; timestamp: number }) {
    const audio = audioRef.value
    if (!audio || !currentTrackUrl.value || isLocalAction.value) return

    lastRemoteSeekAt = Date.now()

    const networkDelay = (Date.now() - data.timestamp) / 1000
    const targetTime = Math.max(0, data.currentTime + networkDelay)

    applyRemoteState(targetTime, isPlaying.value)
  }

  async function handleTrackChange(data: SoundcloudTrackChangePayload) {
    if (!data.trackUrl) return

    currentTrackTitle.value = data.title ?? 'Shared track'
    currentTrackArtist.value = data.artist ?? null
    currentArtworkUrl.value = data.artworkUrl ?? null
    applyQueueFromPayload(data.queue, data.queueIndex)

    const urlChanged = data.trackUrl !== currentTrackUrl.value
    if (!urlChanged) return

    pendingRemoteAutoplay = true
    currentTrackUrl.value = data.trackUrl
    lastAppliedStateTs = 0

    await nextTick()

    const audio = audioRef.value
    if (audio && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      pendingRemoteAutoplay = false
      await autoplay()
    }
  }

  async function goToQueueIndex(index: number, autoplayTrack = true) {
    if (!trackQueue.value.length || index < 0 || index >= trackQueue.value.length) return

    const track = trackQueue.value[index]
    if (!track?.streamUrl) return

    currentQueueIndex.value = index
    currentTrackUrl.value = track.streamUrl
    currentTrackTitle.value = track.title ?? null
    currentTrackArtist.value = track.username ?? null
    currentArtworkUrl.value = track.artworkUrl ?? null

    emitTrackChange()

    if (autoplayTrack) {
      await autoplay()
    }
  }

  async function playNextInQueue() {
    if (!trackQueue.value.length || currentQueueIndex.value === null) return

    const nextIndex = currentQueueIndex.value + 1
    if (nextIndex >= trackQueue.value.length) {
      isPlaying.value = false
      const audio = audioRef.value
      if (audio && !isLocalAction.value) {
        socketService.emit('video:pause', {
          roomId,
          currentTime: audio.currentTime || 0,
        })
      }
      return
    }

    await goToQueueIndex(nextIndex)
  }

  async function playPrevInQueue() {
    if (!trackQueue.value.length || currentQueueIndex.value === null) return

    const prevIndex = currentQueueIndex.value - 1
    if (prevIndex < 0) return

    await goToQueueIndex(prevIndex)
  }

  function reorderQueue(newOrderIds: (string | number)[]) {
    const byId = new Map<string | number, SoundTrack>(trackQueue.value.map((t) => [t.id, t]))
    const reordered = newOrderIds
      .map((id) => byId.get(id))
      .filter((t): t is SoundTrack => t != null)

    if (reordered.length !== trackQueue.value.length) return

    const currentId = trackQueue.value[currentQueueIndex.value ?? 0]?.id
    trackQueue.value = reordered
    const newIndex = reordered.findIndex((t) => t.id === currentId)
    currentQueueIndex.value = newIndex >= 0 ? newIndex : 0

    emitTrackChange()
  }

  function bindSocketListeners() {
    if (listenersBound) return

    socketService.on('video:state', handleAudioState)
    socketService.on('video:play', handleAudioPlay)
    socketService.on('video:pause', handleAudioPause)
    socketService.on('video:seek', handleAudioSeek)
    socketService.on('video:sync', handleAudioState)
    socketService.on('audio:track_change', handleTrackChange)
    listenersBound = true
  }

  function unbindSocketListeners() {
    if (!listenersBound) return

    socketService.off('video:state', handleAudioState)
    socketService.off('video:play', handleAudioPlay)
    socketService.off('video:pause', handleAudioPause)
    socketService.off('video:seek', handleAudioSeek)
    socketService.off('video:sync', handleAudioState)
    socketService.off('audio:track_change', handleTrackChange)
    listenersBound = false
  }

  function setup() {
    initFromRoom()
    bindSocketListeners()
    socketService.emit('video:sync_request', roomId)
  }

  function teardown() {
    unbindSocketListeners()
    audioStateRetryCount = 0
    lastAppliedStateTs = 0
    pendingApplyTs = 0
    initialSyncApplied = false
    pendingRemoteAutoplay = false
  }

  return {
    audioRef,
    currentTrackUrl,
    currentTrackTitle,
    currentTrackArtist,
    currentArtworkUrl,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    trackQueue,
    currentQueueIndex,
    isSelectingTrack,
    selectTrack,
    selectPlaylist,
    loadFromUrl,
    loadFromChat,
    togglePlay,
    onLoadedMetadata,
    onCanPlay,
    onTimeUpdate,
    onPlay,
    onPause,
    seek,
    toggleMute,
    changeVolume,
    playNextInQueue,
    playPrevInQueue,
    goToQueueIndex,
    reorderQueue,
    setup,
    teardown,
  }
}
