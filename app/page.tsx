'use client';

import { useState } from 'react';
import CreateRoom from '@/components/room/CreateRoom';
import JoinRoom from '@/components/room/JoinRoom';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12 pt-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            YouTube Together
          </h1>
          <p className="text-xl text-white/80">
            Watch YouTube videos in sync with friends
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="flex mb-6 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-2 px-4 rounded-md transition ${
                activeTab === 'create'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Create Room
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`flex-1 py-2 px-4 rounded-md transition ${
                activeTab === 'join'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Join Room
            </button>
          </div>

          {activeTab === 'create' ? <CreateRoom /> : <JoinRoom />}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold text-white mb-8">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-3xl mb-4">🎬</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Create or Join
              </h3>
              <p className="text-white/70 text-sm">
                Start a new room or join an existing one with a room code
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-3xl mb-4">🔗</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Add Videos
              </h3>
              <p className="text-white/70 text-sm">
                Paste YouTube URLs to watch together in perfect sync
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Chat & Watch
              </h3>
              <p className="text-white/70 text-sm">
                Chat with friends while watching videos synchronized
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}