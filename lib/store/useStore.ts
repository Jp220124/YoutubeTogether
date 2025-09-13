import { create } from 'zustand';
import { User, Room, Message, VideoState } from '@/types';

interface AppStore {
  // User state
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Room state
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;
  updateVideoState: (state: Partial<VideoState>) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  setHost: (hostId: string) => void;

  // Messages
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;

  // UI state
  isChatOpen: boolean;
  toggleChat: () => void;
  isQueueOpen: boolean;
  toggleQueue: () => void;
}

export const useStore = create<AppStore>((set) => ({
  // User state
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Room state
  currentRoom: null,
  setCurrentRoom: (room) => set({ currentRoom: room }),
  updateVideoState: (state) =>
    set((prev) => ({
      currentRoom: prev.currentRoom
        ? {
            ...prev.currentRoom,
            videoState: { ...prev.currentRoom.videoState, ...state },
          }
        : null,
    })),
  addUser: (user) =>
    set((prev) => ({
      currentRoom: prev.currentRoom
        ? {
            ...prev.currentRoom,
            users: [...prev.currentRoom.users, user],
          }
        : null,
    })),
  removeUser: (userId) =>
    set((prev) => ({
      currentRoom: prev.currentRoom
        ? {
            ...prev.currentRoom,
            users: prev.currentRoom.users.filter((u) => u.id !== userId),
          }
        : null,
    })),
  setHost: (hostId) =>
    set((prev) => ({
      currentRoom: prev.currentRoom
        ? {
            ...prev.currentRoom,
            host: hostId,
            users: prev.currentRoom.users.map((u) => ({
              ...u,
              isHost: u.id === hostId,
            })),
          }
        : null,
    })),

  // Messages
  messages: [],
  addMessage: (message) =>
    set((prev) => ({ messages: [...prev.messages, message] })),
  clearMessages: () => set({ messages: [] }),

  // UI state
  isChatOpen: true,
  toggleChat: () => set((prev) => ({ isChatOpen: !prev.isChatOpen })),
  isQueueOpen: false,
  toggleQueue: () => set((prev) => ({ isQueueOpen: !prev.isQueueOpen })),
}));