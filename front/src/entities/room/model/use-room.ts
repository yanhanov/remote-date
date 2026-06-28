import { ref } from 'vue'
import { roomAPI } from '@/shared/api/room.api'
import { socketService } from '@/shared/api/socket.service'
import type { VideoRoom } from '@/shared/api/room.types'

let listenersBound = false

export function useRoom(roomId: string) {
  const room = ref<VideoRoom | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const participants = ref(0)
  const currentUrl = ref('')
  const loadedAt = ref(0)

  const onUserJoined = (data: { roomId: string; participants: number }) => {
    participants.value = data.participants
  }

  const onUserLeft = (data: { roomId: string; participants: number }) => {
    participants.value = data.participants
  }

  const onRoomError = (err: { message: string }) => {
    console.error('Room error:', err.message)
  }

  function bindSocketListeners() {
    if (listenersBound) return
    socketService.on('room:user_joined', onUserJoined)
    socketService.on('room:user_left', onUserLeft)
    socketService.on('room:error', onRoomError)
    listenersBound = true
  }

  function unbindSocketListeners() {
    if (!listenersBound) return
    socketService.off('room:user_joined', onUserJoined)
    socketService.off('room:user_left', onUserLeft)
    socketService.off('room:error', onRoomError)
    listenersBound = false
  }

  async function load() {
    room.value = await roomAPI.getRoom(roomId)
    participants.value = room.value.participants
    currentUrl.value = window.location.href
    loadedAt.value = Date.now()
    loading.value = false
  }

  function join() {
    socketService.connect()
    socketService.emit('room:join', roomId)
    bindSocketListeners()
  }

  function leave() {
    socketService.emit('room:leave', roomId)
    unbindSocketListeners()
  }

  return {
    room,
    loading,
    error,
    participants,
    currentUrl,
    loadedAt,
    load,
    join,
    leave,
  }
}
