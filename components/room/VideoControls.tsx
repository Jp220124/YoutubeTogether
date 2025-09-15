'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'react-feather';
import { getSocket } from '@/lib/socket/socket';

interface VideoControlsProps {
  roomId: string;
}

export default function VideoControls({ roomId }: VideoControlsProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const extractVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleChangeVideo = () => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    const socket = getSocket();
    socket.emit('change-video', { roomId, videoId });
    setVideoUrl('');
    setIsLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl premium-shadow-lg"
      >
        <div className="flex gap-3">
          <div className="flex-1 relative group">
            <motion.div
              animate={{ rotate: isLoading ? 360 : 0 }}
              transition={{ duration: 2, repeat: isLoading ? Infinity : 0, ease: "linear" }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2"
            >
              <Icons.Youtube className="text-red-500 w-6 h-6" />
            </motion.div>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChangeVideo()}
              placeholder="Paste YouTube URL here..."
              className="w-full pl-14 pr-4 py-4 bg-white premium-shadow rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all text-sm font-medium"
              disabled={isLoading}
            />
            <motion.div
              initial={false}
              animate={{ opacity: videoUrl ? 1 : 0, scale: videoUrl ? 1 : 0.8 }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <Icons.Link className="w-4 h-4 text-green-500" />
            </motion.div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleChangeVideo}
            disabled={isLoading || !videoUrl}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed premium-shadow-lg flex items-center gap-3 group"
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Icons.Loader className="w-5 h-5" />
                </motion.div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Icons.Play className="w-5 h-5" />
                </motion.div>
                <span>Play Video</span>
              </>
            )}
          </motion.button>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-600 flex items-center gap-2 font-medium">
            <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full animate-pulse" />
            <span>You have host controls</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Icons.Shield className="w-3 h-3" />
              Secure
            </span>
            <span className="flex items-center gap-1">
              <Icons.Zap className="w-3 h-3" />
              Instant sync
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}