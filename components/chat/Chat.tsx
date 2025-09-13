'use client';

import { useState, useRef, useEffect } from 'react';
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
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-white font-semibold">Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${
              msg.userId === 'system'
                ? 'text-center'
                : msg.userId === currentUser?.id
                ? 'text-right'
                : 'text-left'
            }`}
          >
            {msg.userId === 'system' ? (
              <p className="text-xs text-gray-500 italic">{msg.message}</p>
            ) : (
              <div
                className={`inline-block max-w-[80%] ${
                  msg.userId === currentUser?.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                } rounded-lg px-3 py-2`}
              >
                <p className="text-xs font-semibold mb-1 opacity-75">
                  {msg.username}
                </p>
                <p className="text-sm break-words">{msg.message}</p>
                <p className="text-xs opacity-50 mt-1">
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}