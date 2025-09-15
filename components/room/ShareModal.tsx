'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'react-feather';

interface ShareModalProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ roomId, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const roomUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${roomId}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const text = `Join my WatchTube party! 🎬\n\nRoom Code: ${roomId}\nClick to join: ${roomUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = 'Join my WatchTube Party!';
    const body = `Hey!\n\nI'm hosting a watch party on WatchTube. Join me to watch YouTube videos together!\n\nRoom Code: ${roomId}\nJoin Link: ${roomUrl}\n\nSee you there!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareViaTwitter = () => {
    const text = `Join my WatchTube party! 🎬 Room: ${roomId}\n${roomUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full premium-shadow-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Share Room</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <Icons.X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Room Code Display */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl text-center">
                <p className="text-sm text-gray-600 mb-2">Room Code</p>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-purple-700 tracking-wider">
                  {roomId}
                </div>
              </div>

              {/* Copy Link */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                <p className="text-xs text-gray-600 mb-2 font-medium">Share Link</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={roomUrl}
                    readOnly
                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-700 font-mono"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={copyLink}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium text-xs sm:text-sm premium-shadow flex items-center gap-1 sm:gap-2"
                  >
                    {copied ? (
                      <>
                        <Icons.Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Icons.Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Copy
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Share Options */}
              <div>
                <p className="text-sm text-gray-600 mb-3 font-medium">Share via</p>
                <div className="grid grid-cols-3 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={shareViaWhatsApp}
                    className="p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg sm:rounded-xl transition-all group"
                  >
                    <Icons.MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mx-auto mb-1 sm:mb-2" />
                    <p className="text-xs text-gray-700 font-medium">WhatsApp</p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={shareViaEmail}
                    className="p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg sm:rounded-xl transition-all group"
                  >
                    <Icons.Mail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mx-auto mb-1 sm:mb-2" />
                    <p className="text-xs text-gray-700 font-medium">Email</p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={shareViaTwitter}
                    className="p-3 sm:p-4 bg-sky-50 hover:bg-sky-100 rounded-lg sm:rounded-xl transition-all group"
                  >
                    <Icons.Twitter className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600 mx-auto mb-1 sm:mb-2" />
                    <p className="text-xs text-gray-700 font-medium">Twitter</p>
                  </motion.button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-amber-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                <div className="flex gap-3">
                  <Icons.Info className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-900 font-medium mb-1">How to join</p>
                    <p className="text-xs text-amber-700">
                      Share the link or room code with your friends. They can join instantly without any sign-up!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}