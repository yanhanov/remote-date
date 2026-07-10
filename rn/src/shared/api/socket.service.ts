import { SOCKET_URL } from '@/shared/config/api';
import { tokenService } from './token.service';
import type { VideoState } from './room.types';
import type { ChatMessage } from './chat.types';
import type { DmMessagePayload, DmStatusPayload } from './social.types';

export interface SocketEmitEvents {
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'video:play': (data: { roomId: string; currentTime?: number }) => void;
  'video:pause': (data: { roomId: string; currentTime?: number }) => void;
  'video:seek': (data: { roomId: string; currentTime: number }) => void;
  'video:sync_request': (roomId: string) => void;
  'chat:send': (msg: ChatMessage) => void;
  'dm:send': (data: { recipientId: string; text: string }) => void;
  'dm:read': (data: { otherUserId: string }) => void;
  'audio:track_change': (data: {
    roomId: string;
    trackUrl: string;
    title?: string | null;
    artist?: string | null;
    artworkUrl?: string | null;
    queue?: {
      id: string | number;
      streamUrl: string;
      title?: string | null;
      username?: string | null;
      artworkUrl?: string | null;
      permalinkUrl?: string;
      durationMs?: number;
    }[];
    queueIndex?: number;
  }) => void;
  'video:change': (data: {
    roomId: string;
    videoId: string;
    youtubeUrl?: string | null;
    title?: string | null;
    channelTitle?: string | null;
    thumbnailUrl?: string | null;
  }) => void;
  'belet:change': (data: {
    roomId: string;
    beletUrl: string;
    title?: string | null;
  }) => void;
}

export interface SocketOnEvents {
  'video:state': (state: VideoState) => void;
  'video:play': (data: { currentTime: number; timestamp: number }) => void;
  'video:pause': (data: { currentTime: number; timestamp: number }) => void;
  'video:seek': (data: { currentTime: number; timestamp: number }) => void;
  'video:sync': (state: VideoState) => void;
  'room:user_joined': (data: { roomId: string; participants: number }) => void;
  'room:user_left': (data: { roomId: string; participants: number }) => void;
  'room:error': (error: { message: string }) => void;
  'chat:message': (msg: ChatMessage) => void;
  'dm:message': (msg: DmMessagePayload) => void;
  'dm:status': (payload: DmStatusPayload) => void;
  'dm:error': (error: { message: string }) => void;
  'audio:track_change': (data: {
    trackUrl: string;
    title?: string;
    artist?: string;
    artworkUrl?: string;
    queue?: {
      id: string | number;
      streamUrl: string;
      title?: string | null;
      username?: string | null;
      artworkUrl?: string | null;
      permalinkUrl?: string;
      durationMs?: number;
    }[];
    queueIndex?: number;
  }) => void;
  'video:change': (data: {
    videoId: string;
    youtubeUrl?: string;
    title?: string;
    channelTitle?: string;
    thumbnailUrl?: string;
  }) => void;
  'belet:change': (data: {
    beletUrl: string;
    title?: string;
  }) => void;
}

type Listener<K extends keyof SocketOnEvents> = SocketOnEvents[K];

class SocketService {
  private ws: WebSocket | null = null;
  private listeners = new Map<keyof SocketOnEvents, Set<Function>>();
  private pendingQueue: string[] = [];
  private errorToastShown = false;
  private currentUrl: string | null = null;

