'use client';

import { motion } from 'framer-motion';
import * as Icons from 'react-feather';
import { User } from '@/types';

interface UserListProps {
  users: User[];
  hostId: string;
}

export default function UserList({ users, hostId }: UserListProps) {
  const getColorFromName = (name: string) => {
    const colors = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-purple-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-cyan-500 to-blue-500',
      'from-indigo-500 to-purple-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-3">
      {users.map((user, index) => (
        <motion.div
          key={user.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
          className="group flex items-center justify-between p-3 rounded-2xl bg-white/80 hover:bg-white premium-shadow smooth-transition hover:scale-[1.02]"
        >
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
              className={`relative w-10 h-10 bg-gradient-to-br ${getColorFromName(user.username)} rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-lg`}
            >
              {user.username.charAt(0).toUpperCase()}
              {user.id === hostId && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Icons.Award className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.div>
            <div className="flex flex-col">
              <span className="text-gray-800 text-sm font-semibold">{user.username}</span>
              {user.id === hostId && (
                <span className="text-xs bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent font-bold">
                  Room Host
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/50 animate-pulse" />
            <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">Active</span>
          </div>
        </motion.div>
      ))}
      {users.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 px-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white premium-shadow"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Icons.Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          </motion.div>
          <div className="text-gray-600 text-sm font-medium">Waiting for users to join...</div>
          <div className="text-gray-400 text-xs mt-1">Share the room link to invite friends</div>
        </motion.div>
      )}
    </div>
  );
}