'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';

export default function CreateRoom() {
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

    // Store username in localStorage
    localStorage.setItem('username', username);

    // Navigate to room with params
    const params = new URLSearchParams({
      username,
      ...(videoId && { videoId })
    });

    router.push(`/room/${roomId}?${params.toString()}`);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
      <div className="space-y-4">
        <div>
          <label className="block text-white/90 text-sm font-medium mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition"
          />
        </div>

        <div>
          <label className="block text-white/90 text-sm font-medium mb-2">
            YouTube URL (Optional)
          </label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition"
          />
        </div>

        <button
          onClick={handleCreateRoom}
          disabled={isCreating}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Creating Room...' : 'Create Room'}
        </button>
      </div>
    </div>
  );
}