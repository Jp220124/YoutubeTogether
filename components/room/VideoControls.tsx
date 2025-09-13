'use client';

import { useState } from 'react';
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
    <div className="p-4 bg-gray-800 border-t border-gray-700">
      <div className="max-w-6xl mx-auto">
        <div className="flex gap-2">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Enter YouTube URL..."
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            onClick={handleChangeVideo}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Play Video'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Only the host can control the video playback
        </p>
      </div>
    </div>
  );
}