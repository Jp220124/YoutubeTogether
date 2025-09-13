'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinRoom() {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  const handleJoinRoom = async () => {
    if (!username.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!roomId.trim()) {
      alert('Please enter a room code');
      return;
    }

    setIsJoining(true);

    // Store username in localStorage
    localStorage.setItem('username', username);

    // Navigate to room
    const params = new URLSearchParams({ username });
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
            Room Code
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room code"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition uppercase"
            maxLength={8}
          />
        </div>

        <button
          onClick={handleJoinRoom}
          disabled={isJoining}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isJoining ? 'Joining Room...' : 'Join Room'}
        </button>
      </div>
    </div>
  );
}