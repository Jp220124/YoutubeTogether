'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { initSocket, getSocket, disconnectSocket } from '@/lib/socket/socket';
import { useStore } from '@/lib/store/useStore';
import YouTubePlayer from '@/components/player/YouTubePlayer';
import Chat from '@/components/chat/Chat';
import VideoControls from '@/components/room/VideoControls';
import UserList from '@/components/room/UserList';
import { Room as RoomType, VideoState } from '@/types';

export default function Room() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const username = searchParams.get('username') || 'Anonymous';
  const initialVideoId = searchParams.get('videoId');

  const {
    currentUser,
    currentRoom,
    setCurrentUser,
    setCurrentRoom,
    updateVideoState,
    addUser,
    removeUser,
    setHost,
    addMessage,
    clearMessages,
  } = useStore();

  const [isConnected, setIsConnected] = useState(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    const socket = initSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, username });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room-state', ({ roomData }: { roomData: RoomType }) => {
      setCurrentRoom(roomData);
      const user = roomData.users.find(u => u.id === socket.id);
      if (user) {
        setCurrentUser(user);

        // If initial video ID provided and user is host, set it
        if (initialVideoId && user.isHost && !roomData.videoState.videoId) {
          setTimeout(() => {
            socket.emit('change-video', { roomId, videoId: initialVideoId });
          }, 500);
        }
      }
    });

    socket.on('user-joined', ({ user }) => {
      addUser(user);
      addMessage({
        id: Date.now().toString(),
        userId: 'system',
        username: 'System',
        message: `${user.username} joined the room`,
        timestamp: Date.now(),
      });
    });

    socket.on('user-left', (userId) => {
      const user = currentRoom?.users.find(u => u.id === userId);
      if (user) {
        addMessage({
          id: Date.now().toString(),
          userId: 'system',
          username: 'System',
          message: `${user.username} left the room`,
          timestamp: Date.now(),
        });
      }
      removeUser(userId);
    });

    socket.on('host-changed', (newHostId) => {
      setHost(newHostId);
      addMessage({
        id: Date.now().toString(),
        userId: 'system',
        username: 'System',
        message: 'Host has changed',
        timestamp: Date.now(),
      });
    });

    socket.on('sync-video', (videoState: VideoState) => {
      updateVideoState(videoState);
    });

    socket.on('new-message', (message) => {
      addMessage(message);
    });

    socket.on('video-changed', (videoId: string) => {
      updateVideoState({ videoId });
    });

    return () => {
      clearMessages();
      setCurrentRoom(null);
      setCurrentUser(null);
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, username]);

  const handleVideoStateChange = (state: Partial<VideoState>) => {
    if (!currentUser?.isHost) return;
    const socket = getSocket();
    socket.emit('video-state-change', { roomId, state });
    updateVideoState(state);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!isConnected || !currentRoom) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Connecting...</h2>
          <p className="text-gray-400">Joining room {roomId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <div className="flex-1 flex flex-col">
        <header className="bg-gray-800 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">YouTube Together</h1>
              <p className="text-sm text-gray-400">Room: {roomId}</p>
            </div>
            <div className="flex items-center gap-4">
              {currentUser?.isHost ? (
                <span className="text-sm text-yellow-400 font-semibold bg-yellow-400/20 px-3 py-1 rounded-full">
                  👑 You are the Host
                </span>
              ) : (
                <span className="text-sm text-gray-400">
                  👤 Viewer Mode
                </span>
              )}
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {currentRoom.videoState.videoId ? (
              <YouTubePlayer
                roomId={roomId}
                isHost={currentUser?.isHost || false}
                videoState={currentRoom.videoState}
                onVideoStateChange={handleVideoStateChange}
              />
            ) : (
              <div className="bg-gray-800 rounded-lg p-12 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <p className="text-lg mb-2">No video selected</p>
                  {currentUser?.isHost && (
                    <p className="text-sm">Add a YouTube URL below to start watching</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {currentUser?.isHost && (
          <VideoControls roomId={roomId} />
        )}
      </div>

      <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
        <UserList users={currentRoom.users} hostId={currentRoom.host} />
        <Chat roomId={roomId} />
      </div>
    </div>
  );
}