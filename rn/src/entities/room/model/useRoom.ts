import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { roomAPI } from '@/shared/api/room.api';
import { socketService } from '@/shared/api/socket.service';
import type { VideoRoom } from '@/shared/api/room.types';

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<VideoRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState(0);
  const [loadedAt, setLoadedAt] = useState(0);

  const onUserJoined = useCallback(
    (data: { roomId: string; participants: number }) => {
      if (data.roomId !== roomId) return;
      setParticipants(data.participants);
    },
    [roomId],
  );

  const onUserLeft = useCallback(
    (data: { roomId: string; participants: number }) => {
      if (data.roomId !== roomId) return;
      setParticipants(data.participants);
    },
    [roomId],
  );

  const onRoomError = useCallback((err: { message: string }) => {
    Alert.alert('Room error', err.message || 'Room error');
  }, []);

  const bindSocketListeners = useCallback(() => {
    socketService.on('room:user_joined', onUserJoined);
    socketService.on('room:user_left', onUserLeft);
    socketService.on('room:error', onRoomError);
  }, [onUserJoined, onUserLeft, onRoomError]);

  const unbindSocketListeners = useCallback(() => {
    socketService.off('room:user_joined', onUserJoined);
    socketService.off('room:user_left', onUserLeft);
    socketService.off('room:error', onRoomError);
  }, [onUserJoined, onUserLeft, onRoomError]);

  const load = useCallback(async () => {
    const data = await roomAPI.getRoom(roomId);
    setRoom(data);
    setParticipants(data.participants);
    setLoadedAt(Date.now());
    setLoading(false);
  }, [roomId]);

  const join = useCallback(() => {
    socketService.connect();
    bindSocketListeners();
    socketService.emit('room:join', roomId);
  }, [roomId, bindSocketListeners]);

  const leave = useCallback(() => {
    socketService.emit('room:leave', roomId);
    unbindSocketListeners();
  }, [roomId, unbindSocketListeners]);

  useEffect(() => () => unbindSocketListeners(), [unbindSocketListeners]);

  return {
    room,
    setRoom,
    loading,
    error,
    setError,
    participants,
    loadedAt,
    load,
    join,
    leave,
  };
}
