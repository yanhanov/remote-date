import { onMounted, ref } from 'vue'
import { roomAPI } from '@/shared/api/room.api'
import type { RoomType, VideoRoom } from '@/shared/api/room.types'

export function useLastRoom(roomType: RoomType) {
  const lastRoom = ref<VideoRoom | null>(null)
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      lastRoom.value = await roomAPI.getLastRoom(roomType)
    } catch {
      lastRoom.value = null
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  return { lastRoom, loading, reload: load }
}
