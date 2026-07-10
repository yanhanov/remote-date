import type { RoomType } from '@/shared/api/room.types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ROOM_INVITE_PREFIX = '@@ROOM_INVITE@@';

export interface RoomInvitePayload {
  roomType: RoomType;
  url: string;
  roomId: string;
  inviterName: string;
  label: string;
}

export function extractRoomIdFromUrl(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(
      /\/(?:sound-)?room\/([^/]+)|\/belet-room\/([^/]+)/,
    );
    return match?.[1] ?? match?.[2] ?? null;
  } catch {
    return null;
  }
}

export function inviteLabel(roomType: RoomType): string {
  switch (roomType) {
    case 'youtube':
      return 'YouTube watch party';
    case 'soundcloud':
      return 'SoundCloud listening room';
    case 'belet':
      return 'Belet watch party';
  }
}

export function buildRoomInviteMessage(payload: RoomInvitePayload): string {
  const preview = `${payload.inviterName} invited you to a ${payload.label}`;
  return `${preview}\n${ROOM_INVITE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseRoomInvite(text: string): RoomInvitePayload | null {
  const idx = text.indexOf(ROOM_INVITE_PREFIX);
  if (idx !== -1) {
    try {
      const parsed = JSON.parse(text.slice(idx + ROOM_INVITE_PREFIX.length)) as RoomInvitePayload;
      if (parsed?.url && parsed?.roomType && parsed?.roomId) return parsed;
    } catch {
      return null;
    }
  }

  const legacy = text.match(/^(.+?) invited you to a (.+?)\. Join here:\n(https?:\/\/\S+)/s);
  if (!legacy) return null;

  const [, inviterName, label, url] = legacy;
  if (!inviterName || !label || !url) return null;

  const roomId = extractRoomIdFromUrl(url);
  if (!roomId) return null;

  const lower = label.toLowerCase();
  const roomType: RoomType = lower.includes('soundcloud')
    ? 'soundcloud'
    : lower.includes('belet')
      ? 'belet'
      : 'youtube';

  return { roomType, url, roomId, inviterName, label };
}

export function roomPathForType(roomType: RoomType, roomId: string): string {
  switch (roomType) {
    case 'youtube':
      return `/room/${roomId}`;
    case 'soundcloud':
      return `/sound-room/${roomId}`;
    case 'belet':
      return `/belet-room/${roomId}`;
  }
}

export function buildRoomShareUrl(roomType: RoomType, roomId: string): string {
  const base = (process.env.EXPO_PUBLIC_APP_URL ?? 'https://remote-date.app').replace(/\/$/, '');
  return `${base}${roomPathForType(roomType, roomId)}`;
}

export function invitedStorageKey(roomId: string): string {
  return `room-invites:${roomId}`;
}

export async function loadInvitedUserIds(roomId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(invitedStorageKey(roomId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export async function saveInvitedUserId(roomId: string, userId: string): Promise<void> {
  const ids = await loadInvitedUserIds(roomId);
  ids.add(userId);
  await AsyncStorage.setItem(invitedStorageKey(roomId), JSON.stringify([...ids]));
}
