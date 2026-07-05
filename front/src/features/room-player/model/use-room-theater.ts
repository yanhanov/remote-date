import { ref, watch, nextTick, onUnmounted } from 'vue'
import { onKeyStroke, useScrollLock } from '@vueuse/core'

export function useRoomTheater() {
  const isTheater = ref(false)
  const scrollLock = useScrollLock(document.body)

  function triggerPlayerResize() {
    void nextTick(() => {
      window.dispatchEvent(new Event('resize'))
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 150)
    })
  }

  function enterTheater() {
    isTheater.value = true
  }

  function exitTheater() {
    isTheater.value = false
  }

  function toggleTheater() {
    isTheater.value = !isTheater.value
  }

  watch(isTheater, (active) => {
    scrollLock.value = active
    triggerPlayerResize()
  })

  onKeyStroke('Escape', (event) => {
    if (!isTheater.value) return
    event.preventDefault()
    exitTheater()
  })

  onUnmounted(() => {
    scrollLock.value = false
  })

  return {
    isTheater,
    enterTheater,
    exitTheater,
    toggleTheater,
  }
}
