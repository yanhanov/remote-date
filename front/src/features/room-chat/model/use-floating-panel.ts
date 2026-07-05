import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

type ResizeAxis = 'width' | 'height' | 'both'

type DragOptions = {
  width: number
  height: number
  onEnd?: (moved: boolean) => void
}

type FloatingPanelOptions = {
  storageKey: string
  defaultWidth: number
  defaultHeight: number
  minWidth: number
  minHeight: number
}

export function useFloatingPanel(
  containerRef: Ref<HTMLElement | null>,
  options: FloatingPanelOptions,
) {
  const width = useLocalStorage(options.storageKey + ':w', options.defaultWidth)
  const height = useLocalStorage(options.storageKey + ':h', options.defaultHeight)
  const x = useLocalStorage(options.storageKey + ':x', -1)
  const y = useLocalStorage(options.storageKey + ':y', -1)

  const isDragging = ref(false)

  let mode: 'drag' | ResizeAxis | null = null
  let startX = 0
  let startY = 0
  let startPanelX = 0
  let startPanelY = 0
  let startWidth = 0
  let startHeight = 0
  let dragWidth = 0
  let dragHeight = 0
  let dragMoved = false
  let dragOnEnd: ((moved: boolean) => void) | undefined

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
  }

  function getBounds() {
    const container = containerRef.value
    if (!container) {
      return { containerWidth: 0, containerHeight: 0 }
    }

    const rect = container.getBoundingClientRect()
    return {
      containerWidth: rect.width,
      containerHeight: rect.height,
    }
  }

  function clampPosition(panelWidth = width.value, panelHeight = height.value) {
    const { containerWidth, containerHeight } = getBounds()
    if (!containerWidth || !containerHeight) return

    const maxX = Math.max(0, containerWidth - panelWidth)
    const maxY = Math.max(0, containerHeight - panelHeight)

    x.value = clamp(x.value, 0, maxX)
    y.value = clamp(y.value, 0, maxY)
  }

  function clampSize() {
    const { containerWidth, containerHeight } = getBounds()
    if (!containerWidth || !containerHeight) return

    const maxWidth = Math.max(options.minWidth, containerWidth - x.value)
    const maxHeight = Math.max(options.minHeight, containerHeight - y.value)

    width.value = clamp(width.value, options.minWidth, maxWidth)
    height.value = clamp(height.value, options.minHeight, maxHeight)
    clampPosition()
  }

  function ensureDefaultPosition(panelWidth = width.value, panelHeight = height.value) {
    const { containerWidth, containerHeight } = getBounds()
    if (!containerWidth || !containerHeight) return

    if (x.value < 0 || y.value < 0) {
      x.value = Math.max(0, containerWidth - panelWidth - 16)
      y.value = Math.max(0, containerHeight - panelHeight - 16)
    }

    clampPosition(panelWidth, panelHeight)
    clampSize()
  }

  function onPointerMove(event: PointerEvent) {
    if (!mode) return

    const { containerWidth, containerHeight } = getBounds()

    if (mode === 'drag') {
      const deltaX = event.clientX - startX
      const deltaY = event.clientY - startY

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragMoved = true
      }

      const nextX = startPanelX + deltaX
      const nextY = startPanelY + deltaY
      const maxX = Math.max(0, containerWidth - dragWidth)
      const maxY = Math.max(0, containerHeight - dragHeight)
      x.value = clamp(nextX, 0, maxX)
      y.value = clamp(nextY, 0, maxY)
      return
    }

    if (mode === 'width' || mode === 'both') {
      const nextWidth = startWidth + (event.clientX - startX)
      const maxWidth = Math.max(options.minWidth, containerWidth - x.value)
      width.value = clamp(nextWidth, options.minWidth, maxWidth)
    }

    if (mode === 'height' || mode === 'both') {
      const nextHeight = startHeight + (event.clientY - startY)
      const maxHeight = Math.max(options.minHeight, containerHeight - y.value)
      height.value = clamp(nextHeight, options.minHeight, maxHeight)
    }
  }

  function onPointerUp() {
    const wasDrag = mode === 'drag'
    const moved = dragMoved
    const onEnd = dragOnEnd

    mode = null
    isDragging.value = false
    dragOnEnd = undefined
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    if (wasDrag) onEnd?.(moved)
  }

  function startDrag(event: PointerEvent, dragOptions?: DragOptions) {
    if ((event.target as HTMLElement).closest('button[data-no-drag]')) return

    event.preventDefault()
    mode = 'drag'
    isDragging.value = true
    dragMoved = false
    dragOnEnd = dragOptions?.onEnd
    dragWidth = dragOptions?.width ?? width.value
    dragHeight = dragOptions?.height ?? height.value
    startX = event.clientX
    startY = event.clientY
    startPanelX = x.value
    startPanelY = y.value

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function startResize(event: PointerEvent, axis: ResizeAxis) {
    event.preventDefault()
    event.stopPropagation()
    mode = axis
    startX = event.clientX
    startY = event.clientY
    startWidth = width.value
    startHeight = height.value

    document.body.style.userSelect = 'none'
    document.body.style.cursor =
      axis === 'both' ? 'nwse-resize' : axis === 'width' ? 'ew-resize' : 'ns-resize'

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function onContainerResize() {
    ensureDefaultPosition()
    clampSize()
  }

  onMounted(() => {
    ensureDefaultPosition()
    window.addEventListener('resize', onContainerResize)
  })

  onUnmounted(() => {
    onPointerUp()
    window.removeEventListener('resize', onContainerResize)
  })

  return {
    x,
    y,
    width,
    height,
    isDragging,
    ensureDefaultPosition,
    clampPosition,
    startDrag,
    startResize,
    clampSize,
  }
}
