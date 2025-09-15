'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'react-feather';
import { getSocket } from '@/lib/socket/socket';
import { useStore } from '@/lib/store/useStore';

interface ChatProps {
  roomId: string;
}

export default function Chat({ roomId }: ChatProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, currentUser } = useStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const socket = getSocket();
    socket.emit('send-message', { roomId, message });
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl sm:rounded-2xl overflow-hidden premium-shadow-lg">
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-2 sm:space-y-3 bg-gradient-to-b from-gray-50/50 to-white max-h-[40vh] lg:max-h-full">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className={`${
                msg.userId === 'system'
                  ? 'text-center'
                  : msg.userId === currentUser?.id
                  ? 'text-right'
                  : 'text-left'
              }`}
            >
              {msg.userId === 'system' ? (
                <div className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full shadow-sm">
                  <div className="text-xs text-gray-600 font-medium italic flex items-center gap-1">
                    <Icons.Info className="w-3 h-3 hidden sm:inline" />
                    <span>{msg.message}</span>
                  </div>
                </div>
              ) : (
                <div
                  className={`inline-block max-w-[85%] sm:max-w-[80%] ${
                    msg.userId === currentUser?.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-white premium-shadow text-gray-800'
                  } rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3 smooth-transition hover:scale-[1.02]`}
                >
                  <div className="text-xs font-bold mb-0.5 sm:mb-1 opacity-90">
                    {msg.username}
                  </div>
                  <div className="text-xs sm:text-sm break-words leading-relaxed">{msg.message}</div>
                  <div className="text-xs opacity-70 mt-1 sm:mt-2 flex items-center gap-1">
                    <Icons.Clock className="w-3 h-3 hidden sm:inline" />
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Icons.MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            </motion.div>
            <div className="text-gray-600 text-sm font-medium">No messages yet</div>
            <div className="text-gray-400 text-xs mt-1">Be the first to start the conversation!</div>
          </motion.div>
        )}
      </div>

      <div className="p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100">
        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-white premium-shadow rounded-full text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all text-xs sm:text-sm font-medium"
            />
            <motion.div
              initial={false}
              animate={{ scale: message ? 1 : 0 }}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <Icons.Smile className="w-4 h-4 text-gray-400" />
            </motion.div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition-all premium-shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold text-sm"
          >
            <Icons.Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Send</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}