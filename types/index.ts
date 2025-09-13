export interface User {
  id: string;
  username: string;
  isHost: boolean;
}

export interface VideoState {
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  lastUpdate: number;
}

export interface Room {
  id: string;
  host: string;
  users: User[];
  videoState: VideoState;
  queue: QueueItem[];
}

export interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  duration: number;
  addedBy: string;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface SocketEvents {
  'join-room': { roomId: string; username: string };
  'video-state-change': { roomId: string; state: Partial<VideoState> };
  'play-video': { roomId: string };
  'pause-video': { roomId: string };
  'seek-video': { roomId: string; time: number };
  'change-video': { roomId: string; videoId: string };
  'send-message': { roomId: string; message: string };
  'room-state': { roomData: Room };
  'user-joined': { user: User };
  'user-left': string;
  'sync-video': VideoState;
  'play': void;
  'pause': void;
  'seek': number;
  'video-changed': string;
  'new-message': Message;
  'host-changed': string;
}