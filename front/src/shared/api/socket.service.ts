import { SOCKET_URL } from "../config/api";
import type { VideoState } from "./room.types";
import type { ChatMessage } from "./chat.types";

// Исходящие события — публичный контракт для остального кода фронта
export interface SocketEmitEvents {
  "room:join": (roomId: string) => void;
  "room:leave": (roomId: string) => void;
  "video:play": (data: { roomId: string; currentTime?: number }) => void;
  "video:pause": (data: { roomId: string; currentTime?: number }) => void;
  "video:seek": (data: { roomId: string; currentTime: number }) => void;
  "video:sync_request": (roomId: string) => void;
  "chat:send": (msg: ChatMessage) => void;
  "audio:track_change": (data: {
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
  "video:change": (data: {
    roomId: string;
    videoId: string;
    youtubeUrl?: string | null;
    title?: string | null;
    channelTitle?: string | null;
    thumbnailUrl?: string | null;
  }) => void;
}

// Входящие события — совместимы с тем, что раньше приходило от Socket.IO
export interface SocketOnEvents {
  "video:state": (state: VideoState) => void;
  "video:play": (data: { currentTime: number; timestamp: number }) => void;
  "video:pause": (data: { currentTime: number; timestamp: number }) => void;
  "video:seek": (data: { currentTime: number; timestamp: number }) => void;
  "video:sync": (state: VideoState) => void;
  "room:user_joined": (data: { roomId: string; participants: number }) => void;
  "room:user_left": (data: { roomId: string; participants: number }) => void;
  "room:error": (error: { message: string }) => void;
  "chat:message": (msg: ChatMessage) => void;
  "audio:track_change": (data: {
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
  "video:change": (data: {
    videoId: string;
    youtubeUrl?: string;
    title?: string;
    channelTitle?: string;
    thumbnailUrl?: string;
  }) => void;
}

export type SocketEvents = SocketEmitEvents & SocketOnEvents;

type Listener<K extends keyof SocketOnEvents> = SocketOnEvents[K];

class SocketService {
  private ws: WebSocket | null = null;
  private listeners = new Map<keyof SocketOnEvents, Set<Function>>();
  private pendingQueue: string[] = [];

  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.pendingQueue.length > 0) {
      this.ws.send(this.pendingQueue.shift()!);
    }
  }

  private setupWebSocket() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.ws = new WebSocket(SOCKET_URL);

    this.ws.onopen = () => {
      console.log("WebSocket connected:", SOCKET_URL);
      this.flushQueue();
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.ws = null;
    };

    this.ws.onerror = () => {
      console.error("WebSocket error:", SOCKET_URL);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventName: keyof SocketOnEvents | undefined = data.event;
        if (!eventName) return;

        // Совместимость: если есть payload — передаём его, иначе всё тело без поля event
        let payload: any;
        if ("payload" in data) {
          payload = data.payload;
        } else {
          const { event: _e, ...rest } = data;
          payload = rest;
        }

        const handlers = this.listeners.get(eventName);
        if (handlers) {
          handlers.forEach((cb) => {
            try {
              (cb as any)(payload);
            } catch (e) {
              console.error("WS handler error for", eventName, e);
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };
  }

  connect(): WebSocket {
    this.setupWebSocket();
    return this.ws as WebSocket;
  }

  disconnect(): void {
    this.pendingQueue = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getSocket(): WebSocket | null {
    return this.ws;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  on<K extends keyof SocketOnEvents>(event: K, callback: Listener<K>): void {
    const set = this.listeners.get(event) ?? new Set<Function>();
    set.add(callback as any);
    this.listeners.set(event, set);
  }

  off<K extends keyof SocketOnEvents>(event: K, callback?: Listener<K>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    if (callback) {
      set.delete(callback as any);
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

    // CLOSING / CLOSED — переподключаемся и ставим в очередь
    this.ws = null;
    this.connect();
    this.pendingQueue.push(payload);
  }

  emit<K extends keyof SocketEmitEvents>(
    event: K,
    ...args: Parameters<SocketEmitEvents[K]>
  ): void {
    switch (event) {
      case "room:join": {
        const [roomId] = args as [string];
        this.send({ event: "roomJoin", roomId });
        break;
      }
      case "room:leave": {
        const [roomId] = args as [string];
        this.send({ event: "roomLeave", roomId });
        break;
      }
      case "video:play": {
        const [data] = args as [{ roomId: string; currentTime?: number }];
        this.send({
          event: "videoPlay",
          roomId: data.roomId,
          currentTime: data.currentTime,
        });
        break;
      }
      case "video:pause": {
        const [data] = args as [{ roomId: string; currentTime?: number }];
        this.send({
          event: "videoPause",
          roomId: data.roomId,
          currentTime: data.currentTime,
        });
        break;
      }
      case "video:seek": {
        const [data] = args as [{ roomId: string; currentTime: number }];
        this.send({
          event: "videoSeek",
          roomId: data.roomId,
          currentTime: data.currentTime,
        });
        break;
      }
      case "video:sync_request": {
        const [roomId] = args as [string];
        this.send({ event: "videoSyncRequest", roomId });
        break;
      }
      case "chat:send": {
        const [msg] = args as [ChatMessage];
        this.send({
          event: "chatSend",
          room: msg.room,
          text: msg.text,
          author: msg.author,
          time: msg.time,
          trackUrl: msg.trackUrl,
          imageUrl: msg.imageUrl,
        });
        break;
      }
      case "audio:track_change": {
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
          event: "audioTrackChange",
          roomId: data.roomId,
          trackUrl: data.trackUrl,
          title: data.title,
          artist: data.artist,
          artworkUrl: data.artworkUrl,
        });
        break;
      }
      case "video:change": {
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
          event: "videoChange",
          roomId: data.roomId,
          videoId: data.videoId,
          youtubeUrl: data.youtubeUrl,
          title: data.title,
          channelTitle: data.channelTitle,
          thumbnailUrl: data.thumbnailUrl,
        });
        break;
      }
    }
  }
}

export const socketService = new SocketService();
