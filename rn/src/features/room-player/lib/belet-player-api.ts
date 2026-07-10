import { socketService } from '@/shared/api/socket.service';

export interface BeletPlayerHandle {
  /** Go back in Belet WebView history. Returns true if handled inside Belet. */
  goBack: () => boolean;
}

export function changeRoomBelet(
  roomId: string,
  payload: {
    beletUrl: string;
    title?: string;
  },
) {
  socketService.emit('belet:change', {
    roomId,
    beletUrl: payload.beletUrl,
    title: payload.title,
  });
}