  private async getSocketUrl(): Promise<string> {
    const token = await tokenService.getAccessToken();
    if (!token) return SOCKET_URL;

    const separator = SOCKET_URL.includes('?') ? '&' : '?';
    return `${SOCKET_URL}${separator}token=${encodeURIComponent(token)}`;
  }

  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.pendingQueue.length > 0) {
      this.ws.send(this.pendingQueue.shift()!);
    }
  }

  private async setupWebSocket(forceReconnect = false) {
    const url = await this.getSocketUrl();

    if (
      !forceReconnect &&
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) &&
      this.currentUrl === url
    ) {
      return;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.currentUrl = url;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.errorToastShown = false;
      this.flushQueue();
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.currentUrl = null;
    };

    this.ws.onerror = () => {
      if (!this.errorToastShown) {
        this.errorToastShown = true;
        console.error('WebSocket connection error');
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        const eventName: keyof SocketOnEvents | undefined = data.event;
        if (!eventName) return;

        let payload: unknown;
        if ('payload' in data) {
          payload = data.payload;
        } else {
          const { event: _e, ...rest } = data;
          payload = rest;
        }

        const handlers = this.listeners.get(eventName);
        if (handlers) {
          handlers.forEach((cb) => {
            try {
              (cb as (arg: unknown) => void)(payload);
            } catch (e) {
              console.error('WS handler error for', eventName, e);
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };
  }

  connect(options?: { forceReconnect?: boolean }): WebSocket | null {
    void this.setupWebSocket(options?.forceReconnect ?? false);
    return this.ws;
  }

  connectAuthenticated(): WebSocket | null {
    void this.getSocketUrl().then((url) => {
      const needsReconnect =
        !this.ws ||
        this.currentUrl !== url ||
        this.ws.readyState === WebSocket.CLOSED ||
        this.ws.readyState === WebSocket.CLOSING;
      this.connect({ forceReconnect: needsReconnect });
    });
    return this.ws;
  }

  disconnect(): void {
    this.pendingQueue = [];
    this.currentUrl = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  on<K extends keyof SocketOnEvents>(event: K, callback: Listener<K>): void {
    const set = this.listeners.get(event) ?? new Set<Function>();
    set.add(callback as Function);
    this.listeners.set(event, set);
  }

  off<K extends keyof SocketOnEvents>(event: K, callback?: Listener<K>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    if (callback) {
      set.delete(callback as Function);
      if (!set.size) this.listeners.delete(event);
    } else {
      this.listeners.delete(event);
    }
  }

  private send(raw: unknown) {
    this.connect();
    if (!this.ws) return;

    const payload = JSON.stringify(raw);

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
      return;
    }

    if (this.ws.readyState === WebSocket.CONNECTING) {
      this.pendingQueue.push(payload);
      return;
    }

    this.ws = null;
    this.currentUrl = null;
    this.connect();
    this.pendingQueue.push(payload);
  }

  emit<K extends keyof SocketEmitEvents>(
    event: K,
    ...args: Parameters<SocketEmitEvents[K]>
  ): void {
    switch (event) {
      case 'room:join': {
        const [roomId] = args as [string];
        this.send({ event: 'roomJoin', roomId });
        break;
      }
      case 'room:leave': {
        const [roomId] = args as [string];
        this.send({ event: 'roomLeave', roomId });
        break;
      }
      case 'video:play': {
        const [data] = args as [{ roomId: string; currentTime?: number }];
        this.send({ event: 'videoPlay', roomId: data.roomId, currentTime: data.currentTime });
        break;
      }
      case 'video:pause': {
        const [data] = args as [{ roomId: string; currentTime?: number }];
        this.send({ event: 'videoPause', roomId: data.roomId, currentTime: data.currentTime });
        break;
      }
      case 'video:seek': {
        const [data] = args as [{ roomId: string; currentTime: number }];
        this.send({ event: 'videoSeek', roomId: data.roomId, currentTime: data.currentTime });
        break;
      }
      case 'video:sync_request': {
        const [roomId] = args as [string];
        this.send({ event: 'videoSyncRequest', roomId });
        break;
      }
      case 'chat:send': {
        const [msg] = args as [ChatMessage];
        this.send({
          event: 'chatSend',
          room: msg.room,
          text: msg.text,
          author: msg.author,
          time: msg.time,
          trackUrl: msg.trackUrl,
          imageUrl: msg.imageUrl,
        });
        break;
      }
      case 'dm:send': {
        const [data] = args as [{ recipientId: string; text: string }];
        this.send({ event: 'dmSend', recipientId: data.recipientId, text: data.text });
        break;
      }
      case 'dm:read': {
        const [data] = args as [{ otherUserId: string }];
        this.send({ event: 'dmRead', otherUserId: data.otherUserId });
        break;
      }
      case 'audio:track_change': {
        const [data] = args as [
          {
            roomId: string;
            trackUrl: string;
            title?: string | null;
            artist?: string | null;
            artworkUrl?: string | null;
            queue?: {
              id: string | number;
              streamUrl: string;
              title?: string | null;
              username?: string | null;
              artworkUrl?: string | null;
              permalinkUrl?: string;
              durationMs?: number;
            }[];
            queueIndex?: number;
          },
        ];
        this.send({
          event: 'audioTrackChange',
          roomId: data.roomId,
          trackUrl: data.trackUrl,
          title: data.title,
          artist: data.artist,
          artworkUrl: data.artworkUrl,
          queue: data.queue?.map((t) => ({
            id: t.id,
            streamUrl: t.streamUrl,
            title: t.title,
            username: t.username,
            artworkUrl: t.artworkUrl,
            permalinkUrl: t.permalinkUrl,
            durationMs: t.durationMs,
          })),
          queueIndex: data.queueIndex,
        });
        break;
      }
      case 'video:change': {
        const [data] = args as [
          {
            roomId: string;
            videoId: string;
            youtubeUrl?: string | null;
            title?: string | null;
            channelTitle?: string | null;
            thumbnailUrl?: string | null;
          },
        ];
        this.send({
          event: 'videoChange',
          roomId: data.roomId,
          videoId: data.videoId,
          youtubeUrl: data.youtubeUrl,
          title: data.title,
          channelTitle: data.channelTitle,
          thumbnailUrl: data.thumbnailUrl,
        });
        break;
      }
      case 'belet:change': {
        const [data] = args as [
          {
            roomId: string;
            beletUrl: string;
            title?: string | null;
          },
        ];
        this.send({
          event: 'beletChange',
          roomId: data.roomId,
          beletUrl: data.beletUrl,
          title: data.title,
        });
        break;
      }
    }
  }
}

export const socketService = new SocketService();
