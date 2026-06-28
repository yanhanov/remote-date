export const AVATAR_OUTPUT_SIZE = 512
export const AVATAR_STAGE_HEIGHT = 280
export const AVATAR_MIN_CROP_SIZE = 72
export const AVATAR_WEBP_QUALITY = 0.82
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_SOURCE_MAX_BYTES = 12 * 1024 * 1024

export type AvatarImageLayout = {
  offsetX: number
  offsetY: number
  displayWidth: number
  displayHeight: number
  scale: number
}

export type AvatarCropBox = {
  x: number
  y: number
  size: number
}

export type AvatarCropHandle = 'nw' | 'ne' | 'sw' | 'se'

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    image.src = url
  })
}

export function computeImageLayout(
  imageWidth: number,
  imageHeight: number,
  stageWidth: number,
  stageHeight: number,
): AvatarImageLayout {
  const scale = Math.min(stageWidth / imageWidth, stageHeight / imageHeight)
  const displayWidth = imageWidth * scale
  const displayHeight = imageHeight * scale

  return {
    offsetX: (stageWidth - displayWidth) / 2,
    offsetY: (stageHeight - displayHeight) / 2,
    displayWidth,
    displayHeight,
    scale,
  }
}

export function getImageBounds(layout: AvatarImageLayout) {
  return {
    left: layout.offsetX,
    top: layout.offsetY,
    right: layout.offsetX + layout.displayWidth,
    bottom: layout.offsetY + layout.displayHeight,
    maxSize: Math.min(layout.displayWidth, layout.displayHeight),
  }
}

export function createInitialCropBox(layout: AvatarImageLayout): AvatarCropBox {
  const bounds = getImageBounds(layout)
  const size = bounds.maxSize

  return {
    x: bounds.left + (layout.displayWidth - size) / 2,
    y: bounds.top + (layout.displayHeight - size) / 2,
    size,
  }
}

export function clampCropBox(
  box: AvatarCropBox,
  layout: AvatarImageLayout,
  minSize = AVATAR_MIN_CROP_SIZE,
): AvatarCropBox {
  const bounds = getImageBounds(layout)
  const maxSize = bounds.maxSize
  const size = Math.min(maxSize, Math.max(minSize, box.size))

  const x = Math.min(bounds.right - size, Math.max(bounds.left, box.x))
  const y = Math.min(bounds.bottom - size, Math.max(bounds.top, box.y))

  return { x, y, size }
}

export function resizeCropBoxFromHandle(
  handle: AvatarCropHandle,
  pointerX: number,
  pointerY: number,
  anchorX: number,
  anchorY: number,
  layout: AvatarImageLayout,
  minSize = AVATAR_MIN_CROP_SIZE,
): AvatarCropBox {
  let box: AvatarCropBox

  if (handle === 'se') {
    const size = Math.min(pointerX - anchorX, pointerY - anchorY)
    box = { x: anchorX, y: anchorY, size }
  } else if (handle === 'nw') {
    const size = Math.min(anchorX - pointerX, anchorY - pointerY)
    box = { x: anchorX - size, y: anchorY - size, size }
  } else if (handle === 'ne') {
    const size = Math.min(pointerX - anchorX, anchorY - pointerY)
    box = { x: anchorX, y: anchorY - size, size }
  } else {
    const size = Math.min(anchorX - pointerX, pointerY - anchorY)
    box = { x: anchorX - size, y: anchorY, size }
  }

  return clampCropBox(box, layout, minSize)
}

export function getImageDisplayStyle(layout: AvatarImageLayout) {
  return {
    left: `${layout.offsetX}px`,
    top: `${layout.offsetY}px`,
    width: `${layout.displayWidth}px`,
    height: `${layout.displayHeight}px`,
  }
}

export function getCropBoxStyle(box: AvatarCropBox) {
  return {
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.size}px`,
    height: `${box.size}px`,
  }
}

export function getCropMaskStyles(
  box: AvatarCropBox,
  stageWidth: number,
  stageHeight: number,
) {
  return {
    top: { height: `${Math.max(0, box.y)}px` },
    bottom: {
      top: `${box.y + box.size}px`,
      height: `${Math.max(0, stageHeight - box.y - box.size)}px`,
    },
    left: {
      top: `${box.y}px`,
      width: `${Math.max(0, box.x)}px`,
      height: `${box.size}px`,
    },
    right: {
      left: `${box.x + box.size}px`,
      top: `${box.y}px`,
      width: `${Math.max(0, stageWidth - box.x - box.size)}px`,
      height: `${box.size}px`,
    },
  }
}

export async function renderAvatarWebpFromCropBox(
  image: HTMLImageElement,
  layout: AvatarImageLayout,
  box: AvatarCropBox,
  options?: {
    outputSize?: number
    quality?: number
    maxBytes?: number
  },
): Promise<string> {
  const outputSize = options?.outputSize ?? AVATAR_OUTPUT_SIZE
  const maxBytes = options?.maxBytes ?? AVATAR_MAX_BYTES
  let quality = options?.quality ?? AVATAR_WEBP_QUALITY

  const clamped = clampCropBox(box, layout)

  const srcX = (clamped.x - layout.offsetX) / layout.scale
  const srcY = (clamped.y - layout.offsetY) / layout.scale
  const srcSize = clamped.size / layout.scale

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported')

  ctx.drawImage(image, srcX, srcY, srcSize, srcSize, 0, 0, outputSize, outputSize)

  let dataUrl = await canvasToWebpDataUrl(canvas, quality)

  while (dataUrl.length > maxBytes * 1.37 && quality > 0.45) {
    quality -= 0.08
    dataUrl = await canvasToWebpDataUrl(canvas, quality)
  }

  if (dataUrl.length > maxBytes * 1.37) {
    throw new Error('Image is too large after compression')
  }

  return dataUrl
}

function canvasToWebpDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode WebP'))
          return
        }

        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read encoded image'))
        reader.readAsDataURL(blob)
      },
      'image/webp',
      quality,
    )
  })
}
