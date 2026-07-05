import type { RoomType } from '@/shared/api/room.types'

export const ROOM_INVITE_PREFIX = '@@ROOM_INVITE@@'

export interface RoomInvitePayload {
  roomType: RoomType
  url: string
  roomId: string
  inviterName: string
  label: string
}

export function extractRoomIdFromUrl(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(/\/(?:sound-)?room\/([^/]+)/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export function inviteLabel(roomType: RoomType): string {
  return roomType === 'youtube' ? 'YouTube watch party' : 'SoundCloud listening room'
}

export function buildRoomInviteMessage(payload: RoomInvitePayload): string {
  const preview = `${payload.inviterName} invited you to a ${payload.label}`
  return `${preview}\n${ROOM_INVITE_PREFIX}${JSON.stringify(payload)}`
}

export function parseRoomInvite(text: string): RoomInvitePayload | null {
  const idx = text.indexOf(ROOM_INVITE_PREFIX)
  if (idx !== -1) {
    try {
      const parsed = JSON.parse(text.slice(idx + ROOM_INVITE_PREFIX.length)) as RoomInvitePayload
      if (parsed?.url && parsed?.roomType && parsed?.roomId) return parsed
    } catch {
      return null
    }
  }

  const legacy = text.match(
    /^(.+?) invited you to a (.+?)\. Join here:\n(https?:\/\/\S+)/s,
  )
  if (!legacy) return null

  const [, inviterName, label, url] = legacy
  if (!inviterName || !label || !url) return null

  const roomId = extractRoomIdFromUrl(url)
  if (!roomId) return null

  const roomType: RoomType = label.toLowerCase().includes('soundcloud')
    ? 'soundcloud'
    : 'youtube'

  return { roomType, url, roomId, inviterName, label }
}

export function invitedStorageKey(roomId: string): string {
  return `room-invites:${roomId}`
}

export function loadInvitedUserIds(roomId: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(invitedStorageKey(roomId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function saveInvitedUserId(roomId: string, userId: string): void {
  const ids = loadInvitedUserIds(roomId)
  ids.add(userId)
  sessionStorage.setItem(invitedStorageKey(roomId), JSON.stringify([...ids]))
}
