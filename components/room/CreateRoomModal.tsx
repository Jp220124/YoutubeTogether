'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { motion } from 'framer-motion';
import * as Icons from 'react-feather';

interface CreateRoomModalProps {
  onClose: () => void;
}

export default function CreateRoomModal({ onClose }: CreateRoomModalProps) {
  const [username, setUsername] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const extractVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      alert('Please enter your name');
      return;
    }

    setIsCreating(true);
    const roomId = nanoid(8);
    const videoId = videoUrl ? extractVideoId(videoUrl) : null;

    localStorage.setItem('username', username);

    const params = new URLSearchParams({
      username,
      ...(videoId && { videoId })
    });

    router.push(`/room/${roomId}?${params.toString()}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 500 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition"
        >
          <Icons.X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icons.Plus className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Create a Room</h2>
          <p className="text-gray-600">Start watching YouTube videos with friends</p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Your Name
            </label>
            <div className="relative">
              <Icons.User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              YouTube URL (Optional)
            </label>
            <div className="relative">
              <Icons.Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:bg-white transition"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Add a video now or paste one later in the room</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Icons.Loader className="w-5 h-5" />
                </motion.div>
                Creating Room...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Icons.Video className="w-5 h-5" />
                Create Room
              </span>
            )}
          </motion.button>
        </div>

        {/* Features */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Icons.Users className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Unlimited Users</p>
            </div>
            <div>
              <Icons.Lock className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Private & Secure</p>
            </div>
            <div>
              <Icons.Zap className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Real-time Sync</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}