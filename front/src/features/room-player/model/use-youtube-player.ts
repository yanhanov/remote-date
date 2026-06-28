import { ref, onUnmounted, nextTick, type Ref } from 'vue'
import { socketService } from '@/shared/api/socket.service'
import type { VideoRoom, VideoState } from '@/shared/api/room.types'
import { loadYouTubeAPI } from './load-youtube-api'
import { YOUTUBE_PLAYER_ELEMENT_ID, type YoutubePlayerInstance } from './youtube.types'
import { youtubeWatchUrl } from './youtube.utils'

const playerRegistry = new Map<string, { player: YoutubePlayerInstance; ready: boolean }>()
let videoSocketListenersBound = false

const MAX_VIDEO_STATE_RETRIES = 20

export function useYoutubePlayer(
  roomId: string,
  room: Ref<VideoRoom | null>,
  roomLoadedAt: Ref<number>,
) {
  const playerError = ref<string | null>(null)
  const playerReady = ref(false)
  const isLocalAction = ref(false)

  let player: YoutubePlayerInstance | null = null
  let seekInterval: ReturnType<typeof setInterval> | null = null
  let videoStateRetryCount = 0
  let lastAppliedStateTs = 0
  let playerInitializing = false
  let initPromise: Promise<void> | null = null
  let firstSyncApplied = false
  let pendingApplyTs = 0

  const onVideoState = (state: VideoState) => handleVideoState(state)
  const onVideoSync = (state: VideoState) => handleVideoState(state)
  const onVideoPlay = (data: { currentTime: number; timestamp: number }) => handleVideoPlay(data)
  const onVideoPause = (data: { currentTime: number; timestamp: number }) => handleVideoPause(data)
  const onVideoSeek = (data: { currentTime: number; timestamp: number }) => handleVideoSeek(data)
  const onVideoChange = (data: {
    videoId: string
    youtubeUrl?: string
    title?: string
    channelTitle?: string
    thumbnailUrl?: string
  }) => handleVideoChange(data)

  function bindSocketListeners() {
    if (videoSocketListenersBound) return
    socketService.on('video:state', onVideoState)
    socketService.on('video:play', onVideoPlay)
    socketService.on('video:pause', onVideoPause)
    socketService.on('video:seek', onVideoSeek)
    socketService.on('video:sync', onVideoSync)
    socketService.on('video:change', onVideoChange)
    videoSocketListenersBound = true
  }

  function unbindSocketListeners() {
    if (!videoSocketListenersBound) return
    socketService.off('video:state', onVideoState)
    socketService.off('video:play', onVideoPlay)
    socketService.off('video:pause', onVideoPause)
    socketService.off('video:seek', onVideoSeek)
    socketService.off('video:sync', onVideoSync)
    socketService.off('video:change', onVideoChange)
    videoSocketListenersBound = false
  }

  function handleResize() {
    const playerElement = document.getElementById(YOUTUBE_PLAYER_ELEMENT_ID)
    if (!player || !playerReady.value || !playerElement?.parentElement) return

    const rect = playerElement.parentElement.getBoundingClientRect()
    const width = Math.floor(rect.width || 640)
    const height = Math.floor(rect.height || 360)

    try {
      player.setSize?.(width, height)
    } catch (e) {
      console.error('Error resizing player:', e)
    }
  }

  function destroyPlayer() {
    if (seekInterval) {
      clearInterval(seekInterval)
      seekInterval = null
    }

    const registered = playerRegistry.get(roomId)
    const target = registered?.player ?? player
    if (target?.destroy) {
      try {
        target.destroy()
      } catch (e) {
        console.error('Error destroying player:', e)
      }
    }

    playerRegistry.delete(roomId)
    player = null
    playerReady.value = false
    playerInitializing = false
    initPromise = null
    firstSyncApplied = false
    pendingApplyTs = 0
    lastAppliedStateTs = 0
    videoStateRetryCount = 0
  }

  async function initializePlayer() {
    if (playerReady.value || playerInitializing) return
    if (initPromise) return initPromise

    initPromise = doInitializePlayer().finally(() => {
      initPromise = null
      playerInitializing = false
    })
    return initPromise
  }

  async function doInitializePlayer() {
    const cached = playerRegistry.get(roomId)
    if (cached?.player && cached.ready) {
      try {
        const iframe = cached.player.getIframe?.()
        if (iframe?.isConnected) {
          player = cached.player
          playerReady.value = true
          window.addEventListener('resize', handleResize)
          return
        }
      } catch {
        playerRegistry.delete(roomId)
      }
    }

    if (player || playerReady.value) return

    playerInitializing = true

    const videoId = room.value?.youtubeVideoId
    if (!videoId) {
      playerInitializing = false
      return
    }

    await nextTick()
    await nextTick()

    let playerElement = document.getElementById(YOUTUBE_PLAYER_ELEMENT_ID)
    let retries = 0
    while (!playerElement && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      playerElement = document.getElementById(YOUTUBE_PLAYER_ELEMENT_ID)
      retries++
    }

    if (!playerElement?.parentElement) {
      playerError.value = 'Failed to initialize player: element not found'
      return
    }

    const rect = playerElement.parentElement.getBoundingClientRect()
    const width = Math.floor(rect.width || 640)
    const height = Math.floor(rect.height || 360)
    const startSeconds = Math.max(0, Math.floor(room.value?.currentTime ?? 0))

    const YT = window.YT
    if (!YT?.Player) {
      playerError.value = 'Failed to load YouTube IFrame API'
      return
    }

    playerError.value = null
    firstSyncApplied = startSeconds > 0
    if (startSeconds > 0) {
      lastAppliedStateTs = roomLoadedAt.value
    }

    try {
      const playerVars: Record<string, string | number> = {
        controls: 1,
        rel: 0,
        autoplay: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin,
      }
      if (startSeconds > 0) {
        playerVars.start = startSeconds
      }

      player = new YT.Player(YOUTUBE_PLAYER_ELEMENT_ID, {
        videoId,
        width,
        height,
        playerVars,
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      })
    } catch (err: unknown) {
      console.error('Error initializing player:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      playerError.value = 'Failed to initialize YouTube player: ' + message
    }
  }

  function onPlayerError(event: { data: number }) {
    console.error('YouTube player error:', event.data)
    playerError.value = 'Error loading video. Please check the video URL.'
  }

  function onPlayerReady(event: { target: YoutubePlayerInstance }) {
    playerReady.value = true
    player = event.target
    playerRegistry.set(roomId, { player, ready: true })

    window.addEventListener('resize', handleResize)
    handleResize()

    window.setTimeout(() => {
      handleResize()
      if (!firstSyncApplied) {
        socketService.emit('video:sync_request', roomId)
      }
    }, 500)

    let lastTime = 0
    try {
      lastTime = player.getCurrentTime?.() || 0
    } catch (e) {
      console.error('Error getting current time:', e)
    }

    seekInterval = window.setInterval(() => {
      if (!player || !playerReady.value || isLocalAction.value) return

      try {
        const currentTime = player.getCurrentTime?.() || 0
        const timeDiff = Math.abs(currentTime - lastTime)
        const playerState = player.getPlayerState?.()

        if (timeDiff > 2) {
          if (playerState === 1) {
            isLocalAction.value = true
            player.pauseVideo?.()
            socketService.emit('video:pause', { roomId, currentTime })
            setTimeout(() => {
              isLocalAction.value = false
            }, 500)
          }

          socketService.emit('video:seek', { roomId, currentTime })
        }

        lastTime = currentTime
      } catch (e) {
        console.error('Error in seek interval:', e)
      }
    }, 500)
  }

  function onPlayerStateChange(event: { target: YoutubePlayerInstance; data: number }) {
    if (isLocalAction.value || !playerReady.value) return

    try {
      const currentTime = event.target.getCurrentTime?.() || 0
      const state = event.data

      if (state === 1) {
        socketService.emit('video:play', { roomId, currentTime })
      } else if (state === 2 || state === 0) {
        socketService.emit('video:pause', { roomId, currentTime })
      }
    } catch (e) {
      console.error('Error in onPlayerStateChange:', e)
    }
  }

  function handleVideoState(state: VideoState) {
    if (state.timestamp < roomLoadedAt.value - 2000) return

    if (!player || !playerReady.value) {
      videoStateRetryCount++
      if (videoStateRetryCount >= MAX_VIDEO_STATE_RETRIES) {
        videoStateRetryCount = 0
        return
      }
      setTimeout(() => handleVideoState(state), 500)
      return
    }

    if (state.timestamp <= lastAppliedStateTs) return
    if (pendingApplyTs === state.timestamp) return

    videoStateRetryCount = 0
    pendingApplyTs = state.timestamp

    try {
      isLocalAction.value = true

      const ageSec = (Date.now() - state.timestamp) / 1000
      const delay = state.isPlaying ? Math.min(ageSec, 5) : Math.min(ageSec, 1)
      const targetTime = Math.max(0, state.currentTime + delay)

      let currentTime = 0
      try {
        currentTime = player.getCurrentTime?.() ?? 0
      } catch {
        currentTime = 0
      }

      const timeDiff = Math.abs(currentTime - targetTime)

      if (timeDiff > 1.5) {
        player.seekTo?.(targetTime, true)
      }

      if (state.isPlaying) {
        player.playVideo?.()
      } else {
        player.pauseVideo?.()
      }

      lastAppliedStateTs = state.timestamp
      firstSyncApplied = true
      pendingApplyTs = 0

      setTimeout(() => {
        isLocalAction.value = false
      }, 500)
    } catch (e) {
      console.error('Error in handleVideoState:', e)
      pendingApplyTs = 0
      setTimeout(() => {
        isLocalAction.value = false
      }, 500)
    }
  }

  function handleVideoPlay(data: { currentTime: number; timestamp: number }) {
    if (!player || !playerReady.value || isLocalAction.value) return

    try {
      isLocalAction.value = true

      const networkDelay = (Date.now() - data.timestamp) / 1000
      const playerState = player.getPlayerState?.()
      let targetTime = data.currentTime

      if (playerState === 1) {
        targetTime = data.currentTime + networkDelay
      } else {
        targetTime = data.currentTime + Math.min(networkDelay * 0.5, 0.1)
      }

      targetTime = Math.max(0, targetTime)

      player.seekTo?.(targetTime, true)
      player.playVideo?.()

      setTimeout(() => {
        isLocalAction.value = false
      }, 500)
    } catch (e) {
      console.error('Error in handleVideoPlay:', e)
      setTimeout(() => {
        isLocalAction.value = false
      }, 500)
    }
  }

  function handleVideoPause(data: { currentTime: number; timestamp: number }) {
    if (!player || !playerReady.value || isLocalAction.value) return

    try {
      isLocalAction.value = true

      const networkDelay = (Date.now() - data.timestamp) / 1000
      const playerState = player.getPlayerState?.()
      let targetTime = data.currentTime

      if (playerState === 1) {
        targetTime = data.currentTime + networkDelay
      } else {
        targetTime = data.currentTime + Math.min(networkDelay * 0.5, 0.05)
      }

      targetTime = Math.max(0, targetTime)

      player.seekTo?.(targetTime, true)
      player.pauseVideo?.()

      setTimeout(() => {
        isLocalAction.value = false
      }, 500)
    } catch (e) {
      console.error('Error in handleVideoPause:', e)
      setTimeout(() => {
        isLocalAction.value = false
      }, 500)
    }
  }

  function handleVideoSeek(data: { currentTime: number; timestamp: number }) {
    if (!player || !playerReady.value || isLocalAction.value) return

    try {
      isLocalAction.value = true

      const networkDelay = (Date.now() - data.timestamp) / 1000
      const playerState = player.getPlayerState?.()
      let targetTime = data.currentTime

      if (playerState === 1) {
        targetTime = data.currentTime + networkDelay
      } else {
        targetTime = data.currentTime + Math.min(networkDelay * 0.3, 0.05)
      }

      targetTime = Math.max(0, targetTime)

      player.seekTo?.(targetTime, true)
      player.pauseVideo?.()

      setTimeout(() => {
        isLocalAction.value = false
      }, 500)
    } catch (e) {
      console.error('Error in handleVideoSeek:', e)
      setTimeout(() => {
        isLocalAction.value = false
      }, 500)
    }
  }

  async function loadVideo(videoId: string, youtubeUrl?: string) {
    if (!room.value) return

    playerError.value = null
    room.value.youtubeVideoId = videoId
    room.value.youtubeUrl = youtubeUrl ?? youtubeWatchUrl(videoId)
    firstSyncApplied = false
    lastAppliedStateTs = 0
    pendingApplyTs = 0

    if (player && playerReady.value) {
      try {
        isLocalAction.value = true
        player.loadVideoById?.({ videoId })
        player.pauseVideo?.()
        setTimeout(() => {
          isLocalAction.value = false
        }, 500)
      } catch (e) {
        console.error('Error loading video:', e)
        destroyPlayer()
        await initializePlayer()
      }
      return
    }

    await initializePlayer()
  }

  function handleVideoChange(data: {
    videoId: string
    youtubeUrl?: string
  }) {
    if (!data.videoId || !room.value) return
    loadVideo(data.videoId, data.youtubeUrl)
  }

  function changeVideo(data: {
    videoId: string
    youtubeUrl?: string
    title?: string
    channelTitle?: string
    thumbnailUrl?: string
  }) {
    loadVideo(data.videoId, data.youtubeUrl)
    socketService.emit('video:change', {
      roomId,
      videoId: data.videoId,
      youtubeUrl: data.youtubeUrl ?? youtubeWatchUrl(data.videoId),
      title: data.title ?? null,
      channelTitle: data.channelTitle ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
    })
  }

  async function setup() {
    bindSocketListeners()
    await loadYouTubeAPI()
    await nextTick()
    if (room.value?.youtubeVideoId) {
      await initializePlayer()
    }
  }

  function teardown() {
    unbindSocketListeners()
    destroyPlayer()
  }

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (seekInterval) {
      clearInterval(seekInterval)
      seekInterval = null
    }
    player = null
    playerReady.value = false
  })

  return {
    playerError,
    setup,
    teardown,
    changeVideo,
  }
}
