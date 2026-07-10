import { socketService } from '@/shared/api/socket.service';

export function changeRoomVideo(
  roomId: string,
  video: {
    videoId: string;
    youtubeUrl?: string;
    title?: string;
    channelTitle?: string;
    thumbnailUrl?: string;
  },
) {
  socketService.emit('video:change', {
    roomId,
    videoId: video.videoId,
    youtubeUrl: video.youtubeUrl,
    title: video.title,
    channelTitle: video.channelTitle,
    thumbnailUrl: video.thumbnailUrl,
  });
}
