'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import * as Icons from 'react-feather';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const [username, setUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // Check if user has a saved username
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleJoin = () => {
    if (!username.trim()) {
      return;
    }

    setIsJoining(true);
    localStorage.setItem('username', username);
    router.push(`/room/${roomId}?username=${encodeURIComponent(username)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-white flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-4000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 bg-white rounded-3xl p-8 max-w-md w-full premium-shadow-lg"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl"
          >
            <Icons.Youtube className="w-12 h-12 text-white" />
          </motion.div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">Join Watch Party</h1>
          <p className="text-gray-600">You&apos;ve been invited to room</p>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl"
          >
            <Icons.Hash className="w-5 h-5 text-purple-600" />
            <span className="font-mono font-bold text-xl text-purple-700">{roomId}</span>
          </motion.div>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <div className="relative">
              <Icons.User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Enter your name to join..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all font-medium"
                autoFocus
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">This is how others will see you in the room</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleJoin}
            disabled={!username.trim() || isJoining}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed premium-shadow-lg flex items-center justify-center gap-3"
          >
            {isJoining ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Icons.Loader className="w-5 h-5" />
                </motion.div>
                <span>Joining Room...</span>
              </>
            ) : (
              <>
                <Icons.LogIn className="w-5 h-5" />
                <span>Join Now</span>
              </>
            )}
          </motion.button>

          <button
            onClick={() => router.push('/')}
            className="w-full py-3 text-gray-600 font-medium hover:text-gray-800 transition-all"
          >
            Back to Home
          </button>
        </div>

        {/* Features */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Icons.Zap className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Instant Sync</p>
            </div>
            <div>
              <Icons.Shield className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Secure</p>
            </div>
            <div>
              <Icons.Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">No Sign-up</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}