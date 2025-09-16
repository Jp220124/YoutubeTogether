'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'react-feather';
import { initSocket, getSocket, disconnectSocket } from '@/lib/socket/socket';
import { useStore } from '@/lib/store/useStore';
import YouTubePlayer from '@/components/player/YouTubePlayerSimple';
import Chat from '@/components/chat/Chat';
import VideoControls from '@/components/room/VideoControls';
import UserList from '@/components/room/UserList';
import ShareModal from '@/components/room/ShareModal';
import { Room as RoomType, VideoState } from '@/types';

export default function Room() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showCopied, setShowCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile

  useEffect(() => {
    const socket = initSocket();

    // Generate or retrieve session ID for host persistence
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('sessionId', sessionId);
    }

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, username, sessionId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room-state', ({ roomData }: { roomData: RoomType }) => {
      setCurrentRoom(roomData);
      const user = roomData.users.find(u => u.id === socket.id);
      if (user) {
        setCurrentUser(user);
      }

      if (initialVideoId && user?.isHost && !roomData.videoState.videoId) {
        setTimeout(() => {
          socket.emit('change-video', { roomId, videoId: initialVideoId });
        }, 100);
      }
    });

    socket.on('user-joined', ({ user }) => {
      addUser(user);
    });

    socket.on('user-left', (userId: string) => {
      removeUser(userId);
    });

    socket.on('host-changed', (newHostId: string) => {
      setHost(newHostId);
      // Update current user's host status if they are the new host
      if (socket.id === newHostId && currentUser) {
        setCurrentUser({ ...currentUser, isHost: true });
      } else if (currentUser) {
        setCurrentUser({ ...currentUser, isHost: false });
      }
    });

    socket.on('play', () => {
      updateVideoState({ isPlaying: true });
    });

    socket.on('pause', () => {
      updateVideoState({ isPlaying: false });
    });

    socket.on('seek', (time: number) => {
      updateVideoState({ currentTime: time });
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const copyRoomLink = () => {
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-10 shadow-2xl text-center max-w-md"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icons.AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-gray-800">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-8 text-lg">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition shadow-lg font-semibold"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  if (!isConnected || !currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-6"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icons.Wifi className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-3 text-gray-800">Connecting to Room</h2>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
            <span className="text-gray-600">Room Code:</span>
            <span className="font-mono font-bold text-purple-600 text-lg">{roomId}</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        body {
          font-family: 'Inter', sans-serif;
        }

        .premium-shadow {
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.15);
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .gradient-border {
          position: relative;
          background: linear-gradient(white, white) padding-box,
                      linear-gradient(135deg, #667eea 0%, #764ba2 100%) border-box;
          border: 2px solid transparent;
        }
      `}</style>

      {/* Premium Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="glass-effect border-b border-white/50 sticky top-0 z-50 premium-shadow"
      >
        <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
              <button
                onClick={() => router.push('/')}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
              >
                <Icons.ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-gray-900" />
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl shadow-lg">
                  <Icons.Youtube className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    WatchTube
                  </span>
                  <p className="text-xs text-gray-500">Premium Experience</p>
                </div>
              </div>

              <div className="hidden lg:block h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl flex-1 sm:flex-initial">
                  <Icons.Hash className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                  <span className="hidden sm:inline text-sm text-gray-600 font-medium">Room</span>
                  <span className="font-mono font-bold text-purple-700 text-sm sm:text-lg tracking-wide bg-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg shadow-sm">
                    {roomId}
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShareModal(true)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1 sm:gap-2 premium-shadow hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  <Icons.Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Share</span>
                </motion.button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              {currentUser?.isHost ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl sm:rounded-2xl shadow-lg"
                >
                  <div className="p-1 sm:p-1.5 bg-white/20 rounded-lg">
                    <Icons.Award className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-sm sm:text-base font-semibold">Host</span>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-white/80 backdrop-blur text-gray-700 rounded-xl sm:rounded-2xl shadow-md border border-gray-200">
                  <Icons.User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-sm sm:text-base font-medium">Viewer</span>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl shadow-md">
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm font-medium text-gray-700">{isConnected ? 'Connected' : 'Reconnecting...'}</span>
              </div>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 sm:p-2.5 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 lg:hidden"
              >
                {sidebarOpen ? <Icons.X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" /> : <Icons.MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] sm:h-[calc(100vh-88px)] relative">
        {/* Video Section with Premium Styling */}
        <div className="flex-1 flex flex-col p-3 sm:p-6 lg:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 max-w-7xl mx-auto w-full"
          >
            {currentRoom.videoState.videoId ? (
              <div className="w-full max-w-6xl mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-4">
                  <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                    <div className="absolute inset-0">
                      <YouTubePlayer
                        videoId={currentRoom.videoState.videoId}
                        roomId={roomId}
                        isHost={currentUser?.isHost || false}
                        videoState={currentRoom.videoState}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-12 flex items-center justify-center border-2 border-dashed border-purple-200 shadow-xl">
                <div className="text-center max-w-md">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl"
                  >
                    <Icons.PlayCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                  </motion.div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">Ready to Watch?</h3>
                  <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
                    {currentUser?.isHost
                      ? "Add a YouTube URL below to start your watch party"
                      : "Waiting for the host to start the show"}
                  </p>
                  {!currentUser?.isHost && (
                    <div className="inline-flex items-center gap-3 px-5 py-3 bg-purple-50 rounded-2xl">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Icons.Clock className="w-5 h-5 text-purple-600" />
                      </motion.div>
                      <span className="text-purple-700 font-medium">Host will start soon...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Premium Video Controls */}
          {currentUser?.isHost && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <div className="max-w-7xl mx-auto">
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-gray-100">
                  <VideoControls roomId={roomId} />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Premium Sidebar - Mobile Overlay / Desktop Fixed */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col border-l border-gray-100 lg:hidden"
            >
              {/* Mobile Close Button */}
              <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Chat & Participants</h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icons.X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              {/* Users Section */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                      <Icons.Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Participants</h3>
                      <p className="text-sm text-gray-500">{currentRoom.users.length} online</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    Active
                  </span>
                </div>
                <UserList users={currentRoom.users} hostId={currentRoom.host} />
              </div>

              {/* Chat Section */}
              <div className="flex-1 flex flex-col p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                    <Icons.MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Live Chat</h3>
                    <p className="text-sm text-gray-500">Share your thoughts</p>
                  </div>
                </div>
                <Chat roomId={roomId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar - Always visible on large screens */}
        <div className="hidden lg:flex lg:w-96 bg-white/95 backdrop-blur-xl shadow-2xl flex-col border-l border-gray-100">
          {/* Users Section */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                  <Icons.Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Participants</h3>
                  <p className="text-sm text-gray-500">{currentRoom.users.length} online</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                Active
              </span>
            </div>
            <UserList users={currentRoom.users} hostId={currentRoom.host} />
          </div>

          {/* Chat Section */}
          <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Icons.MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Live Chat</h3>
                <p className="text-sm text-gray-500">Share your thoughts</p>
              </div>
            </div>
            <Chat roomId={roomId} />
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        roomId={roomId}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}