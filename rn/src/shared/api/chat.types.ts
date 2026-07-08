export interface ChatMessage {
  room: string;
  text: string;
  author: string;
  time: number;
  trackUrl?: string;
  imageUrl?: string;
}
